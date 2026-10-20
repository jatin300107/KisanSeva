import json
import re
import time
import uuid
from google import genai

LOG_FILE = "latency_log.jsonl"

# Verify these model strings against the docs. I am not sure of the exact name for 3.5 flash lite.
MODELS = ["gemini-3.5-flash-lite"]
THINKING_LEVELS = ["low"]          # no point paying for high just to ask a question
CONVERSATIONS_PER_MODEL = 5
DEBUG_EVENTS = True                # prints event types on the very first stream, then turns itself off

INSTRUCTION = (
    "You are a veterinary intake assistant talking to a farmer. "
    "Ask exactly ONE short follow-up question in simple spoken Hindi, "
    "maximum 15 words. No advice, no explanation, no greeting."
)

# One simulated session, each item is one farmer answer.
TURNS = [
    "मेरी भैंस खाना नहीं खा रही है और अजीब बर्ताव कर रही है",
    "हाँ गरम तो बहुत लग रही है",
    "नहीं बछड़ा तो नहीं दिया है",
    "दो दिन से ऐसा है",
]

SENTENCE_END = re.compile(r"[।?!\.\n]")

client = genai.Client()


def log(row):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def find_interaction_id(event):
    # I do not know which event carries the id. Try the likely places.
    for attr in ("interaction", "response"):
        obj = getattr(event, attr, None)
        if obj is not None and getattr(obj, "id", None):
            return obj.id
    return getattr(event, "interaction_id", None)


def stream_turn(model, level, user_text, prev_id, history):
    global DEBUG_EVENTS

    kwargs = {
        "model": model,
        "stream": True,
        "system_instruction": INSTRUCTION,   # verify the exact param name in the docs
        "generation_config": {"thinking_level": level},
    }
    if prev_id:
        kwargs["input"] = user_text
        kwargs["previous_interaction_id"] = prev_id
        state_mode = "server"
    elif history:
        # fallback if the interaction id could not be captured: resend the transcript
        kwargs["input"] = "\n".join(history) + "\nFarmer: " + user_text
        state_mode = "client"
    else:
        kwargs["input"] = "Farmer: " + user_text
        state_mode = "first"

    t_start = time.perf_counter()
    t_first_event = None
    t_first_text = None
    t_first_sentence = None
    first_sentence = None
    text = ""
    new_id = None

    stream = client.interactions.create(**kwargs)
    for event in stream:
        now = time.perf_counter()
        if t_first_event is None:
            t_first_event = now - t_start
        if DEBUG_EVENTS:
            print("  event_type:", getattr(event, "event_type", None))

        new_id = new_id or find_interaction_id(event)

        if getattr(event, "event_type", None) == "step.delta":
            delta = getattr(event, "delta", None)
            if delta is not None and getattr(delta, "type", None) == "text":
                chunk = delta.text or ""
                if chunk and t_first_text is None:
                    t_first_text = now - t_start
                text += chunk
                if t_first_sentence is None:
                    m = SENTENCE_END.search(text)
                    if m:
                        t_first_sentence = now - t_start
                        first_sentence = text[: m.end()].strip()

    t_total = time.perf_counter() - t_start
    DEBUG_EVENTS = False

    return {
        "state_mode": state_mode,
        "first_event_s": round(t_first_event, 3) if t_first_event else None,
        "first_text_s": round(t_first_text, 3) if t_first_text else None,
        "first_sentence_s": round(t_first_sentence, 3) if t_first_sentence else None,
        "total_s": round(t_total, 3),
        "output_chars": len(text),
        "first_sentence": first_sentence,
        "output_preview": text[:80],
    }, text, new_id


def run_conversation(model, level, convo_idx):
    convo_id = str(uuid.uuid4())[:8]
    prev_id = None
    history = []

    for turn_idx, user_text in enumerate(TURNS):
        row = {
            "script": "multi_turn_stream",
            "convo_id": convo_id,
            "convo_idx": convo_idx,
            "turn": turn_idx,
            "model": model,
            "thinking_level": level,
            "input_chars": len(user_text),
            "ts": time.time(),
        }
        try:
            metrics, text, new_id = stream_turn(model, level, user_text, prev_id, history)
            row.update(metrics)
            row["id_captured"] = new_id is not None
            row["error"] = None
            prev_id = new_id
            
            history.append("Farmer: " + user_text)
            history.append("Assistant: " + text)
        except Exception as e:
            row["error"] = str(e)[:200]
            log(row)
            print(f"{model} convo{convo_idx} turn{turn_idx}: ERROR {row['error']}")
            return

        log(row)
        print(
            f"{model} convo{convo_idx} turn{turn_idx}: "
            f"first_text={row['first_text_s']}s "
            f"first_sentence={row['first_sentence_s']}s "
            f"total={row['total_s']}s "
            f"state={row['state_mode']}"
        )


if __name__ == "__main__":
    for model in MODELS:
        for level in THINKING_LEVELS:
            for i in range(CONVERSATIONS_PER_MODEL):
                run_conversation(model, level, i)
