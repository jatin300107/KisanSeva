from dataclasses import dataclass

from ..prompts import build_system_prompt
from ..providers.llm.gemini_dialogue import GeminiDialogue
from ..providers.llm.tools import submit_answers_declaration
from voice_layer.settings import ProviderSettings
from ..providers.stt.gnani_stt import GnaniSTT
from ..providers.tts.gnani_tts import GnaniTTS
from .answer_validator import AnswerValidator
from .orchestrator import OrchestratorConfig, VoiceOrchestrator
from .question_queue import QuestionQueue
from .retry_policy import RetryPolicy
from .session_store import SessionStore

CLOSING = {"hi-IN": "धन्यवाद। आपकी सारी जानकारी दर्ज हो गई है। नमस्ते।"}


@dataclass
class VoiceRuntime:
    settings: ProviderSettings
    store: SessionStore
    repo: object


def build_orchestrator(rt: VoiceRuntime, session, transport) -> VoiceOrchestrator:
    queue = QuestionQueue(list(session.questions), RetryPolicy(max_attempts=3))
    return VoiceOrchestrator(
        session_id=session.id,
        config=OrchestratorConfig(language=session.language, closing_line=CLOSING[session.language]),
        queue=queue,
        validator=AnswerValidator(queue),
        dialogue=GeminiDialogue(
            rt.settings, build_system_prompt(session.category, session.language),
            [submit_answers_declaration()],
        ),
        stt=GnaniSTT(rt.settings),
        tts=GnaniTTS(rt.settings),     # one pooled client per session, closed by the orchestrator
        transport=transport,
        repo=rt.repo,
    )