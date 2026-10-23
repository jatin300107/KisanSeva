# harness_a.py
import asyncio, json, time, os, sys, random
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from google import genai
from google.genai import types
from rules import build_rules
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent.parent / ".env")

MODE = sys.argv[1] if len(sys.argv) > 1 else "baseline"   # baseline | shadow | inject
TURN_TIME = float(os.getenv("TURN_TIME", "10"))             # seconds per farmer turn, real time
GEMINI_TIMEOUT = float(os.getenv("GEMINI_TIMEOUT", "35"))
INJECT_CAP = int(os.getenv("INJECT_CAP", "3"))
END_WAIT = 15.0
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
BANK_DATA = json.loads((BASE_DIR / "bank.json").read_text(encoding="utf-8"))
QUESTIONS = {q["slot"]: (q["id"], q["text"]) for q in BANK_DATA}

# ---------- logging ----------
T0 = time.monotonic()
LOG = open(BASE_DIR / f"log_{MODE}_{int(time.time())}.jsonl", "w", encoding="utf-8")
def log(event, **kw):
    LOG.write(json.dumps({"t": round(time.monotonic() - T0, 2), "event": event, **kw},
                         ensure_ascii=False) + "\n")
    LOG.flush()

# ---------- state (code owns it, Gemini only suggests) ----------
@dataclass
class Q:
    id: str
    slot: str
    type: str          # open | confirm | clarify
    text: str

@dataclass
class State:
    queue: deque = field(default_factory=deque)
    asked: list = field(default_factory=list)       # asked question records, in order
    times_asked: dict = field(default_factory=dict)
    answers: dict = field(default_factory=dict)     # slot -> {raw, value, turn, flags}
    version: int = 0
    turn: int = 0
    pending_transcripts: list = field(default_factory=list)  # since last Gemini call
    injected: int = 0

    def slots_asked_or_queued(self):
        return {q.slot for q in self.queue} | {a for a in self.answers}

    def set_answer(self, slot, raw, value, turn):
        old = self.answers.get(slot)
        if old and old["turn"] > turn:
            return False                              # never overwrite a newer answer
        flags = []
        if old and old["value"] != value:
            flags.append(f"differs_from_earlier:{old['value']}")
        self.answers[slot] = {"raw": raw, "value": value, "turn": turn, "flags": flags}
        self.version += 1
        return True

# ---------- Gemini (background, one in flight) ----------
client = genai.Client()   # reads GEMINI_API_KEY

async def gemini_call(snapshot: dict):
    delay = os.getenv("SIM_GEMINI_DELAY")
    if delay:
        minimum, maximum = (float(value.strip()) for value in delay.split(",", 1))
        await asyncio.sleep(random.uniform(minimum, maximum))
    cfg = types.GenerateContentConfig(
        system_instruction=build_rules(QUESTIONS),
        response_mime_type="application/json",
        temperature=0,
    )
    resp = await client.aio.models.generate_content(
        model=MODEL, contents=json.dumps(snapshot, ensure_ascii=False), config=cfg)
    return resp.text

async def timed_call(snapshot: dict):
    started = time.monotonic()
    out = await gemini_call(snapshot)
    return out, time.monotonic() - started

def make_snapshot(st: State, bank):
    return {
        "next_planned": [q.__dict__ for q in list(st.queue)[:3]],
        "asked": st.asked,
        "times_asked": st.times_asked,
        "answers": st.answers,
        "new_transcripts": st.pending_transcripts,
        "version": st.version,
    }

def validate(raw_text, st: State):
    """Returns (ok, data_or_reason). Code decides, not the prompt."""
    try:
        d = json.loads(raw_text)
        assert isinstance(d.get("extracted"), list)
        assert isinstance(d.get("followups"), list)
        for f in d["followups"]:
            assert {"slot", "text", "importance"} <= f.keys()
        return True, d
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"

def merge(st: State, d: dict):
    """Only called at a turn boundary. Returns counts for logging."""
    applied_extracts = 0
    for e in d["extracted"]:
        if st.set_answer(e["slot"], e.get("raw_text", ""), e["value"],
                         e.get("source_turn", st.turn)):
            applied_extracts += 1
    injected, dropped = [], []
    taken = st.slots_asked_or_queued()
    for f in sorted(d["followups"], key=lambda x: -x["importance"]):
        if st.injected + len(injected) >= INJECT_CAP:
            dropped.append((f["slot"], "cap")); continue
        if f["slot"] in taken:
            dropped.append((f["slot"], "slot_already_asked_or_queued")); continue
        injected.append(Q(id=f"inj{st.injected+len(injected)}", slot=f["slot"],
                          type=f.get("type", "clarify"), text=f["text"]))
        taken.add(f["slot"])
    for q in reversed(injected):          # insert at front, highest importance first
        st.queue.appendleft(q)
    st.injected += len(injected)
    return applied_extracts, injected, dropped

