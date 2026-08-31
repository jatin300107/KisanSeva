# KisanSeva 🌾

AI-powered crop disease and livestock health diagnosis for farmers. Built in 4 days for **IdealabX 2.0**.

**Live Demo:** https://kisan-seva-gilt.vercel.app/ (frontend)
**Backend API:** [your Render URL]
**GitHub:** https://github.com/jatin300107/KisanSeva

---

## The Problem

A farmer notices unusual spots on his wheat crop. The nearest agricultural expert is hours away. By the time he gets an answer, the disease has spread. This is the daily reality for millions of farmers in India who have no fast, affordable access to agricultural expertise.

KisanSeva puts an AI agronomist in their pocket.

---

## What It Does

- Upload a photo of an affected crop or describe livestock symptoms via a guided form
- Stage 1: Gemini multimodal model classifies the input against a fixed, database-backed disease vocabulary — not free-form generation, so diagnoses stay grounded in known conditions
- Stage 2: A second model generates the full report (severity score, confidence, treatment recommendations), grounded on the Stage 1 classification
- Farmers can request expert consultation directly from their report
- Experts review and respond through a separate dashboard

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python), deployed on Render |
| AI | Gemini 2.5 Flash (multimodal) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| Frontend | React + vite, deployed on Vercel |

---

## Features

- Three-role RBAC: Farmer, Expert, Admin
- Multimodal AI diagnosis — accepts both image and text input
- Severity scoring (1–10) and confidence percentage per diagnosis
- Expert consultation request system with response tracking
- Report history with full diagnosis details

---

## Project Structure

```
KisanSeva/
├── main.py               # FastAPI app entry point
├── configs.py            # Environment config
├── db.py                 # Supabase client setup
├── auth/                 # Auth routes (login, signup, /me)
├── farmer/               # Farmer routes (reports, images, consultations)
├── ai_pipeline/          # Gemini integration and prompt logic
├── frontend.html         # Single-page frontend (all roles)
└── requirements.txt
```

---
## Engineering Notes
- Diagnosed and fixed a critical bug where a shared Supabase client was mutating the Authorization header globally during auth calls, silently poisoning data queries. Fixed by splitting into dedicated auth_client and data_client with explicit RLS policies.

## Setup

### Prerequisites
- Python 3.10+
- Supabase project with tables: `users`, `reports`, `report_answers`, `report_images`, `consultations`, `questions`
- Google Gemini API key

### Installation

```bash
git clone https://github.com/jatin300107/KisanSeva
cd KisanSeva
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your_jwt_secret
```

### Run locally
bash uvicorn main:app --reload
```
### Or just use the live deployment
(https://kisan-seva-gilt.vercel.app/)

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Get current user |
| POST | `/ai/reports/submit` | Submit diagnosis request |
| GET | `/farmer/reports` | Get farmer's reports |
| GET | `/farmer/reports/{id}` | Get report detail |
| POST | `/farmer/reports/{id}/images` | Upload report image |
| POST | `/farmer/reports/{id}/consultations` | Request expert consultation |
| GET | `/expert/consultations` | Get assigned consultations |
| PUT | `/expert/consultations/{id}/respond` | Submit expert response |

---

## Built At

**IdealabX 2.0** — built and deployed  as a hackathon/ideathon submission.
