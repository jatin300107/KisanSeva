from backend.db import supabase
import httpx
from google.genai import types
def behavioural_context_and_animal_name(body):
    question_ids = [a["question_id"] for a in body.answers]
    questions_result = supabase.table("questions")\
                .select("id, question")\
                .in_("id", question_ids)\
                .execute()

    q_map = {q["id"]: q["question"] for q in questions_result.data}
    behavioural_context = "\n".join([
                f"Q: {q_map.get(a['question_id'], 'Unknown')}\nA: {a['answer']}"
                for a in body.answers
            ])
    q_id = next((k for k, v in q_map.items() if v == "What type of animal is affected?"), None)
    animal_name = next((a["answer"] for a in body.answers if a["question_id"] == q_id), None)
    return behavioural_context , animal_name

def gemini_api_call( gemini_client ,prompt , image_url = None):
    if image_url:

        img_response = httpx.get(image_url)
        img_bytes = img_response.content
        mime_type = img_response.headers.get("content-type", "image/jpeg")
        response = gemini_client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=[
                            types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                            types.Part.from_text(text=prompt)
                        ]
                    )
    else:
        response = gemini_client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=[
                            
                            types.Part.from_text(text=prompt)
                        ]
                    )
    return response
