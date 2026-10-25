import asyncio
import logging
import time

from google import genai
from google.genai import types

from ...base import LLMError, LLMTurn, ToolCall
from ...settings import ProviderSettings

log = logging.getLogger("voice.gemini")


class GeminiDialogue:
    """
    One instance per voice session. generate_content is stateless, so the
    full history is resent on every call, same as your tested script.

    Contract: if a turn returns tool_calls, the caller must answer them with
    send_tool_results() before anything else. If any call in a farmer turn
    raises LLMError, call rollback(checkpoint) to drop the whole turn.
    """

    def __init__(
        self,
        settings: ProviderSettings,
        system_prompt: str,
        tools: list[types.FunctionDeclaration],
    ):
        self._s = settings
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=[types.Tool(function_declarations=tools)],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True
            ),
        )
        self._text_only_config = self._config.model_copy(update={
            "tool_config": types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(mode="NONE")
            )
        })
        self._history: list[types.Content] = []
        self._pending: list[types.Part] = []

    def checkpoint(self) -> tuple[int, list[types.Part]]:
        return len(self._history), list(self._pending)

    def rollback(self, cp: tuple[int, list[types.Part]]) -> None:
        n, pending = cp
        del self._history[n:]
        self._pending = pending

    def defer_tool_results(self, results: list[tuple[str, dict]]) -> None:
        """Record function responses to send with the next farmer message."""
        self._pending += [
            types.Part.from_function_response(name=name, response=response)
            for name, response in results
        ]
    async def send_tool_results(
        self, results: list[tuple[str, dict]], text_only: bool = True
    ) -> LLMTurn:
        parts = [
            types.Part.from_function_response(name=name, response=response)
            for name, response in results
        ]
        return await self._call(
            types.Content(role="user", parts=parts), text_only=text_only
        )
    async def send_user_text(self, text: str) -> LLMTurn:
        parts = self._pending + [types.Part.from_text(text=text)]
        self._pending = []
        return await self._call(types.Content(role="user", parts=parts))

    async def _call(self, content: types.Content, text_only: bool = False) -> LLMTurn:
        self._history.append(content)
        t0 = time.perf_counter()
        try:
            resp = await asyncio.wait_for(
                self._client.aio.models.generate_content(
                    model=self._s.gemini_model,
                    contents=self._history,
                    config=self._text_only_config if text_only else self._config,
                ),
                self._s.gemini_timeout_s,
            )
        except asyncio.TimeoutError:
            self._history.pop()
            log.warning("gemini timeout after %.1fs", self._s.gemini_timeout_s)
            raise LLMError("gemini timeout")
        except Exception as e:
            self._history.pop()
            raise LLMError(f"gemini failed: {type(e).__name__}: {e}") from e

        latency = time.perf_counter() - t0
        cand = resp.candidates[0] if resp.candidates else None
        if cand is None or cand.content is None or not cand.content.parts:
            self._history.pop()
            reason = getattr(cand, "finish_reason", None) if cand else "no_candidates"
            raise LLMError(f"gemini returned no content ({reason})")

        # Append the model content untouched. Gemini 3 attaches thought
        # signatures to function calls and they must be sent back unchanged.
        self._history.append(cand.content)

        text_parts: list[str] = []
        calls: list[ToolCall] = []
        for part in cand.content.parts:
            if part.function_call:
                calls.append(
                    ToolCall(
                        name=part.function_call.name,
                        args=dict(part.function_call.args or {}),
                    )
                )
            elif part.text and not part.thought:
                text_parts.append(part.text)

        um = resp.usage_metadata
        usage = {}
        if um:
            usage = {
                "prompt_tokens": um.prompt_token_count,
                "output_tokens": um.candidates_token_count,
                "thinking_tokens": getattr(um, "thoughts_token_count", None),
            }
        log.info(
            "gemini call ok latency=%.2fs history=%d calls=%s usage=%s",
            latency, len(self._history), [c.name for c in calls], usage,
        )
        return LLMTurn(
            text="".join(text_parts).strip(),
            tool_calls=calls,
            latency_s=latency,
            usage=usage,
        )