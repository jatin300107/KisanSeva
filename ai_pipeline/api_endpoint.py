import json , re
from configs import GEMINI_API_KEY_1 , GEMINI_API_KEY_2 , GROK_API_KEY
from auth.services import get_current_user
from db import supabase
from fastapi import APIRouter, Depends , HTTPException
from pydantic import BaseModel

ai_router = APIRouter(prefix="/ai", tags=["AI"])

# AI libraries - import lazily inside functions
GOOGLE_GENAI_AVAILABLE = True  # Assume available, will be tested when used
OPENAI_AVAILABLE = True  # Assume available, will be tested when used

# Initialize clients lazily
genai_client = None
grok_client = None

def get_genai_client():
    global genai_client
    if genai_client is None:
        try:
            import google.genai as genai
            from google.genai import types
            genai_client = genai.Client(api_key=GEMINI_API_KEY_1)
        except Exception as e:
            print(f"Google GenAI error: {e}")
            genai_client = None
            global GOOGLE_GENAI_AVAILABLE
            GOOGLE_GENAI_AVAILABLE = False
    return genai_client

def get_grok_client():
    global grok_client
    if grok_client is None:
        try:
            from openai import OpenAI
            grok_client = OpenAI(
                api_key=GROK_API_KEY,
                base_url="https://api.x.ai/v1"
            )
        except Exception as e:
            print(f"OpenAI error: {e}")
            grok_client = None
            global OPENAI_AVAILABLE
            OPENAI_AVAILABLE = False
    return grok_client

# Initialize clients lazily
genai_client = None
grok_client = None

def get_genai_client():
    global genai_client
    if genai_client is None and GOOGLE_GENAI_AVAILABLE:
        genai_client = genai.Client(api_key=GEMINI_API_KEY_1)
    return genai_client

def get_grok_client():
    global grok_client
    if grok_client is None and OPENAI_AVAILABLE:
        grok_client = OpenAI(
            api_key=GROK_API_KEY,
            base_url="https://api.x.ai/v1"
        )
    return grok_client

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
        # Check if AI libraries are available
        if not GOOGLE_GENAI_AVAILABLE or not OPENAI_AVAILABLE:
            raise HTTPException(status_code=503, detail="AI services are currently unavailable. Please try again later.")

        # ── Step 1: Fetch question texts ──────────────────────────────────
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

        # ── Step 2: Gemini 2.5 Flash Lite ────────────────────────────────
        if body.image_url:
            # download image bytes from Supabase public URL
            import httpx
            img_response = httpx.get(body.image_url)
            img_bytes = img_response.content
            mime_type = img_response.headers.get("content-type", "image/jpeg")

            gemini_client = get_genai_client()
            if gemini_client is None:
                raise HTTPException(status_code=503, detail="Google GenAI service is unavailable")

            import google.genai as genai
            from google.genai import types

            gemini_prompt = f"""
You are an agricultural/veterinary AI assistant.
Analyze this image and the behavioural context below.

Behavioural observations:
{behavioural_context}

Provide:
1. A detailed visual description of what you observe
2. Possible disease or condition
3. Severity estimate (1-10)
4. Confidence level (0.0 to 1.0)

Respond ONLY in this exact JSON format with no extra text:
{{
  "visual_description": "...",
  "possible_disease": "...",
  "severity": 5,
  "confidence": 0.85
}}
"""
            gemini_response = gemini_client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=[
                    types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                    types.Part.from_text(text=gemini_prompt)
                ]
            )
        else:
            gemini_client = get_genai_client()
            if gemini_client is None:
                raise HTTPException(status_code=503, detail="Google GenAI service is unavailable")

            import google.genai as genai
            from google.genai import types

            gemini_prompt = f"""
You are an agricultural/veterinary AI assistant.
No image was provided. Based only on these behavioural observations:

{behavioural_context}

Provide:
1. Possible disease or condition
2. Severity estimate (1-10)
3. Confidence level (0.0 to 1.0)

Respond ONLY in this exact JSON format with no extra text:
{{
  "visual_description": "No image provided",
  "possible_disease": "...",
  "severity": 5,
  "confidence": 0.6
}}
"""
            gemini_response = gemini_client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=[types.Part.from_text(text=gemini_prompt)]
            )
        if not gemini_response:
            raise HTTPException(status_code=500, detail="Gemini API error")
        raw_gemini = gemini_response.text
        clean_gemini = re.sub(r"```json|```", "", raw_gemini).strip()
        gemini_data = json.loads(clean_gemini)

        # ── Step 3: Grok final report ─────────────────────────────────────
        grok_client = get_grok_client()
        if grok_client is None:
            raise HTTPException(status_code=503, detail="Grok AI service is unavailable")

        grok_prompt = f"""
You are an expert agricultural and veterinary diagnostician.

Farmer's behavioural observations:
{behavioural_context}

AI image analysis:
- Visual description: {gemini_data['visual_description']}
- Suspected disease: {gemini_data['possible_disease']}
- Severity: {gemini_data['severity']}/10
- Confidence: {gemini_data['confidence']}

Generate a complete diagnostic report.

Respond ONLY in this exact JSON format with no extra text:
{{
  "title": "...",
  "disease_name": "...",
  "ai_diagnosis": "...",
  "ai_suggestions": "..."
}}
"""
        grok_response = grok_client.chat.completions.create(
            model="grok-3",
            messages=[{"role": "user", "content": grok_prompt}]
        )
        if not grok_response:
            raise HTTPException(status_code=500, detail="Grok API error")
        raw_grok = grok_response.choices[0].message.content
        
        clean_grok = re.sub(r"```json|```", "", raw_grok).strip()
        grok_data = json.loads(clean_grok)

        # ── Step 4: Insert report ─────────────────────────────────────────
        report_result = supabase.table("reports").insert({
            "user_id": current_user["id"],
            "type": body.type,
            "title": grok_data["title"],
            "ai_diagnosis": grok_data["ai_diagnosis"],
            "ai_suggestions": grok_data["ai_suggestions"],
            "disease_name": grok_data["disease_name"],
            "severity": gemini_data["severity"],
            "confidence": gemini_data["confidence"],
            "status": "generated"
        }).execute()

        report_id = report_result.data[0]["id"]

        # ── Step 5: Insert answers ────────────────────────────────────────
        answer_rows = [
            {
                "report_id": report_id,
                "question_id": a["question_id"],
                "answer": a["answer"]
            }
            for a in body.answers
        ]
        supabase.table("answers").insert(answer_rows).execute()

        # ── Step 6: Link image ────────────────────────────────────────────
        if body.image_url:
            supabase.table("report_images").insert({
                "report_id": report_id,
                "image_url": body.image_url
            }).execute()

        # ── Step 7: Return ────────────────────────────────────────────────
        return {
            "report_id": report_id,
            "title": grok_data["title"],
            "disease_name": grok_data["disease_name"],
            "ai_diagnosis": grok_data["ai_diagnosis"],
            "ai_suggestions": grok_data["ai_suggestions"],
            "severity": gemini_data["severity"],
            "confidence": gemini_data["confidence"],
            "image_url": body.image_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))