import asyncio
from backend.db import supabase
from voice_layer.db.voice_repo import VoiceRepo

async def test_flow():
    print("Testing VoiceRepo load_questions...")
    repo = VoiceRepo(supabase)
    try:
        q_animal = await repo.load_questions("livestock", "hi-IN")
        print(f"Livestock (hi-IN) questions count: {len(q_animal)}")
        for q in q_animal:
            print(f"  {q.id}: {q.text}")
    except Exception as e:
        print(f"Error loading livestock questions: {e}")

    try:
        q_crop = await repo.load_questions("crop", "hi-IN")
        print(f"\nCrop (hi-IN) questions count: {len(q_crop)}")
        for q in q_crop:
            print(f"  {q.id}: {q.text}")
    except Exception as e:
        print(f"Error loading crop questions: {e}")

if __name__ == "__main__":
    asyncio.run(test_flow())
