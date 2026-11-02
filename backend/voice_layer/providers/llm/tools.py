from typing import Any, Literal

from google.genai import types
from pydantic import BaseModel, Field

AnswerStatus = Literal["answered", "unclear", "refused", "skipped"]


# ---- What Gemini sends us -------------------------------------------------

class AnswerItem(BaseModel):
    question_id: str = Field(description="Id of the question this answer belongs to.")
    status: AnswerStatus = Field(
        description=(
            "answered: the farmer clearly answered. "
            "unclear: vague, off-topic, or cannot be mapped to the question. "
            "refused: the farmer does not want to answer. "
            "skipped: the farmer says they do not know or it does not apply."
        )
    )
    value: str = Field(
        default="",
        description="The answer, normalised. Empty unless status is answered.",
    )
    raw_text: str = Field(description="The farmer's own words for this answer, unchanged.")


class SubmitAnswers(BaseModel):
    answers: list[AnswerItem]
    say: str = Field(
        default="",
        description=(
            "The exact words to speak to the farmer next in the call language. "
            "Never empty."
        ),
    )


# ---- What we send back as the tool result ---------------------------------

class NextQuestion(BaseModel):
    id: str
    text: str
    qtype: str = "text"
    options: list[str] = []
    example: str = ""


class ItemResult(BaseModel):
    question_id: str
    accepted: bool
    reason: str = ""      # why it was rejected, written for Gemini to act on


class SubmitResult(BaseModel):
    results: list[ItemResult]
    action: Literal["ask_next", "re_ask", "finish"]
    question: NextQuestion | None = None
    note: str = ""        # e.g. "give one example and ask again, attempt 2 of 2"


# ---- Schema plumbing -------------------------------------------------------

_DROP = {"title", "default", "$defs", "additionalProperties"}


def _to_gemini_schema(schema: dict) -> dict:
    """Inline $ref and strip keys the Gemini schema subset may reject."""
    defs = schema.get("$defs", {})

    def walk(node: Any) -> Any:
        if isinstance(node, dict):
            if "$ref" in node:
                return walk(defs[node["$ref"].split("/")[-1]])
            out = {}
            for k, v in node.items():
                if k in _DROP:
                    continue
                if k == "properties":
                    out[k] = {pk: walk(pv) for pk, pv in v.items()}
                else:
                    out[k] = walk(v)
            return out
        if isinstance(node, list):
            return [walk(x) for x in node]
        return node

    return walk(schema)


def submit_answers_declaration() -> types.FunctionDeclaration:
    schema = _to_gemini_schema(SubmitAnswers.model_json_schema())
    schema["required"] = sorted(set(schema.get("required", [])) | {"answers", "say"})
    return types.FunctionDeclaration(
        name="submit_answers",
        description=(
            "Record the outcome for each question the farmer's latest message "
            "addressed, and give the words to speak next. Call this after every "
            "farmer message."
        ),
        parameters=schema,
    )


def parse_submit_answers(args: dict) -> SubmitAnswers:
    """Raises pydantic.ValidationError on bad args. The orchestrator should
    return {"error": str(e)} as the tool result so Gemini can retry once."""
    return SubmitAnswers.model_validate(args)