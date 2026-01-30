import httpx
import json
from typing import Optional, Dict, Any, Union

async def make_http_request(
    method: str,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    body: Optional[Union[str, Dict[str, Any]]] = None,
    expected_status: int = 200
) -> str:
    """
    Makes an HTTP request to test an API endpoint and returns the result.
    
    Args:
        method: HTTP method to use (GET, POST, PUT, DELETE, PATCH)
        url: Full URL to request (e.g., http://localhost:8001/api/projects)
        headers: Optional HTTP headers as key-value pairs
        body: Optional request body as JSON string or dict (will be sent as JSON)
        expected_status: Expected HTTP status code (default: 200)
    
    Returns:
        String describing the result with status, headers, and body
    """
    try:
        # Debug logging
        print(f"\n=== HTTP REQUEST DEBUG ===")
        print(f"Method: {method}")
        print(f"URL: {url}")
        print(f"Headers: {headers}")
        print(f"Body (raw): {body}")
        print(f"Body type: {type(body)}")
        
        # Parse body if it's a string
        parsed_body = None
        if body:
            if isinstance(body, str):
                try:
                    parsed_body = json.loads(body)
                    print(f"Body (parsed from string): {parsed_body}")
                except json.JSONDecodeError as e:
                    print(f"Failed to parse body as JSON: {e}")
                    return f"STATUS: FAILED - Invalid JSON in body parameter: {e}"
            else:
                parsed_body = body
                print(f"Body (dict): {parsed_body}")
        
        print(f"========================\n")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            kwargs = {}
            if headers:
                kwargs['headers'] = headers
            if parsed_body:
                kwargs['json'] = parsed_body
            
            response = await client.request(method, url, **kwargs)
            
            # Parse response
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            # Check status
            status_match = response.status_code == expected_status
            status_indicator = "✓" if status_match else "✗"
            
            # Explicit status for agent parsing
            status_text = "STATUS: PASSED" if status_match else f"STATUS: FAILED - Status code mismatch"
            
            result = f"""
{status_text}

{status_indicator} HTTP {method} {url}
Status: {response.status_code} (Expected: {expected_status})
Headers: {dict(response.headers)}
Body: {json.dumps(response_data, indent=2) if isinstance(response_data, dict) else response_data}
"""
            return result
            
    except Exception as e:
        return f"STATUS: FAILED - HTTP Request Failed: {str(e)}"


# Export the tool for use in agents (same pattern as playwright_tools)
http_tools = [make_http_request]
