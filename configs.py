from dotenv import load_dotenv
import os

from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).parent / '.env')
print(os.environ.get("SARVAM_AI_KEY"))  # add this
path = Path(__file__).parent / '.env'
print(path, path.exists())
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY_1 = os.getenv("GEMINI_API_KEY_1")
GEMINI_API_KEY_2 = os.getenv("GEMINI_API_KEY_2")
GROK_API_KEY = os.getenv("GROK_API_KEY")


SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
if not SARVAM_API_KEY:
    raise ValueError()