import asyncio
import logging

from ..core.questions import Question
from ..core.question_queue import Resolution

log = logging.getLogger("voice.repo")

QUESTIONS_TABLE = "questions"
CLOSING_ID = "__closing__"
CLOSING_EN = "Thank you. All your details have been noted. Goodbye."


class MissingTranslations(Exception):
    pass


class VoiceRepo:
    def __init__(self, client):
        self.db = client

    async def load_questions(self, db_type: str, language: str) -> tuple[list[Question], str]:
        def work():
            rows = (
                self.db.table(QUESTIONS_TABLE).select("id,question")
                .eq("type", db_type).order("position").execute().data
            )
            tr = {}
            if rows and not language.startswith("en"):
                t = (
                    self.db.table("question_translations").select("question_id,text")
                    .eq("language", language).in_("question_id", [r["id"] for r in rows] + [CLOSING_ID])
                    .execute().data
                )
                tr = {x["question_id"]: x["text"] for x in t}
            return rows, tr

        rows, tr = await asyncio.to_thread(work)
        if language.startswith("en"):
            return [Question(id=str(r["id"]), text=r["question"]) for r in rows], CLOSING_EN
        missing = [r["id"] for r in rows if r["id"] not in tr]
        if missing or CLOSING_ID not in tr:
            raise MissingTranslations(f"{language}: {len(missing)} questions missing")
        return [Question(id=str(r["id"]), text=tr[r["id"]]) for r in rows], tr[CLOSING_ID]

    async def create_session(self, session_id, user_id, category, language) -> None:
        await asyncio.to_thread(
            lambda: self.db.table("voice_sessions").insert(
                {"id": session_id, "user_id": user_id, "category": category, "language": language}
            ).execute()
        )

    async def save(self, session_id: str, items: dict[str, Resolution]) -> None:
        rows = [
            {"session_id": session_id, "question_id": qid, "status": r.status,
             "value": r.value, "raw_text": r.raw_text, "attempts": r.attempts}
            for qid, r in items.items()
        ]
        await asyncio.to_thread(
            lambda: self.db.table("voice_answers").upsert(rows, on_conflict="session_id,question_id").execute()
        )

    async def set_status(self, session_id: str, status: str) -> None:
        await asyncio.to_thread(
            lambda: self.db.table("voice_sessions")
            .update({"status": status, "finished_at": "now()"}).eq("id", session_id).execute()
        )