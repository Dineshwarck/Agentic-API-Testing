
import requests
import sys

base_url = "http://localhost:8001"
paths = [
    "/api/openapi.json",
    "/openapi.json",
    "/api/docs/openapi.json",
    "/swagger.json",
    "/api/swagger.json",
    "/api/v1/openapi.json",
    "/docs/openapi.json"
]

print(f"Probing {base_url}...")

found = False
for p in paths:
    url = base_url + p
    try:
        print(f"Checking {url}...", end="")
        resp = requests.get(url, timeout=2)
        print(f" Status: {resp.status_code}")
        if resp.status_code == 200:
            try:
                data = resp.json()
                if 'openapi' in data or 'swagger' in data:
                    print(f"\n✅ FOUND VALID SPEC AT: {url}")
                    found = True
                    break
            except:
                print(" (Not JSON)")
    except Exception as e:
        print(f" Error: {e}")

if not found:
    print("\n❌ Could not find spec. Checking /api/docs HTML content...")
    try:
        resp = requests.get(base_url + "/api/docs")
        print(f"Docs Page Status: {resp.status_code}")
        if resp.status_code == 200:
            print("Docs Page Content Preview:")
            print(resp.text[:500])
    except:
        pass
