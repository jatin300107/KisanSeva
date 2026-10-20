import json
import time
from google import genai

LOG_FILE = "latency_log.jsonl"
MODEL = "gemini-3.5-flash-lite"
THINKING_LEVELS = ["low", "high"]   # check the docs for valid values
REPEATS = 8

# Different lengths on purpose, latency usually scales with input and output.
INPUTS = {
    "short": "नहीं",
    "medium": "मेरी भैंस खाना नहीं खा रही है और गरम बहुत लग रही है",
    "long": (
        "मेरी भैंस दो दिन से खाना नहीं खा रही है, बहुत गरम लग रही है, "
        "दूध भी कम दे रही है, और अजीब सा बर्ताव कर रही है, "
        "बछड़ा अभी नहीं दिया है, आप बताइए क्या हो सकता है"
    ),
}

client = genai.Client()


def log(row):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    for level in THINKING_LEVELS:
        for label, text in INPUTS.items():
            for run in range(REPEATS):
                row = {
                    "script": "single_turn",
                    "input_label": label,
                    "run": run,
                    "model": MODEL,
                    "thinking_level": level,
                    "input_chars": len(text),
                    "ts": time.time(),
                }

                start = time.perf_counter()
                try:
                    interaction = client.interactions.create(
                        model=MODEL,
                        input=text,
                        generation_config={"thinking_level": level},
                    )
                    row["latency_s"] = round(time.perf_counter() - start, 3)
                    out = interaction.output_text or ""
                    row["output_chars"] = len(out)
                    row["output_preview"] = out[:80]
                    row["error"] = None
                except Exception as e:
                    row["latency_s"] = round(time.perf_counter() - start, 3)
                    row["error"] = str(e)[:200]

                log(row)
                print(f"{level} {label} run{run}: {row['latency_s']}s")