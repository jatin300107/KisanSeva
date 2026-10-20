import json
import time
import uuid
from google import genai

LOG_FILE = "latency_log.jsonl"
MODEL = "gemini-3.5-flash-lite"
THINKING_LEVELS = ["low", "high"]   # check the docs for valid values
CONVERSATIONS_PER_LEVEL = 5

# One simulated symptom QA session. Each item is one user turn.
TURNS = [
    "मेरी भैंस खाना नहीं खा रही है और अजीब बर्ताव कर रही है",
    "हाँ गरम तो बहुत लग रही है",
    "नहीं बछड़ा तो नहीं दिया है",
    "दो दिन से ऐसा है",
]

client = genai.Client()


def log(row):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def run_conversation(level, convo_idx):
    convo_id = str(uuid.uuid4())[:8]
    prev_id = None
    for turn_idx, text in enumerate(TURNS):
        kwargs = {
            "model": MODEL,
            "input": text,
            "generation_config": {"thinking_level": level},
        }
        if prev_id:
            kwargs["previous_interaction_id"] = prev_id

        row = {
            "script": "multi_turn",
            "convo_id": convo_id,
            "convo_idx": convo_idx,
            "turn": turn_idx,
            "model": MODEL,
            "thinking_level": level,
            "input_chars": len(text),
            "has_previous": prev_id is not None,
            "ts": time.time(),
        }

        start = time.perf_counter()
        try:
            interaction = client.interactions.create(**kwargs)
            row["latency_s"] = round(time.perf_counter() - start, 3)
            out = interaction.output_text or ""
            row["output_chars"] = len(out)
            row["output_preview"] = out[:80]
            prev_id = interaction.id
            row["error"] = None
        except Exception as e:
            row["latency_s"] = round(time.perf_counter() - start, 3)
            row["error"] = str(e)[:200]
            log(row)
            return  # cannot continue the chain after a failure

        log(row)
        print(f"{level} convo{convo_idx} turn{turn_idx}: {row['latency_s']}s")


if __name__ == "__main__":
    for level in THINKING_LEVELS:
        for i in range(CONVERSATIONS_PER_LEVEL):
            run_conversation(level, i)