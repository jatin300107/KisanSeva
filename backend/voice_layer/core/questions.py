from dataclasses import dataclass


@dataclass(frozen=True)
class Question:
    id: str
    text: str                       # already in the farmer's language, from the DB
    qtype: str = "text"             # text | number | choice | yesno
    options: tuple[str, ...] = ()   # for choice
    example: str = ""               # used when re-asking

    def allowed(self) -> tuple[str, ...]:
        if self.qtype == "yesno":
            return ("yes", "no")
        if self.qtype == "choice":
            return self.options
        return ()