
import requests

url = "http://localhost:8001/api/agent/generate-specs/e84f72d1-5aa9-4c70-bdbc-0538df0add5f"
try:
    print(f"Triggering {url}...")
    resp = requests.post(url, json={})
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
