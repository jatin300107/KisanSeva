import asyncio
import json
import os
import sys
import time

from google import genai
from google.genai import types

LOG_FILE = "latency_log.jsonl"
MODEL = "gemini-3.5-flash-lite"
THINKING_LEVEL = sys.argv[1] if len(sys.argv) > 1 else "low"   # run once per level
REPEATS_PER_INPUT = 5          # 3 inputs x 5 = 15 calls per file run
TIMEOUT_S = 35
GAP_S = 3                      # pause between calls to stay under free-tier rate limits

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

client = genai.Client()   # reads GEMINI_API_KEY
RUN_ID = int(time.time())


def log(row):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


async def one_call(label, text, run):
    row = {
        "run_id": RUN_ID,
        "script": "single_turn_generate_content",
        "input_label": label,
        "run": run,
        "model": MODEL,
        "thinking_level": THINKING_LEVEL,
        "input_chars": len(text),
        "ts": time.time(),
    }
    cfg = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_level=THINKING_LEVEL),
    )
    start = time.perf_counter()
    try:
        resp = await asyncio.wait_for(
            client.aio.models.generate_content(model=MODEL, contents=text, config=cfg),
            TIMEOUT_S,
        )
        row["latency_s"] = round(time.perf_counter() - start, 3)
        out = resp.text or ""
        row["output_chars"] = len(out)
        row["output_preview"] = out[:80]
        um = resp.usage_metadata
        if um:
            row["prompt_tokens"] = um.prompt_token_count
            row["output_tokens"] = um.candidates_token_count
            row["thinking_tokens"] = getattr(um, "thoughts_token_count", None)
        row["error"] = None
    except asyncio.TimeoutError:
        row["latency_s"] = round(time.perf_counter() - start, 3)
        row["error"] = "timeout"
    except Exception as e:
        row["latency_s"] = round(time.perf_counter() - start, 3)
        row["error"] = f"{type(e).__name__}: {str(e)[:200]}"
    log(row)
    print(f"{THINKING_LEVEL} {label} run{run}: {row['latency_s']}s  err={row['error']}", flush=True)
    return row


async def main():
    # Interleave inputs so each file run covers all three lengths evenly
    # and time-of-day effects don't bunch up on one input.
    rows = []
    for run in range(REPEATS_PER_INPUT):
        for label, text in INPUTS.items():
            rows.append(await one_call(label, text, run))
            await asyncio.sleep(GAP_S)

    ok = sorted(r["latency_s"] for r in rows if not r["error"])
    if ok:
        p = lambda q: ok[min(len(ok) - 1, int(q * len(ok)))]
        print(f"\nlevel={THINKING_LEVEL} ok={len(ok)}/{len(rows)} "
              f"p50={p(.5):.2f}s p95={p(.95):.2f}s max={ok[-1]:.2f}s")
    else:
        print("\nall calls failed, check the error column in the log")


if __name__ == "__main__":
    asyncio.run(main())