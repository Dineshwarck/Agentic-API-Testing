
import os
import asyncio
import httpx
from openai import AsyncOpenAI

async def test_connection():
    print("Testing OpenAI Client init...")
    try:
        # Simulate what we did in llm.py
        client = AsyncOpenAI(
            api_key="sk-test-key",
            http_client=httpx.AsyncClient()
        )
        print("Success: Client initialized.")
        
        # Test if we can make a dummy request (will fail auth but shouldn't crash on init)
        try:
             await client.chat.completions.create(
                 model="gpt-3.5-turbo",
                 messages=[{"role": "user", "content": "hi"}]
             )
        except Exception as e:
            print(f"Request failed as expected (Auth/Net): {e}")
            if "proxies" in str(e):
                print("CRITICAL: Proxies error still present!")
            else:
                print("Pass: No proxy init error.")
                
    except Exception as e:
        print(f"CRITICAL: Init failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_connection())
