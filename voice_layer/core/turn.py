def build_turn_message(farmer_text, current, nxt, attempt: int, max_attempts: int) -> str:
    lines = [
        f"[FARMER SAID] {farmer_text}",
        "[APP CONTEXT]",
        f"current_question_id: {current.id}",
        f"current_question: {current.text}",
        f"attempt: {attempt} of {max_attempts}",
    ]
    if nxt:
        lines += [f"next_question_id: {nxt.id}", f"next_question: {nxt.text}"]
    else:
        lines += ["next_question: none. This was the last question, thank the farmer and close."]
    return "\n".join(lines)