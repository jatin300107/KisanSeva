from pathlib import Path

from ..languages import LANGS

PROMPT_DIR = Path(__file__).parent
CATEGORY_FILES = {"crop": "crop.md", "livestock": "livestock.md"}


def build_system_prompt(category: str, language_code: str) -> str:
    if category not in CATEGORY_FILES:
        raise ValueError(f"unknown category: {category}")
    if language_code not in LANGS:
        raise ValueError(f"unsupported language: {language_code}")
    base = (PROMPT_DIR / "base.md").read_text(encoding="utf-8")
    domain = (PROMPT_DIR / CATEGORY_FILES[category]).read_text(encoding="utf-8")
    return (base + "\n\n" + domain).replace("{language_name}", LANGS[language_code].name)