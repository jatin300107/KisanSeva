"""Minimal Gemini API connectivity test.

Run from the repository root:

    python tests\test_gemini_call_api.py

Set GEMINI_MODEL to test another model. The default is a generally available
model; do not use the harness model here while diagnosing a 404.
"""

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv(Path(__file__).resolve().parents[1] / ".env")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


async def gemini_call_demo() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)
    response = await client.aio.models.generate_content(
        model=MODEL,
        contents="Reply with exactly: Gemini API is reachable.",
        config=types.GenerateContentConfig(temperature=0),
    )
    return response.text or ""


def main() -> int:
    print(f"Testing Gemini model: {MODEL}")
    try:
        text = asyncio.run(gemini_call_demo())
    except Exception as exc:
        print(f"Gemini API test failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        print(
            "A 404 usually means the model is unavailable for this API or "
            "the model name is invalid. Try setting GEMINI_MODEL to a model "
            "listed for your key.",
            file=sys.stderr,
        )
        return 1

    if not text.strip():
        print("Gemini API returned an empty response", file=sys.stderr)
        return 1

    print(f"Response: {text.strip()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
