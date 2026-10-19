from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime
import sys

from backend.ai_pipeline.ai_clients import get_genai_client, get_genai_client_2

genai_client = get_genai_client()
import json
from google import genai
import os
MODEL = "gemini-3.5-flash-lite"  # check this ID in AI Studio, change if needed
MAX_MODEL_CALLS = 60

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])  # reads GEMINI_API_KEY from the environment

# field key -> (your question id, question text)
QUESTIONS = {
    "animal_type": ("a0bd5f13-97dc-4fcc-858a-b781c917d62f", "What type of animal is affected?"),
    "age": ("654f45fb-2c73-4396-bba5-1faba65a6308", "How old is the animal?"),
    "symptoms": ("6e8f2dd0-9d48-4e18-9aad-7562f4366d4d", "What symptoms is the animal showing?"),
    "onset": ("d68ae755-1bf3-48a6-ba8a-d603f09cb8b0", "When did the symptoms first appear?"),
    "eating_drinking": ("672649e1-a58c-4eba-8daa-83cf4f4da569", "Is the animal eating and drinking normally?"),
    "weight_loss": ("86e3a871-4770-4d9b-85f3-637e42923e56", "Has the animal lost weight recently?"),
    "fever_signs": ("bbeace75-2a9d-495e-9486-0ecaad8b4f2e", "Is the animal showing signs of fever? (hot skin, shivering)"),
    "herd_similar": ("c7c23a0e-0895-4f51-bdea-37d4866f4bd9", "Are other animals in the herd showing similar symptoms?"),
    "vaccinated": ("31effa1f-4223-45e2-9e01-8980bee2cd4e", "Has the animal been vaccinated recently?"),
    "stool_urine": ("cd1533ff-c2e6-4384-9902-9de323cf2065", "Any changes in the animal's stool or urine?"),
    "pregnant": ("e188d8b2-315a-4622-ab6f-6441fa306f74", "Is the animal pregnant or recently gave birth?"),
    "new_animal_contact": ("62bedc41-f1f0-43e3-86cf-9c4b136a32ba", "Has the animal been in contact with any new animals recently?"),
}

answers = {}  # field key -> answer string


class Tee:
    def __init__(self, *streams):
        self.streams = streams

    def write(self, text):
        for stream in self.streams:
            stream.write(text)
            stream.flush()
        return len(text)

    def flush(self):
        for stream in self.streams:
            stream.flush()


SUBMIT_ANSWERS_TOOL = {
    "type": "function",
    "name": "submit_answers",
    "description": (
        "Save answers the user has actually given. Call this every time the user's "
        "message answers one or more fields. Returns which fields are still missing."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "answers": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "field": {"type": "string", "enum": list(QUESTIONS.keys())},
                        "answer": {
                            "type": "string",
                            "description": "Short English phrase of what the user said, or 'unknown'.",
                        },
                    },
                    "required": ["field", "answer"],
                },
            }
        },
        "required": ["answers"],
    },
}
TOOLS = [SUBMIT_ANSWERS_TOOL]


