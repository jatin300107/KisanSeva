from configs import GEMINI_API_KEY_1, GEMINI_API_KEY_2, SARVAM_API_KEY
from sarvamai import AsyncSarvamAI


GOOGLE_GENAI_AVAILABLE = bool(GEMINI_API_KEY_1)
OPENAI_AVAILABLE = bool(SARVAM_API_KEY)

genai_client = None
genai_client_2 = None


def get_genai_client():
    global genai_client
    if not GEMINI_API_KEY_1:
        return None
    if genai_client is None:
        try:
            import google.genai as genai
            genai_client = genai.Client(api_key=GEMINI_API_KEY_1)
        except Exception as e:
            print(f"Google GenAI error: {e}")
            genai_client = None
            global GOOGLE_GENAI_AVAILABLE
            GOOGLE_GENAI_AVAILABLE = False
    return genai_client


def get_genai_client_2():
    global genai_client_2
    if not GEMINI_API_KEY_2:
        return None
    if genai_client_2 is None:
        try:
            import google.genai as genai
            genai_client_2 = genai.Client(api_key=GEMINI_API_KEY_2)
        except Exception as e:
            print(f"Google GenAI client 2 error: {e}")
            genai_client_2 = None
    return genai_client_2


def get_sarvam_client():
    if not SARVAM_API_KEY:
        return None
    client = AsyncSarvamAI(api_subscription_key=SARVAM_API_KEY)
    return client