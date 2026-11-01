import asyncio
import hashlib
import io
import json
import logging
import time
import wave

from google import genai
from google.genai import types

from .base import PCM_CHANNELS, PCM_SAMPLE_RATE, PCM_SAMPLE_WIDTH
from .sentence_chunker import SentenceChunker
from .settings import ProviderSettings
from .providers.tts.gnani_tts import GnaniTTS
from .prompts import LANGUAGE_NAMES
from .exceptions import NarrationNotFound, NarrationUnavailable

log = logging.getLogger("voice.narration")
BUCKET = "report-audio"

PROMPT = """You turn a written crop or livestock diagnosis report into a short spoken summary for a farmer.

Write in {language_name}, in its native script, in simple everyday words and the respectful form of address.
Write 3 to 5 short sentences, about 30 seconds when spoken. No lists, markdown, emojis, symbols or brackets. Write numbers as words.
Say only what the report says. Never add a cause, a remedy, a product or advice that is not in the report. Never guess.
Medicine and pesticide names: write them in {language_name} script as they sound.
Do not read out doses, quantities or schedules. Say that the exact amounts are in the written report.
Start with what the report found, then what it says to do, then say the written report has the details.
If the report is unclear or empty, say that the report has no clear finding yet and ask the farmer to read the written report or contact an expert.
Output only the sentences to speak."""


def pcm_to_wav(pcm: bytes) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(PCM_CHANNELS)
        w.setsampwidth(PCM_SAMPLE_WIDTH)
        w.setframerate(PCM_SAMPLE_RATE)
        w.writeframes(pcm)
    return buf.getvalue()


def _as_text(diagnosis) -> str:
    if isinstance(diagnosis, str):
        return diagnosis.strip()
    return json.dumps(diagnosis, ensure_ascii=False)   # if ai_diagnosis is jsonb