def build_instructions() -> str:
    field_list = "\n".join(f"- {key}: {q[1]}" for key, q in QUESTIONS.items())
    return f"""You are an intake assistant for a livestock disease app. Your only job is to
collect the answers to the fields below from a farmer, one question at a time.
The answers go to a veterinarian, so every answer must be exactly what the
farmer said. A wrong answer is worse than "unknown".

The farmer may not be able to read or write. Use short, simple, everyday
words. No medical terms.

Fields:
{field_list}

Running the conversation:
1. Start by asking the farmer, in his own words, what is wrong with the animal.
   Then work through the fields.
2. One message can answer several fields. Record all of them. Never ask again
   for something he already told you.
3. Ask one question at a time. Never put two questions in one turn.
4. After each farmer message, call submit_answers for the fields that message
   answered. Use still_missing from the result to pick the next question.
5. If a field has two parts (for example eating and drinking), ask each part
   separately before moving on.

Recording answers:
6. value: a short English phrase using only what the farmer said. Do not guess,
   infer, or reinterpret. If his answer does not match the question, record
   what he said, not what you think he meant. Example: asked about animals
   brought from outside, he says "only its own calf", so record "only its own
   calf", not "yes".
7. raw_text: his exact words, in his own language.
8. If an answer is unclear, ask once more in different words. If it is still
   unclear, or he says he does not know, record "unknown". Never guess to
   avoid "unknown".
9. If a later message changes or adds to an earlier answer, call submit_answers
   again for that field with the updated value. Keep the symptoms field current
   with everything he has said about the animal's condition, including
   changes (for example "not eating" later becomes "eating a little").
10. Age: always get a number and a unit (months or years). If the unit is
    missing, ask for it, then repeat the age back once to confirm.

Helping the farmer:
11. If he is stuck, give a short hint or one to three examples that cover
    different possible answers so he is not pushed toward one. Only do this
    after he hesitates, not in the first ask. Never hint based on a disease
    you suspect.
12. Do not diagnose, name any disease, or give treatment advice. If he asks
    what is wrong or what to do, say the report at the end will explain, and
    continue.

Language and style:
13. Reply in the language the farmer is using. Your replies are spoken aloud:
    short sentences, no lists, no symbols.

Finishing:
14. When still_missing is empty, say the animal type, age, and main symptoms
    back in one or two sentences and ask if that is correct. Fix anything he
    corrects with submit_answers, then thank him, say the report is being
    prepared, and stop."""


def missing_fields() -> list[str]:
    return [k for k in QUESTIONS if k not in answers]


def handle_submit_answers(args) -> dict:
    if isinstance(args, str):
        args = json.loads(args)
    saved, rejected = [], []
    for item in args.get("answers", []):
        field = item.get("field")
        value = str(item.get("answer", "")).strip()
        if field in QUESTIONS and value:
            answers[field] = value
            saved.append(field)
        else:
            rejected.append(field)
    return {
        "saved": saved,
        "rejected": rejected,
        "still_missing": [{"field": k, "question": QUESTIONS[k][1]} for k in missing_fields()],
    }


def create(input_, prev_id=None):
    kwargs = {"model": MODEL, "input": input_, "tools": TOOLS}
    if prev_id:
        kwargs["previous_interaction_id"] = prev_id
    return client.interactions.create(**kwargs)


def main():
    log_path = os.path.join(os.path.dirname(__file__), "testing_gemini_for_QA.txt")
    with open(log_path, "a", encoding="utf-8") as log_file:
        with redirect_stdout(Tee(sys.stdout, log_file)), redirect_stderr(Tee(sys.stderr, log_file)):
            print("\n==================================================")
            print(f"TEST RUN ({datetime.now():%Y-%m-%d %H:%M:%S})")
            print("==================================================")
            interaction = create(build_instructions() + "\n\nBegin the interview now.")

            for _ in range(MAX_MODEL_CALLS):
                calls = [s for s in interaction.steps if s.type == "function_call"]

                if calls:
                    results = []
                    for step in calls:
                        if step.name == "submit_answers":
                            result = handle_submit_answers(step.arguments)
                        else:
                            result = {"error": f"unknown function {step.name}"}
                        results.append({
                            "type": "function_result",
                            "name": step.name,
                            "call_id": step.id,
                            "result": [{"type": "text", "text": json.dumps(result)}],
                        })
                    if not missing_fields():
                        break  # the code decides the interview is done, not the model
                    interaction = create(results, interaction.id)
                    continue

                print(f"\nAI: {interaction.output_text or ''}\n")
                user_text = input("You: ")
                log_file.write(user_text + "\n")
                log_file.flush()
                user_text = user_text.strip()
                if user_text.lower() in {"quit", "exit"}:
                    break
                interaction = create(user_text, interaction.id)

            final = [
                {"id": QUESTIONS[k][0], "question": QUESTIONS[k][1], "answer": answers.get(k)}
                for k in QUESTIONS
            ]
            print("\nFINAL ANSWERS")
            print(json.dumps(final, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()