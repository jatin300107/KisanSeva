from backend.configs import GEMINI_API_KEY_1 , GEMINI_API_KEY_2


GOOGLE_GENAI_AVAILABLE = True  
OPENAI_AVAILABLE = True  

genai_client = None
genai_client_2 = None

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

def get_genai_client_2():
    global genai_client_2
    if genai_client_2 is None:
        import google.genai as genai
        genai_client_2 = genai.Client(api_key=GEMINI_API_KEY_2)
    return genai_client_2