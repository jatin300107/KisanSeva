from backend.exceptions import TranslationError

from sarvamai.core.api_error import ApiError
async def translate(text , current_language , language , client ):
    try: 
        response = await client.translate_text(
                text=text,
                source_language=current_language,
                target_language=language,
                
                model="mayura:v1",
                
                numerals_format="native"
            )
    except ApiError as e:
        raise TranslationError(str(e))
    return response



