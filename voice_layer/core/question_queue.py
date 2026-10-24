from dataclasses import dataclass

from .questions import Question
from .retry_policy import RetryPolicy


@dataclass
class Resolution:
    status: str       # answered | refused | skipped | unanswered
    value: str
    raw_text: str
    attempts: int


class QuestionQueue:
    """
    Holds order and status only. The current question is always the first
    unresolved one, so a volunteered later answer just drops out of the line.
    """

    def __init__(self, questions: list[Question], policy: RetryPolicy):
        ids = [q.id for q in questions]
        if len(set(ids)) != len(ids):
            raise ValueError("duplicate question ids")
        self._order = list(questions)
        self._by_id = {q.id: q for q in self._order}
        self._res: dict[str, Resolution] = {}
        self._attempts: dict[str, int] = {}
        self.policy = policy

    def get(self, qid: str) -> Question | None:
        return self._by_id.get(qid)

    def is_resolved(self, qid: str) -> bool:
        return qid in self._res

    def pending(self) -> list[Question]:
        return [q for q in self._order if q.id not in self._res]

    @property
    def current(self) -> Question | None:
        p = self.pending()
        return p[0] if p else None

    @property
    def next(self) -> Question | None:
        p = self.pending()
        return p[1] if len(p) > 1 else None

    @property
    def done(self) -> bool:
        return not self.pending()

    def attempt(self, qid: str) -> int:
        return self._attempts.get(qid, 1)

    def bump_attempt(self, qid: str) -> int:
        self._attempts[qid] = self.attempt(qid) + 1
        return self._attempts[qid]

    def resolve(self, qid: str, status: str, value: str, raw_text: str) -> None:
        self._res[qid] = Resolution(status, value, raw_text, self.attempt(qid))

    def snapshot(self) -> dict[str, Resolution]:
        return dict(self._res)