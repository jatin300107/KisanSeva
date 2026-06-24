import json
from backend.ai_pipeline.ai_clients import  genai_client_2
from backend.db import supabase
from fastapi import HTTPException
import google.genai as genai
from google.genai import types ,errors
from .retreival import retreive_animal_list
import httpx
from backend.exceptions import PrimaryDiagnosisError , EmptyGeminiResponse
from .helpers import behavioural_context_and_animal_name , gemini_api_call


def primary_diagnosis(body ,gemini_client ):

    try:
        if gemini_client is None:
            raise HTTPException(status_code=503, detail="Google GenAI service is unavailable")
        

        
       
        behavioural_context , animal_name = behavioural_context_and_animal_name(body)
        
        list_of_disease = retreive_animal_list(animal=animal_name)
        

            
        

            
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
            response = gemini_api_call(body=body , prompt= gemini_prompt ,gemini_client=gemini_client , image_url=body.image_url )
        else:
            response = gemini_api_call( prompt= gemini_prompt ,gemini_client=gemini_client  )
    except errors.APIError as e:
        if e.status_code  == 429:
            gemini_client = genai_client_2
            if body.image_url:
            
            
                response = gemini_api_call( prompt= gemini_prompt ,gemini_client=gemini_client , image_url=body.image_url )
            else:
                response = gemini_api_call( prompt= gemini_prompt ,gemini_client=gemini_client )
        else:
            raise PrimaryDiagnosisError(e)
    if not response.text:
        raise EmptyGeminiResponse()
    raw = response.text.strip().removeprefix("```json").removesuffix("```").strip()
    result = json.loads(raw)
    
    
    return result
    