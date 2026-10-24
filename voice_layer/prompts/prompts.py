from pathlib import Path

PROMPT_DIR = Path(__file__).parent / "prompts"
CATEGORY_FILES = {"crop": "crop.md", "livestock": "livestock.md"}

# Only hi-IN has been tested with Gnani. Add others only after testing STT, TTS and prompts in them.
LANGUAGE_NAMES = {"hi-IN": "Hindi"}


def build_system_prompt(category: str, language_code: str) -> str:
    if category not in CATEGORY_FILES:
        raise ValueError(f"unknown category: {category}")
    if language_code not in LANGUAGE_NAMES:
        raise ValueError(f"unsupported language: {language_code}")
    base = (PROMPT_DIR / "base.md").read_text(encoding="utf-8")
    domain = (PROMPT_DIR / CATEGORY_FILES[category]).read_text(encoding="utf-8")
    return (base + "\n\n" + domain).replace("{language_name}", LANGUAGE_NAMES[language_code])