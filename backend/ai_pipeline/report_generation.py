
from fastapi import HTTPException
from .retreival import retrive_disease_data
import json
from backend.exceptions import NoDiseaseDiagnosed , InvalidDiseaseDiagnose , ReportGenerationError
from .helpers import behavioural_context_and_animal_name , gemini_api_call
from google.genai import types , errors

def generate_report(primary_response ,body , gemini_client   ):
    if gemini_client is None:
            raise HTTPException(status_code=503, detail="Google GenAI service is unavailable")
        
    if not primary_response.get("disease_name"):
        raise HTTPException(status_code=404, detail="No disease diagnosed")
    behavioural_context , animal_name =  behavioural_context_and_animal_name(body=body)

    if primary_response.get("confidence", 0) < 0.6:
        raise HTTPException(status_code=422, detail="Confidence too low for a reliable diagnosis")
    try:
        disease_data = retrive_disease_data(disease_data = primary_response.get("disease_name"), animal=animal_name)[0]
    except NoDiseaseDiagnosed:
          raise HTTPException(status_code=404 , detail= "No disease diagnosed")
    except InvalidDiseaseDiagnose:
        raise HTTPException(status_code=404,detail= "Sorry , we lack info regading this particular disease")
    
    
    
    prompt = f"""
                You are a veterinary report generator.

                Based on the diagnosis and disease data below, generate a clear, structured advisory report for a farmer.

                Diagnosed Disease: {primary_response['disease_name']}
                Animal: {disease_data['animal']}
                Severity: {primary_response['severity']}/10
                Confidence: {primary_response['confidence']}

                Disease Information:
                - Symptoms: {disease_data['symptoms']}
                - Treatment: {disease_data['treatment']}
                - Region Notes: {disease_data['region_note']}

                Farmer's Observations:
                {behavioural_context}

                Generate a report with these sections:
                1. Diagnosis Summary
                2. What to do immediately
                3. Treatment plan
                4. Warning signs to watch for
                5. Prevention for other animals
                Respond ONLY in this exact JSON format with no extra text:
                {{
                "title": "...",
                "disease_name": "...",
                "ai_diagnosis": "...",
                "ai_suggestions": "..."

                }}
                

                Write in simple, clear language a farmer can understand. Avoid medical jargon.
                """

    try:
         response = gemini_api_call(prompt= prompt ,gemini_client=gemini_client )
    except errors.APIError as e:
         raise ReportGenerationError(e)
    return response.text

                    
                    
