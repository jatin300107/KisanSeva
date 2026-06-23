import json
from backend.ai_pipeline.ai_clients import get_genai_client
from backend.db import supabase
from fastapi import HTTPException
import google.genai as genai
from google.genai import types
from .retreival import retreive_animal_list
import httpx
def primary_diagnosis(body ,gemini_client = get_genai_client()):

    try:
        if gemini_client is None:
            raise HTTPException(status_code=503, detail="Google GenAI service is unavailable")
        

        
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
        list_of_disease = retreive_animal_list(animal=animal_name)
        

            
        if gemini_client is None:
            raise HTTPException(status_code=503, detail="Google GenAI service is unavailable")

            
        gemini_prompt = f"""
                    You are a veterinary AI assistant.

                    Analyze the image and behavioural observations to identify the most likely disease.

                    Behavioural observations:
                    {behavioural_context}

                    Known diseases for this animal:
                    {list_of_disease}

                    Rules:
                    - Return disease_name exactly as written in the list above
                    - If nothing matches confidently, return null for disease_name

                    Respond ONLY in this exact JSON format with no extra text:
                    {{
                        "visual_description": "...",
                        "disease_name": "exact name from list or null",
                        "severity": 5,
                        "confidence": 0.85
                    }}
                    """
        if body.image_url:
            
            
            img_response = httpx.get(body.image_url)
            img_bytes = img_response.content
            mime_type = img_response.headers.get("content-type", "image/jpeg")
            response = gemini_client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=[
                            types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                            types.Part.from_text(text=gemini_prompt)
                        ]
                    )
        else:
            response = gemini_client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=[
                            
                            types.Part.from_text(text=gemini_prompt)
                        ]
                    )

    except:
        raise 