import pytest

from voice_layer.core.answer_validator import AnswerValidator, make_context
from voice_layer.core.question_queue import QuestionQueue
from voice_layer.core.questions import Question
from voice_layer.core.retry_policy import RetryPolicy
from voice_layer.providers.llm.tools import AnswerItem, SubmitAnswers


def text_q(n):
    return Question(id=f"q{n}", text=f"Question {n}")


def mk(*qs, max_attempts=3):
    queue = QuestionQueue(list(qs), RetryPolicy(max_attempts=max_attempts))
    return queue, AnswerValidator(queue)


def item(qid, status="answered", value="v", raw="raw"):
    return AnswerItem(question_id=qid, status=status, value=value, raw_text=raw)


def submit(*items):
    return SubmitAnswers(answers=list(items))


def test_duplicate_question_ids_rejected():
    with pytest.raises(ValueError):
        QuestionQueue([text_q(1), text_q(1)], RetryPolicy())


def test_answered_current_with_correct_next():
    queue, val = mk(text_q(1), text_q(2), text_q(3))
    ctx = make_context(queue)
    out = val.apply(submit(item("q1", value="wheat")), ctx)
    assert out.matches_gemini_intent is True
    assert out.resolved_ids == ["q1"]
    assert queue.current.id == "q2"
    assert out.result.action == "ask_next"
    assert out.result.question.id == "q2"
    assert out.finished is False


def test_volunteered_answer_makes_spoken_next_question_wrong():
    queue, val = mk(text_q(1), text_q(2), text_q(3))
    ctx = make_context(queue)                # Gemini will be told next is q2
    out = val.apply(submit(item("q1"), item("q2", value="2 weeks")), ctx)
    assert queue.current.id == "q3"
    assert out.matches_gemini_intent is False   # its spoken text probably asked q2
    assert set(out.resolved_ids) == {"q1", "q2"}
    assert out.result.question.id == "q3"


def test_invalid_choice_value_becomes_reask():
    q1 = Question(id="q1", text="Q1", qtype="choice", options=("yes", "no"))
    queue, val = mk(q1, text_q(2))
    ctx = make_context(queue)
    out = val.apply(submit(item("q1", value="maybe")), ctx)
    assert queue.current.id == "q1"
    assert queue.attempt("q1") == 2
    assert out.matches_gemini_intent is False
    assert out.result.action == "re_ask"
    assert out.resolved_ids == []


def test_choice_value_is_normalised_to_option_spelling():
    q1 = Question(id="q1", text="Q1", qtype="choice", options=("yes", "no"))
    queue, val = mk(q1, text_q(2))
    out = val.apply(submit(item("q1", value="YES")), make_context(queue))
    assert queue.snapshot()["q1"].value == "yes"
    assert out.matches_gemini_intent is True


def test_number_question_requires_digits():
    q1 = Question(id="q1", text="Age?", qtype="number")
    queue, val = mk(q1, text_q(2))
    out = val.apply(submit(item("q1", value="three")), make_context(queue))
    assert queue.current.id == "q1"
    assert out.matches_gemini_intent is False


def test_unclear_first_attempt_is_a_matching_reask():
    queue, val = mk(text_q(1), text_q(2))
    out = val.apply(submit(item("q1", status="unclear", value="")), make_context(queue))
    assert queue.attempt("q1") == 2
    assert queue.current.id == "q1"
    assert out.matches_gemini_intent is True     # Gemini was told to re-ask, and that is what happened
    assert out.result.action == "re_ask"


def test_unclear_at_cap_is_resolved_unanswered():
    queue, val = mk(text_q(1), text_q(2))
    queue.bump_attempt("q1")
    queue.bump_attempt("q1")                     # attempt 3 of 3
    ctx = make_context(queue)
    out = val.apply(submit(item("q1", status="unclear", value="")), ctx)
    assert queue.snapshot()["q1"].status == "unanswered"
    assert queue.snapshot()["q1"].attempts == 3
    assert queue.current.id == "q2"
    assert out.matches_gemini_intent is True     # Gemini was told to move on at the cap


def test_missing_item_for_current_question():
    queue, val = mk(text_q(1), text_q(2))
    out = val.apply(None, make_context(queue))
    assert out.matches_gemini_intent is False
    assert queue.attempt("q1") == 1              # a broken tool call must not cost the farmer an attempt
    assert queue.current.id == "q1"


def test_refused_and_skipped_move_on():
    for status in ("refused", "skipped"):
        queue, val = mk(text_q(1), text_q(2))
        out = val.apply(submit(item("q1", status=status, value="")), make_context(queue))
        assert queue.snapshot()["q1"].status == status
        assert queue.current.id == "q2"
        assert out.matches_gemini_intent is True


def test_last_question_answered_finishes():
    queue, val = mk(text_q(1))
    out = val.apply(submit(item("q1")), make_context(queue))
    assert out.finished is True
    assert out.result.action == "finish"
    assert out.result.question is None
    assert out.matches_gemini_intent is True


def test_state_drift_changes_nothing():
    queue, val = mk(text_q(1), text_q(2))
    ctx = make_context(queue)
    queue.resolve("q1", "answered", "x", "x")    # state moved after the context was captured
    out = val.apply(submit(item("q1")), ctx)
    assert out.matches_gemini_intent is False
    assert out.resolved_ids == []


def test_correction_is_currently_rejected():
    """Documents the undecided behaviour. When you decide that corrections overwrite, flip this test."""
    queue, val = mk(text_q(1), text_q(2), text_q(3))
    queue.resolve("q1", "answered", "4 years", "chaar saal")
    ctx = make_context(queue)
    out = val.apply(submit(item("q1", value="5 years"), item("q2")), ctx)
    assert queue.snapshot()["q1"].value == "4 years"
    assert any(r.question_id == "q1" and not r.accepted for r in out.result.results)
    assert out.matches_gemini_intent is False