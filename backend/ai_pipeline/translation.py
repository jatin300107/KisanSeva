from backend.exceptions import TranslationError
from fastapi.concurrency import run_in_threadpool
from sarvamai.core.api_error import ApiError
async def translate(text , current_language , language , client ):
    try: 
        response = await client.text.translate(
                input=text,
                source_language_code=current_language,
                target_language_code=language,
                
                model="mayura:v1",
                
                numerals_format="native"
            )
    except ApiError as e:
        raise TranslationError(str(e))
    return response



