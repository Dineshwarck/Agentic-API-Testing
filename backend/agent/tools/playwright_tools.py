import os
import json
import asyncio
from typing import Optional
from playwright.async_api import async_playwright, Playwright, Browser, BrowserContext, Page
from django.conf import settings

# Global Playwright session
_playwright: Optional[Playwright] = None
_browser: Optional[Browser] = None
_context: Optional[BrowserContext] = None
_page: Optional[Page] = None

async def get_page() -> Page:
    """Get or create a Playwright page instance"""
    global _playwright, _browser, _context, _page
    
    if _page and not _page.is_closed():
        return _page
        
    try:
        if not _playwright:
            _playwright = await async_playwright().start()
            
        if not _browser:
            # Set to False to see the browser in action
            _browser = await _playwright.chromium.launch(headless=False)
            
        if not _context:
            _context = await _browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
        if not _page or _page.is_closed():
            _page = await _context.new_page()
            
        return _page
        
    except Exception as e:
        print(f"Failed to initialize Playwright: {e}")
        # If specific browser missing, hint user
        if "Executable doesn't exist" in str(e):
             print("HINT: Run 'playwright install' or 'python -m playwright install' in your terminal.")
        raise e

async def close_session():
    """Close the global Playwright session"""
    global _playwright, _browser, _context, _page
    
    if _page:
        await _page.close()
        _page = None
        
    if _context:
        await _context.close()
        _context = None
        
    if _browser:
        await _browser.close()
        _browser = None
        
    if _playwright:
        await _playwright.stop()
        _playwright = None

async def navigate_to_url(url: str) -> str:
    """
    Navigate to a URL using Playwright.
    
    Args:
        url: The URL to navigate to (e.g., Swagger UI URL)
        
    Returns:
        str: Success message or error
    """
    try:
        page = await get_page()
        print(f"Navigating to {url}...")
        
        # Go to URL with timeout
        response = await page.goto(url, wait_until="networkidle", timeout=30000)
        
        # Wait a bit more for JS frameworks if networkidle isn't enough
        await page.wait_for_timeout(2000)
        
        title = await page.title()
        return f"Successfully navigated to {url}. Page Title: {title}"
        
    except Exception as e:
        return f"Error navigating to URL: {str(e)}"

async def extract_swagger_spec() -> str:
    """
    Extract Swagger/OpenAPI specification from the page.
    
    Returns:
        str: JSON specification or error message
    """
    try:
        page = await get_page()
        
        # Robust JS to extract Swagger spec
        js_code = """
        () => {
            try {
                // 1. Try window.ui.spec()
                if (window.ui && typeof window.ui.spec === 'function') {
                    const spec = window.ui.spec();
                    return JSON.stringify(spec);
                }
                
                // 2. Try window.swaggerUi.spec()
                if (window.swaggerUi && typeof window.swaggerUi.spec === 'function') {
                    const spec = window.swaggerUi.spec();
                    return JSON.stringify(spec);
                }
                
                // 3. Try finding Redoc state
                if (window.__REDOC_STATE__) {
                    return JSON.stringify(window.__REDOC_STATE__.spec.data);
                }
                
                // 4. Look for raw JSON in pre tag (common in raw views)
                const pre = document.querySelector('pre');
                if (pre) {
                    try {
                        JSON.parse(pre.innerText);
                        return pre.innerText;
                    } catch (e) {}
                }
                
                // 5. Check for 'swagger-ui' element data attributes or specific script tags?
                // Often specs are loaded via URL, we might interception network requests?
                // For now, sticking to object extraction.
                
                return null;
            } catch (e) {
                return "Error: " + e.toString();
            }
        }
        """
        
        content = await page.evaluate(js_code)
        
        if not content or content == "null" or content == "None":
            # Attempt fallback: Check if there is a link to the JSON?
            # Or try to extract from <script> tags?
            return "Could not find Swagger specification object within the page context. Ensure the page is fully loaded."
            
        return content
        
    except Exception as e:
        return f"Error extracting Swagger spec: {str(e)}"

async def get_page_content() -> str:
    """
    Get the full page content as text.
    
    Returns:
        str: Page text content
    """
    try:
        page = await get_page()
        return await page.evaluate("document.body.innerText")
    except Exception as e:
        return f"Error getting page content: {str(e)}"

async def click_element(selector: str) -> str:
    """
    Click an element on the page.
    
    Args:
        selector: CSS selector
    """
    try:
        page = await get_page()
        await page.click(selector)
        return f"Clicked element: {selector}"
    except Exception as e:
        return f"Error clicking element: {str(e)}"

async def wait_for_selector(selector: str, timeout: int = 5000) -> str:
    """
    Wait for an element to appear.
    """
    try:
        page = await get_page()
        try:
            await page.wait_for_selector(selector, state="visible", timeout=timeout)
            return "Element found"
        except:
            return "Element timeout"
    except Exception as e:
        return f"Error waiting for element: {str(e)}"