# ---------- farmer simulation (scripted for now) ----------
async def farmer_turn(q: Q, script: dict):
    turn_time = script.get("turn_time", {})
    dur = (turn_time.get("per_qid", {}).get(q.id)
           or turn_time.get("default")
           or TURN_TIME)
    await asyncio.sleep(dur)                          # real time, never speed this up
    a = script["answers"].get(q.id)
    if a is None:
        a = script.get("canned_followups", {}).get(q.slot)
    if a is None:
        a = {"text": "पता नहीं", "direct": None}
    return {"text": a["text"], "direct": a.get("direct")}

# ---------- main loop ----------
async def run(bank, script):
    st = State(queue=deque(bank))
    task, task_start_turn, task_start_t = None, None, None
    retry_pending = False

    def start_call():
        nonlocal task, task_start_turn, task_start_t
        snap = make_snapshot(st, bank)
        st.pending_transcripts = []
        task_start_turn, task_start_t = st.turn, time.monotonic()
        task = asyncio.create_task(asyncio.wait_for(timed_call(snap), GEMINI_TIMEOUT))
        log("gemini_start", turn=st.turn, version=st.version)

    def collect_if_done():
        nonlocal task
        if task is None or not task.done():
            return
        lag = st.turn - task_start_turn
        try:
            raw, api_latency = task.result()
        except asyncio.TimeoutError:
            log("gemini_result", outcome="timeout", lag_turns=lag)
            task = None; return
        except Exception as e:
            log("gemini_result", outcome="error", err=str(e)[:200], lag_turns=lag)
            task = None; return
        task = None
        ok, d = validate(raw, st)
        if not ok:
            log("gemini_result", outcome="failed_validation", reason=d,
                api_latency=round(api_latency, 2), lag_turns=lag)
            return
        if MODE == "shadow":
            log("gemini_result", outcome="shadow", api_latency=round(api_latency, 2),
                lag_turns=lag,
                extracted=d["extracted"], followups=d["followups"])
            return
        ext, inj, drp = merge(st, d)
        log("gemini_result", outcome="applied", api_latency=round(api_latency, 2),
            lag_turns=lag,
            extracted_applied=ext, injected=[q.__dict__ for q in inj], dropped=drp)

    while st.queue:
        collect_if_done()                              # turn boundary
        if MODE != "baseline" and task is None and st.pending_transcripts:
            start_call()
        log("turn_boundary", turn=st.turn, queue_len=len(st.queue),
            call_in_flight=task is not None)
        q = st.queue.popleft()
        st.asked.append({"id": q.id, "slot": q.slot, "text": q.text})
        st.times_asked[q.slot] = st.times_asked.get(q.slot, 0) + 1
        log("ask", turn=st.turn, qid=q.id, slot=q.slot, type=q.type, text=q.text)
        a = await farmer_turn(q, script)
        st.pending_transcripts.append({"turn": st.turn, "qid": q.id, "text": a["text"]})
        if a["direct"] is not None:
            st.set_answer(q.slot, a["text"], a["direct"], st.turn)
        log("answer", turn=st.turn, qid=q.id, text=a["text"])
        st.turn += 1

    # end of session: queue empty, call may still be pending
    if task is not None:
        log("dead_air_risk", reason="queue_empty_call_pending", turn=st.turn)
        deadline = time.monotonic() + END_WAIT
        while task and not task.done() and time.monotonic() < deadline:
            log("filler_question", turn=st.turn)
            await asyncio.sleep(min(TURN_TIME, max(0, deadline - time.monotonic())))
        collect_if_done()
        if task is not None:
            task.cancel(); log("end_wait_expired")
    log("session_end", turns=st.turn, answers=st.answers, injected=st.injected)
    return st

def score(st: State, gold: dict):
    res = {s: (st.answers.get(s, {}).get("value") == v) for s, v in gold.items()}
    log("score", per_slot=res, accuracy=round(sum(res.values()) / len(res), 3))

if __name__ == "__main__":
    bank = [Q(**q) for q in BANK_DATA]
    script_name = sys.argv[2] if len(sys.argv) > 2 else "script_clean.json"
    script_path = Path(script_name)
    if not script_path.is_absolute():
        script_path = BASE_DIR / script_path
    script = json.loads(script_path.read_text(encoding="utf-8"))
    bank_ids = {q.id for q in bank}
    bank_slots = {q.slot for q in bank}
    bad_ids = set(script["answers"]) - bank_ids
    bad_slots = set(script["gold"]) - bank_slots
    assert not bad_ids, f"script answers use unknown ids: {bad_ids}"
    assert not bad_slots, f"gold uses unknown slots: {bad_slots}"
    st = asyncio.run(run(bank, script))
    score(st, script["gold"])