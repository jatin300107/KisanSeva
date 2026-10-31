import asyncio
from voice_layer.settings import ProviderSettings
from voice_layer.providers.tts.gnani_tts import GnaniTTS

async def test_tts():
    settings = ProviderSettings()
    print("Gnani URL:", settings.gnani_tts_url)
    print("Gnani API key exists:", bool(settings.gnani_api_key))
    tts = GnaniTTS(settings)
    text = "नमस्ते, आपकी फसल में क्या समस्या है?"
    chunks = 0
    total_bytes = 0
    try:
        async for chunk in tts.synthesize(text, "hi-IN"):
            chunks += 1
            total_bytes += len(chunk)
            print(f"Received chunk {chunks}: {len(chunk)} bytes")
        print(f"SUCCESS: received {chunks} chunks, {total_bytes} bytes")
    except Exception as e:
        print("TTS FAILED:", type(e), e)

if __name__ == "__main__":
    asyncio.run(test_tts())
