from fastapi import APIRouter , UploadFile , File , HTTPException , Depends
from auth.services import get_current_user
import uuid
from db import supabase
from typing import Optional
from pydantic import BaseModel
farmer = APIRouter(prefix="/farmer", tags=["Farmer"])





@farmer.post("/reports/{report_id}/images")
async def upload_image(
    report_id: str,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    try:
        # 🔹 Step 1: Generate unique filename
        file_ext = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"

        # 🔹 Step 2: Read file
        file_bytes = await file.read()

        # 🔹 Step 3: Upload to Supabase Storage
        supabase.storage.from_("reports").upload(
            path=file_name,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )

        # 🔹 Step 4: Get public URL
        public_url = supabase.storage.from_("reports").get_public_url(file_name)

        # 🔹 Step 5: Save in DB
        supabase.table("report_images").insert({
            "report_id": report_id,
            "image_url": public_url
        }).execute()

        return {
            "message": "Image uploaded",
            "image_url": public_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@farmer.get("/reports")
async def get_reports(current_user=Depends(get_current_user)):
    try:
        result = supabase.table("reports")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("created_at", desc=True)\
            .execute()

        return {"reports": result.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@farmer.get("/reports/{report_id}")
async def get_report(report_id: str, current_user=Depends(get_current_user)):
    try:
        # ── Step 1: Fetch report and verify ownership ─────────────────────
        report_result = supabase.table("reports")\
            .select("*")\
            .eq("id", report_id)\
            .eq("user_id", current_user.id)\
            .single()\
            .execute()

        if not report_result.data:
            raise HTTPException(status_code=404, detail="Report not found")

        report = report_result.data

        # ── Step 2: Fetch answers with question text ──────────────────────
        answers_result = supabase.table("answers")\
            .select("id, answer, question_id, questions(question, type)")\
            .eq("report_id", report_id)\
            .execute()

        # ── Step 3: Fetch images ──────────────────────────────────────────
        images_result = supabase.table("report_images")\
            .select("id, image_url, created_at")\
            .eq("report_id", report_id)\
            .execute()

        # ── Step 4: Fetch consultations if any ───────────────────────────
        consultations_result = supabase.table("consultations")\
            .select("id, message, response, status, created_at")\
            .eq("report_id", report_id)\
            .execute()

        return {
            "report": report,
            "answers": answers_result.data,
            "images": images_result.data,
            "consultations": consultations_result.data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class ConsultationRequest(BaseModel):
    message: str
    expert_id: str  # farmer picks which vet/agrologist to consult


# ── Farmer: request a consultation ───────────────────────────────────────────
@farmer.post("/reports/{report_id}/consultations")
async def request_consultation(
    report_id: str,
    body: ConsultationRequest,
    current_user=Depends(get_current_user)
):
    try:
        # Step 1: Verify report belongs to farmer
        report_result = supabase.table("reports")\
            .select("id")\
            .eq("id", report_id)\
            .eq("user_id", current_user.id)\
            .single()\
            .execute()

        if not report_result.data:
            raise HTTPException(status_code=404, detail="Report not found")

        # Step 2: Verify expert exists and has correct role
        expert_result = supabase.table("users")\
            .select("id, role")\
            .eq("id", body.expert_id)\
            .single()\
            .execute()

        if not expert_result.data:
            raise HTTPException(status_code=404, detail="Expert not found")

        if expert_result.data["role"] not in ["vet", "agrologist"]:
            raise HTTPException(status_code=400, detail="Selected user is not an expert")

        # Step 3: Insert consultation
        result = supabase.table("consultations").insert({
            "report_id": report_id,
            "farmer_id": current_user.id,
            "expert_id": body.expert_id,
            "message": body.message,
            "status": "pending"
        }).execute()

        return {
            "message": "Consultation requested",
            "consultation_id": result.data[0]["id"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))






expert = APIRouter(prefix="/expert", tags=["Expert"])

# ── Expert: list pending consultations ────────────────────────────────────────
@expert.get("/consultations")
async def get_consultations(
    status: Optional[str] = None,  # ?status=pending or ?status=answered
    current_user=Depends(get_current_user)
):
    try:
        # Verify current user is actually an expert
        user_result = supabase.table("users")\
            .select("role")\
            .eq("id", current_user.id)\
            .single()\
            .execute()

        if user_result.data["role"] not in ["vet", "agrologist"]:
            raise HTTPException(status_code=403, detail="Access denied")

        query = supabase.table("consultations")\
            .select("""
                id, message, response, status, created_at,
                reports(id, title, type, disease_name, severity),
                users!consultations_farmer_id_fkey(id, name, phone)
            """)\
            .eq("expert_id", current_user.id)\
            .order("created_at", desc=True)

        if status:
            query = query.eq("status", status)

        result = query.execute()

        return {"consultations": result.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Expert: respond to a consultation ────────────────────────────────────────
@expert.put("/consultations/{consultation_id}/respond")
async def respond_consultation(
    consultation_id: str,
    body: dict,  # {"response": "..."}
    current_user=Depends(get_current_user)
):
    try:
        # Step 1: Verify consultation belongs to this expert
        consultation_result = supabase.table("consultations")\
            .select("id, status")\
            .eq("id", consultation_id)\
            .eq("expert_id", current_user.id)\
            .single()\
            .execute()

        if not consultation_result.data:
            raise HTTPException(status_code=404, detail="Consultation not found")

        if consultation_result.data["status"] == "answered":
            raise HTTPException(status_code=400, detail="Already responded to this consultation")

        # Step 2: Update with response
        result = supabase.table("consultations").update({
            "response": body["response"],
            "status": "answered"
        }).eq("id", consultation_id).execute()

        return {
            "message": "Response submitted",
            "consultation_id": consultation_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Bonus: farmer lists all experts to pick from ──────────────────────────────
@farmer.get("/experts")
async def get_experts(
    role: Optional[str] = None,  # ?role=vet or ?role=agrologist
    current_user=Depends(get_current_user)
):
    try:
        query = supabase.table("users")\
            .select("id, name, phone, role")\
            .in_("role", ["vet", "agrologist"])

        if role:
            query = query.eq("role", role)

        result = query.execute()

        return {"experts": result.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@farmer.get("/questions")
async def get_questions(
    type: str,  # ?type=crop or ?type=livestock
    current_user=Depends(get_current_user)
):
    try:
        if type not in ["crop", "livestock"]:
            raise HTTPException(status_code=400, detail="type must be 'crop' or 'livestock'")

        result = supabase.table("questions")\
            .select("id, question")\
            .eq("type", type)\
            .execute()

        return {"questions": result.data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))