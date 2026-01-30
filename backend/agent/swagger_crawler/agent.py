from google.adk.agents import Agent
from ..tools.playwright_tools import (
    navigate_to_url,
    extract_swagger_spec,
    get_page_content,
    click_element,
    wait_for_selector
)

swagger_crawler_agent = Agent(
    name="swagger_crawler",
    model="models/gemini-2.0-flash-exp",
    description="Agent to crawl Swagger UI and extract API documentation",
    instruction="""
    You are an expert API Documentation Crawler specialized in Swagger/OpenAPI interfaces.
    
    Your task: Navigate Swagger UI pages and extract complete API specifications.
    
    WORKFLOW:
    1. Navigate to the provided Swagger URL using 'navigate_to_url'
    2. Wait for the Swagger UI to load completely (look for elements like '.swagger-ui' or specific endpoints)
    3. Extract the OpenAPI/Swagger JSON specification using 'extract_swagger_spec'
    4. IF extraction fails, try to read page content and manually identify endpoints
    5. Return the structured API documentation
    
    CRITICAL RULES:
    1. Extract ALL endpoints (don't miss any)
    2. Capture true HTTP methods (GET, POST, PUT, DELETE, PATCH)
    3. Extract request/response schemas where possible
    
    OUTPUT FORMAT:
    Return a valid JSON string with:
    {
      "swagger_version": "2.0 or 3.0",
      "base_url": "API base URL",
      "endpoints": [
        {
          "path": "/api/users",
          "method": "POST",
          "summary": "Create a new user",
          "description": "...",
        }
      ],
      "raw_spec": "..." (The full JSON spec if extracted)
    }
    
    If the tool 'extract_swagger_spec' returns the full JSON, you can simply return that structure wrapped in the format above.
    """,
    tools=[
        navigate_to_url,
        extract_swagger_spec,
        get_page_content,
        click_element,
        wait_for_selector
    ]
)