class NarrationService:
    def __init__(self, db, settings: ProviderSettings):
        self.db = db
        self.s = settings
        self._locks: dict[str, asyncio.Lock] = {}

    async def get(self, report_id: str, user_id: str, lang: str) -> dict:
        started_at = time.perf_counter()
        log.info(
            "narration request started report_id=%s lang=%s",
            report_id,
            lang,
        )
        # One lock per report and language, so a double click (or a double firing
        # frontend) generates once and the second call reuses the result.
        lock = self._locks.setdefault(f"{report_id}:{lang}", asyncio.Lock())
        async with lock:
            row = await asyncio.to_thread(self._load, report_id, user_id)
            if row is None:
                log.warning("narration report not found report_id=%s", report_id)
                raise NarrationNotFound()
            diagnosis = _as_text(row.get("ai_diagnosis") or "")
            if not diagnosis:
                log.warning("narration diagnosis empty report_id=%s", report_id)
                raise NarrationUnavailable("report has no diagnosis yet")

            digest = hashlib.sha1(diagnosis.encode("utf-8")).hexdigest()[:12]
            narration = dict(row.get("narration") or {})
            entry = dict(narration.get(lang) or {})

            changed = False
            if entry.get("hash") != digest or not entry.get("text"):
                log.info(
                    "narration text generation started report_id=%s lang=%s diagnosis_chars=%d",
                    report_id,
                    lang,
                    len(diagnosis),
                )
                entry = {"text": await self._write_text(diagnosis, lang), "hash": digest}
                changed = True
            if not entry.get("audio_path"):
                log.info(
                    "narration audio generation started report_id=%s lang=%s text_chars=%d",
                    report_id,
                    lang,
                    len(entry["text"]),
                )
                entry["audio_path"] = await self._make_audio(report_id, lang, digest, entry["text"])
                changed = True
            if changed:
                narration[lang] = entry
                await asyncio.to_thread(self._save, report_id, narration)
                log.info("narration cache saved report_id=%s lang=%s", report_id, lang)

            url = await asyncio.to_thread(self._sign, entry["audio_path"])
            log.info(
                "narration request completed report_id=%s lang=%s duration_ms=%d cached=%s",
                report_id,
                lang,
                round((time.perf_counter() - started_at) * 1000),
                not changed,
            )
            return {"lang": lang, "text": entry["text"], "audio_url": url}

    # ---- db and storage (sync client, run in threads) ----
    def _load(self, report_id, user_id):
        started_at = time.perf_counter()
        r = (
            self.db.table("reports").select("id,ai_diagnosis,narration")
            .eq("id", report_id).eq("user_id", user_id).limit(1).execute().data
        )
        log.info(
            "narration report lookup completed report_id=%s found=%s duration_ms=%d",
            report_id,
            bool(r),
            round((time.perf_counter() - started_at) * 1000),
        )
        return r[0] if r else None

    def _save(self, report_id, narration):
        self.db.table("reports").update({"narration": narration}).eq("id", report_id).execute()

    def _sign(self, path):
        res = self.db.storage.from_(BUCKET).create_signed_url(path, 3600)
        return res.get("signedURL") or res.get("signedUrl")   # key name differs by client version

    # ---- generation ----
    async def _write_text(self, diagnosis: str, lang: str) -> str:
        started_at = time.perf_counter()
        client = genai.Client(api_key=self.s.gemini_api_key)
        cfg = types.GenerateContentConfig(
            system_instruction=PROMPT.replace("{language_name}", LANGUAGE_NAMES[lang]),
            temperature=0.2,
            thinking_config=types.ThinkingConfig(thinking_level=self.s.gemini_thinking_level),
        )
        try:
            resp = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=self.s.gemini_model, contents=diagnosis, config=cfg
                ),
                20,
            )
        except asyncio.TimeoutError as e:
            log.exception(
                "narration text timed out report_model=%s lang=%s duration_ms=%d",
                self.s.gemini_model,
                lang,
                round((time.perf_counter() - started_at) * 1000),
            )
            raise NarrationUnavailable("narration text timed out") from e
        except Exception as e:
            log.exception(
                "narration text failed report_model=%s lang=%s duration_ms=%d error_type=%s",
                self.s.gemini_model,
                lang,
                round((time.perf_counter() - started_at) * 1000),
                type(e).__name__,
            )
            raise NarrationUnavailable(f"narration text failed: {type(e).__name__}") from e
        text = (resp.text or "").strip()
        if not text:
            log.error("narration text response empty model=%s lang=%s", self.s.gemini_model, lang)
            raise NarrationUnavailable("narration text was empty")
        log.info(
            "narration text generation completed model=%s lang=%s text_chars=%d duration_ms=%d",
            self.s.gemini_model,
            lang,
            len(text),
            round((time.perf_counter() - started_at) * 1000),
        )
        return text

    async def _make_audio(self, report_id: str, lang: str, digest: str, text: str) -> str:
        started_at = time.perf_counter()
        ch = SentenceChunker()
        sentences = ch.feed(text + " ")
        rest = ch.flush()
        if rest:
            sentences.append(rest)

        tts = GnaniTTS(self.s)
        try:
            async def one(sentence: str) -> bytes:
                return b"".join([c async for c in tts.synthesize(sentence, lang)])

            parts = await asyncio.gather(*[one(x) for x in sentences])   # order is preserved
        except Exception as e:
            log.exception(
                "narration audio generation failed report_id=%s lang=%s sentences=%d duration_ms=%d error_type=%s",
                report_id,
                lang,
                len(sentences),
                round((time.perf_counter() - started_at) * 1000),
                type(e).__name__,
            )
            raise NarrationUnavailable(f"narration audio failed: {type(e).__name__}") from e
        finally:
            await tts.close()

        pcm = b"".join(parts)
        if not pcm:
            log.error("narration audio response empty report_id=%s lang=%s", report_id, lang)
            raise NarrationUnavailable("narration audio was empty")
        path = f"{report_id}/{lang}-{digest}.wav"
        wav = pcm_to_wav(pcm)
        await asyncio.to_thread(
            lambda: self.db.storage.from_(BUCKET).upload(
                path, wav, {"content-type": "audio/wav", "upsert": "true"}
            )
        )
        log.info(
            "narration audio uploaded report_id=%s lang=%s bytes=%d duration_ms=%d",
            report_id,
            lang,
            len(wav),
            round((time.perf_counter() - started_at) * 1000),
        )
        return path