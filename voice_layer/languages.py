from dataclasses import dataclass


@dataclass(frozen=True)
class Lang:
    code: str
    name: str
    label: str
    tts_model: str
    tts_voice: str


LANGS = {
    "hi-IN": Lang("hi-IN", "Hindi", "हिन्दी", "timbre-v2.5", "Nalini"),
    "en-IN": Lang("en-IN", "English", "English", "timbre-v3.0", "Shivani"),
    "pa-IN": Lang("pa-IN", "Punjabi", "ਪੰਜਾਬੀ", "timbre-v3.0", "Shivani"),
}


def enabled_langs(settings) -> dict[str, Lang]:
    codes = [c.strip() for c in settings.voice_enabled_langs.split(",") if c.strip()]
    return {c: LANGS[c] for c in codes if c in LANGS}
