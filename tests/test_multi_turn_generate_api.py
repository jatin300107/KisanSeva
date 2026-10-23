import asyncio
import json
import sys
import time
import uuid

from google import genai
from google.genai import types

LOG_FILE = "latency_log.jsonl"
MODEL = "gemini-3.5-flash-lite"
THINKING_LEVEL = sys.argv[1] if len(sys.argv) > 1 else "low"   # run once per level
MAX_CALLS = 15            # free tier budget per file run, counts every API call
CONVERSATIONS = 2         # a 4 turn conversation costs about 8 calls (2 per turn)
TIMEOUT_S = 35
GAP_S = 2                 # pause between API calls to stay under rate limits
api_time = 0.0
# One simulated session. Each item is one farmer turn.
TURNS = [
    "मेरी भैंस खाना नहीं खा रही है और अजीब बर्ताव कर रही है",
    "हाँ गरम तो बहुत लग रही है",
    "नहीं बछड़ा तो नहीं दिया है",
    "दो दिन से ऐसा है",
]

FIELDS = {
    "animal_type": "what type of animal",
    "age": "age with a number and a unit",
    "symptoms": "what is wrong with the animal",
    "onset": "when the symptoms started",
    "eating": "is it eating normally",
    "fever_signs": "does it seem to have a fever",
    "pregnant": "is it pregnant",
}

# Replace this with your full 14 rule agent prompt before trusting the numbers.
SYSTEM = (
    "You are an intake assistant for a livestock disease app. Collect the fields "
    "below from a farmer, one question at a time, in simple Hindi. After each farmer "
    "message, call submit_answers for the fields that message answered. Use "
    "still_missing from the result to pick the next question. Never diagnose.\n\n"
    "Fields:\n" + "\n".join(f"- {k}: {v}" for k, v in FIELDS.items())
)

SUBMIT_ANSWERS = types.FunctionDeclaration(
    name="submit_answers",
    description="Record the fields answered by the farmer's latest message.",
    parameters={
        "type": "object",
        "properties": {
            "answers": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "field": {"type": "string", "enum": list(FIELDS)},
                        "value": {"type": "string"},
                        "raw_text": {"type": "string"},
                    },
                    "required": ["field", "value", "raw_text"],
                },
            }
        },
        "required": ["answers"],
    },
)

client = genai.Client()   # reads GEMINI_API_KEY
RUN_ID = int(time.time())
calls_made = 0


def log(row):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def execute_submit(state, args):
    """Local tool: code owns the state, same as the harness design."""
    for a in args.get("answers", []):
        if a.get("field") in FIELDS:
            state[a["field"]] = a.get("value", "")
    return {"saved": True, "still_missing": [f for f in FIELDS if f not in state]}


async def api_call(contents):
    global calls_made
    cfg = types.GenerateContentConfig(
        system_instruction=SYSTEM,
        tools=[types.Tool(function_declarations=[SUBMIT_ANSWERS])],
        thinking_config=types.ThinkingConfig(thinking_level=THINKING_LEVEL),
    )
    calls_made += 1
    return await asyncio.wait_for(
        client.aio.models.generate_content(model=MODEL, contents=contents, config=cfg),
        TIMEOUT_S,
    )


async def run_conversation(convo_idx):
    global api_time
    convo_id = str(uuid.uuid4())[:8]
    contents = []     # generate_content is stateless: the full history is resent every call
    state = {}

    for turn_idx, text in enumerate(TURNS):
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=text)]))
        turn_start = time.perf_counter()
        step = 0
        turn_row = {
            "script": "multi_turn_function_calling",
            "run_id": RUN_ID, "convo_id": convo_id, "convo_idx": convo_idx,
            "turn": turn_idx, "model": MODEL, "thinking_level": THINKING_LEVEL,
            "input_chars": len(text), "api_calls": 0, "tool_called": False,
            "error": None,
        }

        while True:
            if calls_made >= MAX_CALLS:
                turn_row["error"] = "call_budget_reached"
                break
            kind = "decide" if step == 0 else "after_tool_result"
            t = time.perf_counter()
            call_row = {
                "script": "multi_turn_function_calling_call", "run_id": RUN_ID,
                "convo_id": convo_id, "turn": turn_idx, "step": step, "kind": kind,
                "thinking_level": THINKING_LEVEL, "history_items": len(contents),
                "ts": time.time(),
            }
            try:
                resp = await api_call(contents)
            except asyncio.TimeoutError:
                call_row["latency_s"] = round(time.perf_counter() - t, 3)
                call_row["error"] = "timeout"
                log(call_row)
                turn_row["error"] = "timeout"
                break
            except Exception as e:
                call_row["latency_s"] = round(time.perf_counter() - t, 3)
                call_row["error"] = f"{type(e).__name__}: {str(e)[:200]}"
                log(call_row)
                turn_row["error"] = call_row["error"]
                break

            call_row["latency_s"] = round(time.perf_counter() - t, 3)
            api_time += call_row["latency_s"]
            um = resp.usage_metadata
            if um:
                call_row["prompt_tokens"] = um.prompt_token_count
                call_row["output_tokens"] = um.candidates_token_count
                call_row["thinking_tokens"] = getattr(um, "thoughts_token_count", None)
            fcs = resp.function_calls or []
            call_row["function_calls"] = [fc.name for fc in fcs]
            call_row["error"] = None
            log(call_row)
            turn_row["api_calls"] += 1
            print(f"{THINKING_LEVEL} convo{convo_idx} turn{turn_idx} {kind}: "
                  f"{call_row['latency_s']}s calls={call_row['function_calls']}", flush=True)

            # Append the model's content untouched. Gemini 3 models attach thought
            # signatures to function calls, and they must be sent back unchanged.
            model_content = resp.candidates[0].content
            contents.append(model_content)

            if not fcs:
                turn_row["reply_preview"] = (resp.text or "")[:80]
                break

            turn_row["tool_called"] = True
            parts = []
            for fc in fcs:
                result = execute_submit(state, dict(fc.args)) if fc.name == "submit_answers" \
                    else {"error": "unknown function"}
                parts.append(types.Part.from_function_response(name=fc.name, response=result))
            contents.append(types.Content(role="user", parts=parts))
            step += 1
            await asyncio.sleep(GAP_S)

        turn_row["turn_latency_s"] = round(api_time, 3)
        turn_row["fields_saved"] = len(state)
        log(turn_row)
        print(f"  -> turn total {turn_row['turn_latency_s']}s over {turn_row['api_calls']} calls "
              f"err={turn_row['error']}", flush=True)
        if turn_row["error"]:
            return        # chain is broken after a failure or budget stop
        await asyncio.sleep(GAP_S)


async def main():
    for i in range(CONVERSATIONS):
        if calls_made >= MAX_CALLS:
            break
        await run_conversation(i)
    print(f"\napi calls used this run: {calls_made}/{MAX_CALLS}")


if __name__ == "__main__":
    asyncio.run(main())