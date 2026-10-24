import asyncio

from fakes import FakeDialogue, FakeRepo, FakeSTT, FakeTransport, FakeTTS, Rig, tc, turn

from voice_layer.core.answer_validator import AnswerValidator
from voice_layer.core.orchestrator import OrchestratorConfig, VoiceOrchestrator
from voice_layer.core.question_queue import QuestionQueue
from voice_layer.core.questions import Question
from voice_layer.core.retry_policy import RetryPolicy
from voice_layer.base import LLMError


def build(n_questions, utterances, llm_script, **cfg):
    questions = [Question(id=f"q{i}", text=f"QTEXT{i}") for i in range(1, n_questions + 1)]
    queue = QuestionQueue(questions, RetryPolicy(max_attempts=3))
    llm, stt, tts = FakeDialogue(llm_script), FakeSTT(utterances), FakeTTS()
    transport, repo = FakeTransport(), FakeRepo()
    config = OrchestratorConfig(
        language="hi-IN", closing_line="CLOSING", playback_grace_s=0.5, **cfg
    )
    orch = VoiceOrchestrator(
        session_id="s1", config=config, queue=queue, validator=AnswerValidator(queue),
        dialogue=llm, stt=stt, tts=tts, transport=transport, repo=repo,
    )
    transport.orch = orch
    return Rig(orch, queue, llm, stt, tts, transport, repo)


def run(rig):
    return asyncio.run(rig.orch.run())


def events(rig, kind):
    return [e for e in rig.transport.events if e["type"] == kind]


def test_happy_path_single_call_per_turn():
    rig = build(
        2,
        ["gehu", "do hafte"],
        [
            turn("ASK Q2", [tc(("q1", "answered", "wheat", "gehu"))]),
            turn("BYE", [tc(("q2", "answered", "2 weeks", "do hafte"))]),
        ],
    )
    assert run(rig) == "completed"
    assert rig.tts.spoken == ["QTEXT1", "ASK Q2", "BYE"]
    assert [k for k, _ in rig.llm.sent] == ["user", "user"]     # no second Gemini call anywhere
    assert set(rig.repo.saved) == {"q1", "q2"}
    done = events(rig, "done")[0]
    assert done["status"] == "completed"
    assert done["answers"]["q1"] == {"status": "answered", "value": "wheat"}
    assert rig.repo.status == "completed"
    assert rig.tts.closed is True


def test_tool_call_without_text_uses_second_call():
    rig = build(
        2,
        ["gehu", "do hafte"],
        [
            turn("", [tc(("q1", "answered", "wheat", "gehu"))]),
            turn("ASK Q2 AFTER TOOL"),
            turn("BYE", [tc(("q2", "answered", "2 weeks", "do hafte"))]),
        ],
    )
    assert run(rig) == "completed"
    assert [k for k, _ in rig.llm.sent] == ["user", "tool", "user"]
    payload = rig.llm.sent[1][1][0][1]
    assert payload["action"] == "ask_next"
    assert payload["question"]["id"] == "q2"
    assert rig.tts.spoken[1] == "ASK Q2 AFTER TOOL"


def test_wrong_spoken_text_is_never_played():
    # Gemini answers q1 and q2 but its text asks q2, which is already done.
    rig = build(
        3,
        ["gehu aur do hafte", "teen"],
        [
            turn("ASK Q2 WRONG", [tc(("q1", "answered", "wheat", "gehu"), ("q2", "answered", "2 weeks", "do hafte"))]),
            turn("ASK Q3 CORRECT"),
            turn("BYE", [tc(("q3", "answered", "x", "teen"))]),
        ],
    )
    assert run(rig) == "completed"
    assert "ASK Q2 WRONG" not in rig.tts.spoken
    assert rig.tts.spoken[1] == "ASK Q3 CORRECT"
    assert set(rig.repo.saved) == {"q1", "q2", "q3"}


def test_text_only_reply_is_retried_with_reminder_and_rolled_back():
    rig = build(
        2,
        ["gehu", "do hafte"],
        [
            turn("just text no tool"),
            turn("ASK Q2", [tc(("q1", "answered", "wheat", "gehu"))]),
            turn("BYE", [tc(("q2", "answered", "2 weeks", "do hafte"))]),
        ],
    )
    assert run(rig) == "completed"
    assert "[APP REMINDER]" in rig.llm.sent[1][1]
    assert "just text no tool" not in rig.tts.spoken
    assert all(t.text != "just text no tool" for t in rig.llm.history)


def test_malformed_tool_args_trigger_second_call_and_cost_no_attempt():
    bad = turn("TEXT THAT MUST NOT PLAY", [tc()])
    bad.tool_calls[0].args["answers"] = [{"status": "answered"}]   # missing question_id and raw_text
    rig = build(
        1,
        ["gehu", "gehu"],
        [
            bad,
            turn("ASK AGAIN"),
            turn("BYE", [tc(("q1", "answered", "wheat", "gehu"))]),
        ],
    )
    assert run(rig) == "completed"
    assert "TEXT THAT MUST NOT PLAY" not in rig.tts.spoken
    assert "error" in rig.llm.sent[1][1][0][1]
    assert rig.queue.snapshot()["q1"].attempts == 1


def test_gemini_failure_speaks_fallback_and_keeps_attempt_count():
    rig = build(
        2,
        ["x", "gehu", "do hafte"],
        [
            LLMError("boom"),
            turn("ASK Q2", [tc(("q1", "answered", "wheat", "gehu"))]),
            turn("BYE", [tc(("q2", "answered", "2 weeks", "do hafte"))]),
        ],
    )
    assert run(rig) == "completed"
    assert rig.tts.spoken == ["QTEXT1", "QTEXT1", "ASK Q2", "BYE"]   # the question is repeated, not skipped
    assert rig.queue.snapshot()["q1"].attempts == 1                  # the failure was not the farmer's fault


def test_three_provider_failures_in_a_row_fail_the_session():
    rig = build(
        2,
        ["a", "b", "c"],
        [LLMError("1"), LLMError("2"), LLMError("3")],
    )
    assert run(rig) == "failed"
    assert {"type": "error", "code": "provider_failure"} in rig.transport.events
    assert events(rig, "done")[0]["status"] == "failed"
    assert rig.repo.status == "failed"


def test_repeated_silence_abandons_session():
    rig = build(2, ["", "", ""], [], max_silence_reprompts=2)
    assert run(rig) == "abandoned"
    assert rig.tts.spoken == ["QTEXT1", "QTEXT1", "QTEXT1"]
    assert rig.llm.sent == []                                        # silence never reaches Gemini


def test_unclear_three_times_then_moves_on():
    rig = build(
        2,
        ["hmm", "hmm", "hmm", "do hafte"],
        [
            turn("REASK1", [tc(("q1", "unclear", "", "hmm"))]),
            turn("REASK2", [tc(("q1", "unclear", "", "hmm"))]),
            turn("ASK Q2", [tc(("q1", "unclear", "", "hmm"))]),
            turn("BYE", [tc(("q2", "answered", "2 weeks", "do hafte"))]),
        ],
    )
    assert run(rig) == "completed"
    assert rig.tts.spoken == ["QTEXT1", "REASK1", "REASK2", "ASK Q2", "BYE"]
    snap = rig.queue.snapshot()
    assert snap["q1"].status == "unanswered"
    assert snap["q1"].attempts == 3


def test_mic_audio_is_dropped_unless_listening():
    rig = build(1, [], [])
    rig.orch.feed_audio(b"\x00" * 1024)
    assert rig.orch._mic_q.empty()