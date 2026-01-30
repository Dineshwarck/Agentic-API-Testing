
from google.adk.agents import Agent
from ..tools.http_tools import http_tools

def get_test_runner_agent(context: str = "") -> Agent:
    return Agent(
        name="api_test_runner",
        model="models/gemini-2.0-flash-exp",
        description="Agent that executes API test cases using HTTP requests.",
        instruction=f"""
You are an API Testing Agent. Execute the SINGLE API Test Case below using HTTP requests.

Test Case Context:
{context}

Protocol:
1. **Extract the REQUEST BODY (JSON)** from the context above - it's shown as a JSON object
2. **Call make_http_request** with these EXACT parameters:
   - method: The Method from ENDPOINT DETAILS (as a string, e.g., "POST")
   - url: The URL from ENDPOINT DETAILS (as a string)
   - body: The REQUEST BODY as a JSON STRING (convert the JSON object to a string)
   - expected_status: The Expected Status from ENDPOINT DETAILS (as an integer)

3. **Verify** the response and output:
   - "STATUS: PASSED" if status matches AND response is valid
   - "STATUS: FAILED - [Reason]" if there's any issue

CRITICAL EXAMPLES:

If REQUEST BODY shows:
{{
  "name": "Test Project",
  "description": "Test"
}}

You MUST call:
make_http_request(
    method="POST",
    url="http://localhost:8001/api/projects",
    body='{{"name": "Test Project", "description": "Test"}}',
    expected_status=200
)

Note: The body parameter is a JSON STRING (wrapped in quotes), not a dict object.
        """,
        tools=http_tools
    )
