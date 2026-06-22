from dotenv import load_dotenv
import os

load_dotenv(dotenv_path='.env')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY_1 = os.getenv("GEMINI_API_KEY_1")
GEMINI_API_KEY_2 = os.getenv("GEMINI_API_KEY_2")
GROK_API_KEY = os.getenv("GROK_API_KEY")