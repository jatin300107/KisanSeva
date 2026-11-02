from dataclasses import dataclass

from .questions import Question


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3   # first ask plus 2 re-asks, then the question is marked unanswered


def fallback_line(q: Question, attempt: int) -> str:
    """Spoken when Gemini fails. No LLM involved, and the failure does not
    count as one of the farmer's attempts."""
    if attempt > 1 and q.example:
        return f"{q.text} {q.example}"
    return q.text