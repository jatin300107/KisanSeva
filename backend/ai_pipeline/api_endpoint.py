import json , re
from backend.exceptions import TranslationError
from backend.ai_pipeline.translation import translate
from backend.auth.services import get_current_user
from backend.db import supabase
from fastapi import APIRouter, Depends , HTTPException
from pydantic import BaseModel
from.primary_daignosis import primary_diagnosis
from .report_generation import generate_report
from backend.exceptions import ReportGenerationError
from fastapi.concurrency import run_in_threadpool
from .ai_clients import get_genai_client , get_genai_client_2 , get_sarvam_client
ai_router = APIRouter(prefix="/ai", tags=["AI"])








class SubmitReportRequest(BaseModel):
    type: str
    answers: list[dict]
    image_url: str | None = None

@ai_router.post("/reports/submit")
async def submit_report(
    body: SubmitReportRequest,
    current_user=Depends(get_current_user)
):
    try:
     
        primary_response = await run_in_threadpool(primary_diagnosis, body=body , gemini_client= Depends(get_genai_client) )
        report = await run_in_threadpool(generate_report,body=body , primary_response=primary_response , gemini_client = Depends(get_genai_client_2))
        clean_report = re.sub(r"```json|```", "", report).strip()
        try:
            report_data = json.loads(clean_report)
        except json.JSONDecodeError as e:
            raise ReportGenerationError(f"Failed to parse report JSON: {e}")
        report_result = supabase.table("reports").insert({
            "user_id": current_user.id,
            "type": body.type,
            "title": report_data["title"],
            "ai_diagnosis": report_data["ai_diagnosis"],
            "ai_suggestions": report_data["ai_suggestions"],
            "disease_name": report_data["disease_name"],
            "severity": primary_response["severity"],
            "confidence": primary_response["confidence"],
            "status": "generated"
        }).execute()

        report_id = report_result.data[0]["id"]

        
        answer_rows = [
            {
                "report_id": report_id,
                "question_id": a["question_id"],
                "answer": a["answer"]
            }
            for a in body.answers
        ]
        supabase.table("answers").insert(answer_rows).execute()

        
        if body.image_url:
            supabase.table("report_images").insert({
                "report_id": report_id,
                "image_url": body.image_url
            }).execute()


        return {
            "report_id": report_id,
            "title": report_data["title"],
            "disease_name": report_data["disease_name"],
            "ai_diagnosis": report_data["ai_diagnosis"],
            "ai_suggestions": report_data["ai_suggestions"],
            "severity": primary_response["severity"],
            "confidence": primary_response["confidence"],
            "image_url": body.image_url
        }

    except ReportGenerationError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
class TranslateReportRequest(BaseModel):
    
    current_language: str
    target_language: str
    report_id: str

@ai_router.post("/translate/report")
async def translate_text(
    body: TranslateReportRequest,
    client=Depends(get_sarvam_client),
    current_user=Depends(get_current_user)
):
    try:
        language_codes = {
            "Hindi": "hi-IN",
            "Bengali": "bn-IN",
            "Tamil": "ta-IN",
            "Telugu": "te-IN",
            "Gujarati": "gu-IN",
            "Kannada": "kn-IN",
            "Malayalam": "ml-IN",
            "Marathi": "mr-IN",
            "Punjabi": "pa-IN",
            "Odia": "od-IN",
            "English": "en-IN",
        }

        if body.current_language not in language_codes or body.target_language not in language_codes:
            raise HTTPException(status_code=400, detail="Unsupported language. Supported languages are: " + ", ".join(language_codes.keys()))

        report_result = supabase.table("reports")\
            .select("*")\
            .eq("id", body.report_id)\
            .eq("user_id", current_user.id)\
            .single()\
            .execute()

        if not report_result.data:
            raise HTTPException(status_code=404, detail="Report not found")

        report = report_result.data
        delimiter = "<<<SEP>>>"
        combined = f"{report['title']}{delimiter}{report['disease_name']}{delimiter}{report['ai_diagnosis']}{delimiter}{report['ai_suggestions']}"

        if len(combined) <= 1000:
            translated = await translate(combined, language_codes[body.current_language], language_codes[body.target_language], client)
            parts = translated.split(delimiter)
            if len(parts) != 4:
                raise TranslationError("Translation failed: delimiter mangled")
            translated_title, translated_disease_name, translated_ai_diagnosis, translated_ai_suggestions = parts
        else:
            part1 = f"{report['title']}{delimiter}{report['disease_name']}"
            part2 = f"{report['ai_diagnosis']}{delimiter}{report['ai_suggestions']}"

            translated1 = await translate(part1, language_codes[body.current_language], language_codes[body.target_language], client)
            translated2 = await translate(part2, language_codes[body.current_language], language_codes[body.target_language], client)

            parts1 = translated1.split(delimiter)
            parts2 = translated2.split(delimiter)

            if len(parts1) != 2 or len(parts2) != 2:
                raise TranslationError("Translation failed: delimiter mangled")

            translated_title, translated_disease_name = parts1
            translated_ai_diagnosis, translated_ai_suggestions = parts2

    except TranslationError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "report_id": report["id"],
        "translated_title": translated_title,
        "translated_disease_name": translated_disease_name,
        "translated_ai_diagnosis": translated_ai_diagnosis,
        "translated_ai_suggestions": translated_ai_suggestions
    }
    