import json , re
from backend.configs import GEMINI_API_KEY_1 , GEMINI_API_KEY_2 , GROK_API_KEY
from backend.auth.services import get_current_user
from backend.db import supabase
from fastapi import APIRouter, Depends , HTTPException
from pydantic import BaseModel
from.primary_daignosis import primary_diagnosis
from .report_generation import generate_report
from backend.exceptions import ReportGenerationError
from fastapi.concurrency import run_in_threadpool
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
     
        primary_response = await run_in_threadpool(primary_diagnosis, body=body)
        report = await run_in_threadpool(generate_report,body=body , primary_response=primary_response)
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