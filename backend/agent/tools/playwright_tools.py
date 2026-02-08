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

async def get_expandable_elements() -> str:
    """
    Find ALL expandable elements on the page using universal patterns.
    Works across Swagger UI, ReDoc, custom themes, and any standard web page.
    
    Returns:
        JSON string with list of expandable elements and their coordinates
    """
    try:
        page = await get_page()
        
        js_code = """
        () => {
            const expandable = [];
            const seen = new Set();
            
            // Helper to add element if not already seen
            const addElement = (el, type) => {
                const rect = el.getBoundingClientRect();
                // Only add if visible and not already tracked
                if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight) {
                    const key = `${Math.round(rect.x)},${Math.round(rect.y)}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        expandable.push({
                            type: type,
                            x: Math.round(rect.x + rect.width / 2),
                            y: Math.round(rect.y + rect.height / 2),
                            text: el.innerText?.substring(0, 50) || '',
                            tag: el.tagName.toLowerCase()
                        });
                    }
                }
            };
            
            // 1. ARIA-based (most reliable, works across all sites)
            document.querySelectorAll('[aria-expanded="false"]').forEach(el => {
                addElement(el, 'aria-collapsed');
            });
            
            // 2. HTML5 Details/Summary elements (native collapsible)
            document.querySelectorAll('details:not([open])').forEach(el => {
                const summary = el.querySelector('summary');
                if (summary) addElement(summary, 'details-summary');
            });
            
            // 3. Buttons with expand/show indicators
            document.querySelectorAll('button, [role="button"], .btn').forEach(el => {
                const text = (el.innerText || '').toLowerCase();
                const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
                const title = (el.getAttribute('title') || '').toLowerCase();
                const combined = text + ariaLabel + title;
                
                if (combined.includes('expand') || combined.includes('show more') || 
                    combined.includes('toggle') || text === '+' || text === '▶' || text === '►') {
                    addElement(el, 'expand-button');
                }
            });
            
            // 4. Clickable headers that might be accordions
            document.querySelectorAll('[data-toggle], [data-bs-toggle], .accordion-header, .collapsible').forEach(el => {
                addElement(el, 'data-toggle');
            });
            
            // 5. Common Swagger UI patterns (as fallback, not primary)
            document.querySelectorAll('.opblock:not(.is-open) .opblock-summary').forEach(el => {
                addElement(el, 'swagger-opblock');
            });
            
            // 6. ReDoc patterns
            document.querySelectorAll('[data-section-id]:not(.expanded)').forEach(el => {
                addElement(el, 'redoc-section');
            });
            
            return JSON.stringify({
                count: expandable.length,
                elements: expandable
            });
        }
        """
        
        result = await page.evaluate(js_code)
        return result
        
    except Exception as e:
        return f"Error finding expandable elements: {str(e)}"

async def expand_all_visible_accordions() -> str:
    """
    Automatically expand ALL accordion-like elements on the page.
    Uses universal patterns to work across different documentation frameworks.
    
    Returns:
        Summary of expansion actions taken
    """
    try:
        page = await get_page()
        
        js_code = """
        async () => {
            let expanded = 0;
            let iterations = 0;
            const maxIterations = 5;
            
            const expandElements = () => {
                let count = 0;
                
                // 1. Click ARIA collapsed elements
                document.querySelectorAll('[aria-expanded="false"]').forEach(el => {
                    try { el.click(); count++; } catch(e) {}
                });
                
                // 2. Open HTML5 details elements
                document.querySelectorAll('details:not([open])').forEach(el => {
                    try { el.open = true; count++; } catch(e) {}
                });
                
                // 3. Click Swagger opblocks
                document.querySelectorAll('.opblock:not(.is-open) .opblock-summary').forEach(el => {
                    try { el.click(); count++; } catch(e) {}
                });
                
                // 4. Click ReDoc sections
                document.querySelectorAll('[data-section-id]:not(.expanded) > div:first-child').forEach(el => {
                    try { el.click(); count++; } catch(e) {}
                });
                
                return count;
            };
            
            // Iteratively expand (in case expanding reveals more accordions)
            while (iterations < maxIterations) {
                const newlyExpanded = expandElements();
                expanded += newlyExpanded;
                iterations++;
                
                if (newlyExpanded === 0) break;
                
                // Wait for animations
                await new Promise(r => setTimeout(r, 500));
            }
            
            return `Expanded ${expanded} elements in ${iterations} iterations`;
        }
        """
        
        result = await page.evaluate(js_code)
        await page.wait_for_timeout(1000)  # Final wait for animations
        
        return result
        
    except Exception as e:
        return f"Error expanding accordions: {str(e)}"

async def click_at_coordinates(x: int, y: int) -> str:
    """
    Click at specific screen coordinates.
    Useful for AI-guided clicking when element selectors aren't available.
    
    Args:
        x: X coordinate (pixels from left)
        y: Y coordinate (pixels from top)
        
    Returns:
        Success message or error
    """
    try:
        page = await get_page()
        await page.mouse.click(x, y)
        await page.wait_for_timeout(300)  # Brief wait for any reactions
        return f"Clicked at coordinates ({x}, {y})"
    except Exception as e:
        return f"Error clicking at coordinates: {str(e)}"

async def capture_page_screenshot() -> str:
    """
    Take a screenshot of the current page for AI visual analysis.
    
    Returns:
        Base64 encoded screenshot or path to saved file
    """
    try:
        page = await get_page()
        import base64
        
        # Take full page screenshot as bytes
        screenshot_bytes = await page.screenshot(full_page=False)
        
        # Return as base64 for AI to analyze
        b64_screenshot = base64.b64encode(screenshot_bytes).decode('utf-8')
        
        return f"Screenshot captured. Base64 length: {len(b64_screenshot)} chars. First 100 chars: {b64_screenshot[:100]}..."
        
    except Exception as e:
        return f"Error capturing screenshot: {str(e)}"

async def scroll_page(direction: str = "down", amount: int = 500) -> str:
    """
    Scroll the page to reveal more content.
    
    Args:
        direction: "up" or "down"
        amount: Pixels to scroll
        
    Returns:
        Success message
    """
    try:
        page = await get_page()
        
        if direction.lower() == "down":
            await page.evaluate(f"window.scrollBy(0, {amount})")
        else:
            await page.evaluate(f"window.scrollBy(0, -{amount})")
            
        await page.wait_for_timeout(300)
        return f"Scrolled {direction} by {amount}px"
        
    except Exception as e:
        return f"Error scrolling: {str(e)}"
