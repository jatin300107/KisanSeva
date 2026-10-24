import logging
import re
from dataclasses import dataclass, field

from ..providers.llm.tools import ItemResult, NextQuestion, SubmitAnswers, SubmitResult
from .question_queue import QuestionQueue
from .questions import Question

log = logging.getLogger("voice.validator")


@dataclass(frozen=True)
class TurnContext:
    """What Gemini was told for this turn. Captured BEFORE the farmer's message is sent."""
    current_id: str
    offered_next_id: str | None
    attempt: int


@dataclass
class Outcome:
    result: SubmitResult
    matches_gemini_intent: bool
    resolved_ids: list[str] = field(default_factory=list)
    finished: bool = False


def make_context(queue: QuestionQueue) -> TurnContext:
    cur, nxt = queue.current, queue.next
    return TurnContext(cur.id, nxt.id if nxt else None, queue.attempt(cur.id))


def _normalise(q: Question, value: str) -> tuple[str | None, str]:
    v = " ".join((value or "").split())
    if not v:
        return None, "value is empty"
    allowed = q.allowed()
    if allowed:
        for o in allowed:
            if v.casefold() == o.casefold():
                return o, ""
        return None, f"value must be exactly one of: {', '.join(allowed)}"
    if q.qtype == "number":
        if not re.search(r"\d", v):
            return None, "value must contain a number, written in digits"
        if len(v) > 40:
            return None, "value is too long for a number answer"
        return v, ""
    if len(v) > 500:
        return None, "value is too long"
    return v, ""


class AnswerValidator:
    def __init__(self, queue: QuestionQueue):
        self.q = queue

    def apply(self, parsed: SubmitAnswers | None, ctx: TurnContext) -> Outcome:
        q = self.q
        max_attempts = q.policy.max_attempts
        resolved: list[str] = []
        results: list[ItemResult] = []

        def reject(qid: str, reason: str) -> None:
            results.append(ItemResult(question_id=qid, accepted=False, reason=reason))

        def resolve(qid: str, status: str, value: str, raw: str) -> None:
            q.resolve(qid, status, value, raw)
            resolved.append(qid)

        cur = q.current
        drift = cur is None or cur.id != ctx.current_id
        if drift:
            log.warning("state drift: ctx=%s queue=%s", ctx.current_id, cur.id if cur else None)
            return self._outcome(results, resolved, matches=False)

        current_item = None
        seen: set[str] = set()
        for a in (parsed.answers if parsed else []):
            if a.question_id in seen:
                reject(a.question_id, "duplicate item for this question")
                continue
            seen.add(a.question_id)
            target = q.get(a.question_id)
            if target is None:
                reject(a.question_id, "unknown question id")
                continue
            if q.is_resolved(target.id):
                reject(target.id, "this question is already resolved")
                continue
            if target.id == cur.id:
                current_item = a
                continue
            # volunteered answer to a later question
            if a.status != "answered":
                reject(target.id, "only record another question when the farmer clearly answered it")
                continue
            value, why = _normalise(target, a.value)
            if value is None:
                reject(target.id, why)
                continue
            resolve(target.id, "answered", value, a.raw_text)
            results.append(ItemResult(question_id=target.id, accepted=True))

        intended: str | None = None   # what Gemini's spoken text most likely does
        if current_item is None:
            reject(cur.id, "no result was submitted for the current question")
        else:
            a = current_item
            unclear, reason = False, ""
            if a.status == "answered":
                intended = "ask_next"
                value, why = _normalise(cur, a.value)
                if value is None:
                    unclear, reason = True, why
                else:
                    resolve(cur.id, "answered", value, a.raw_text)
                    results.append(ItemResult(question_id=cur.id, accepted=True))
            elif a.status in ("refused", "skipped"):
                intended = "ask_next"
                resolve(cur.id, a.status, "", a.raw_text)
                results.append(ItemResult(question_id=cur.id, accepted=True))
            else:  # unclear
                intended = "re_ask" if ctx.attempt < max_attempts else "ask_next"
                unclear = True

            if unclear:
                if q.attempt(cur.id) < max_attempts:
                    q.bump_attempt(cur.id)
                    results.append(ItemResult(
                        question_id=cur.id,
                        accepted=(a.status == "unclear"),
                        reason=reason,
                    ))
                else:
                    resolve(cur.id, "unanswered", "", a.raw_text)
                    results.append(ItemResult(
                        question_id=cur.id,
                        accepted=True,
                        reason="attempt cap reached, marked unanswered and moving on",
                    ))

        # Which question did Gemini's spoken text talk about, and which one is it really?
        if intended == "ask_next":
            spoken_target = ctx.offered_next_id
        elif intended == "re_ask":
            spoken_target = ctx.current_id
        else:
            spoken_target = "__none__"
        now = q.current
        actual_target = now.id if now else None

        matches = (
            intended is not None
            and all(r.accepted for r in results)
            and spoken_target == actual_target
        )
        return self._outcome(results, resolved, matches)

    def _outcome(self, results: list[ItemResult], resolved: list[str], matches: bool) -> Outcome:
        q = self.q
        now = q.current
        if now is None:
            result = SubmitResult(
                results=results,
                action="finish",
                note="All questions are done. Thank the farmer and close the call.",
            )
        else:
            was_asked = q.attempt(now.id) > 1
            action = "re_ask" if was_asked else "ask_next"
            note = (
                f"Re-ask in simpler words with one example. Attempt {q.attempt(now.id)} of {q.policy.max_attempts}."
                if was_asked else "Ask this question."
            )
            result = SubmitResult(
                results=results,
                action=action,
                question=NextQuestion(
                    id=now.id,
                    text=now.text,
                    qtype=now.qtype,
                    options=list(now.allowed()),
                    example=now.example,
                ),
                note=note,
            )
        return Outcome(
            result=result,
            matches_gemini_intent=matches,
            resolved_ids=resolved,
            finished=now is None,
        )