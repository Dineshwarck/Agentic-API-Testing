import os
import json
import asyncio
from asgiref.sync import sync_to_async
from django.db import transaction, close_old_connections
from core.llm import get_active_llm

# Import Agents
from agent.document_analyser.agent import document_analyser
from agent.api_test_agent.agent import testing_agent
from core.models import Document
from core.llm import OpenAIAdapter, GeminiAdapter
import pathlib

class AdkService:
    def __init__(self, api_key=None, project_id=None):
        # API Key is now handled by LLMFactory/Provider model
        # But we respect the passed key if avoiding DB?
        # For now, we trust get_active_llm() which checks DB then Env.
        if api_key:
            os.environ["GOOGLE_API_KEY"] = api_key # Fallback compat
            
        self.project_id = project_id
        
    async def analyze_project(self):
        prompt = f"""
        Current Project ID: {self.project_id}
        
        Please analyze the available documents for this project and provide a comprehensive Test Requirement Concept.
        Remember to pass the Project ID '{self.project_id}' when calling your tools.
        """
        
        try:
            adapter = await get_active_llm()
            print(f"Using LLM Adapter: {type(adapter).__name__}")
            
            # Agentic Tool Use (Gemini & OpenAI)
            # OpenAIAdapter now implements manual tool loop!
            response_text = await adapter.generate_text(
                system_prompt=document_analyser.instruction,
                user_prompt=prompt,
                tools=document_analyser.tools
            )
            return response_text
             
        except Exception as e:
            print(f"Analysis Error: {e}")
            return f"Error during analysis: {str(e)}"

    async def generate_test_plan(self, manual_context: str = ""):
        """
        Generate test plan using multi-agent system.
        Coordinator analyzes requirements and activates appropriate specialized agents.
        """
        from agent.test_generation.coordinator import CoordinatorAgent
        from agent.test_generation.functional_agent import functional_agent
        from agent.test_generation.validation_agent import validation_agent
        from agent.test_generation.security_agent import security_agent
        from agent.test_generation.ux_error_agent import ux_error_agent
        
        # 1. Run Analysis
        analysis_result = await self.analyze_project()
        print(f"\n{'='*80}")
        print(f"DEBUG: FULL ANALYSIS RESULT:")
        print(f"{'='*80}")
        print(analysis_result)
        print(f"{'='*80}\n")
        
        # 2. Get endpoints from database
        from core.models import Endpoint
        endpoints_qs = Endpoint.objects.filter(project_id=self.project_id)
        endpoints = []
        async for ep in endpoints_qs:
            endpoints.append({
                'method': ep.method,
                'url': ep.url,
                'id': str(ep.id)
            })
        
        print(f"DEBUG: Found {len(endpoints)} endpoints in database:")
        for ep in endpoints:
            print(f"  - {ep['method']} {ep['url']}")
        
        # 3. Use Coordinator to determine which agents to activate
        coordinator = CoordinatorAgent()
        config = coordinator.analyze_requirements(
            endpoints=endpoints,
            client_requirements=manual_context
        )
        
        print(f"DEBUG: Agent Configuration:")
        print(f"  - Functional: {config.needs_functional}")
        print(f"  - Validation: {config.needs_validation}")
        print(f"  - Security: {config.needs_security}")
        print(f"  - UX/Errors: {config.needs_ux_errors}")
        
        # 4. Build context for agents with EXPLICIT endpoint list
        endpoints_list = "\n".join([f"- {ep['method']} {ep['url']}" for ep in endpoints])
        
        final_context = f"""
        {manual_context}
        
        --- DOCUMENTED ENDPOINTS (GENERATE TESTS ONLY FOR THESE) ---
        {endpoints_list}
        
        --- ANALYSIS OF DOCUMENTS ---
        {analysis_result}
        
        CRITICAL INSTRUCTION:
        Generate test cases ONLY for the endpoints listed in "DOCUMENTED ENDPOINTS" section above.
        DO NOT generate tests for any other endpoints, resources, or APIs.
        Each test case MUST map to one of the documented endpoints (method + URL).
        """
        
        # 5. Generate tests from each activated agent
        all_tests = []
        adapter = await get_active_llm()
        
        try:
            # Functional tests (always)
            if config.needs_functional:
                print("DEBUG: Generating functional tests...")
                prompt = f"Based on the analysis below, generate functional tests.\n\nContext:\n{final_context}"
                functional_output = await adapter.generate_text(
                    system_prompt=functional_agent.instruction,
                    user_prompt=prompt
                )
                functional_tests = self._parse_json_response(functional_output, "Functional")
                all_tests.extend(functional_tests)
            
            # Validation tests
            if config.needs_validation:
                print("DEBUG: Generating validation tests...")
                prompt = f"Based on the analysis below, generate validation tests.\n\nContext:\n{final_context}"
                validation_output = await adapter.generate_text(
                    system_prompt=validation_agent.instruction,
                    user_prompt=prompt
                )
                validation_tests = self._parse_json_response(validation_output, "Validation")
                all_tests.extend(validation_tests)
            
            # Security tests (only if requested)
            if config.needs_security:
                print("DEBUG: Generating security tests...")
                prompt = f"Based on the analysis below, generate security tests.\n\nContext:\n{final_context}"
                security_output = await adapter.generate_text(
                    system_prompt=security_agent.instruction,
                    user_prompt=prompt
                )
                security_tests = self._parse_json_response(security_output, "Security")
                all_tests.extend(security_tests)
            
            # UX/Error message tests
            if config.needs_ux_errors:
                print("DEBUG: Generating UX/error message tests...")
                prompt = f"Based on the analysis below, generate UX error message tests.\n\nContext:\n{final_context}"
                ux_output = await adapter.generate_text(
                    system_prompt=ux_error_agent.instruction,
                    user_prompt=prompt
                )
                ux_tests = self._parse_json_response(ux_output, "UX/Error")
                all_tests.extend(ux_tests)
            
            # 6. Deduplicate and return
            unique_tests = coordinator.deduplicate_tests(all_tests)
            print(f"DEBUG: Total tests generated: {len(all_tests)}, Unique: {len(unique_tests)}")
            
            return unique_tests
                
        except Exception as e:
            print(f"Generation Error: {e}")
            return []
    
    def _parse_json_response(self, response_text: str, agent_name: str) -> list:
        """Parse JSON response from agent, with fallback handling"""
        print(f"\nDEBUG: {agent_name} agent raw output:")
        print(f"{'='*60}")
        print(response_text[:500] if len(response_text) > 500 else response_text)
        print(f"{'='*60}\n")
        
        try:
            content = response_text.replace('```json', '').replace('```', '').strip()
            parsed = json.loads(content)
            print(f"DEBUG: {agent_name} agent generated {len(parsed)} tests")
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError as e:
            print(f"DEBUG: {agent_name} agent JSON decode error: {e}")
            print(f"DEBUG: Attempting fallback parsing...")
            try:
                start = content.find('[')
                end = content.rfind(']') + 1
                if start != -1 and end != -1:
                    parsed = json.loads(content[start:end])
                    print(f"DEBUG: {agent_name} fallback parsed {len(parsed)} tests")
                    return parsed
            except Exception as fallback_error:
                print(f"DEBUG: {agent_name} fallback parsing also failed: {fallback_error}")
            print(f"DEBUG: {agent_name} agent failed to parse JSON, returning empty list")
            return []
        except Exception as e:
            print(f"DEBUG: {agent_name} unexpected error: {e}")
            return []

    async def run_parallel_tests(self, test_cases):
        """
        Executes a list of Test Cases in parallel using isolated Agents.
        """
        results = []
        semaphore = asyncio.Semaphore(5)  # Limit concurrent agents to 5

        # Import locally to avoid circular deps if any
        from agent.api_test_agent.runner_agent import get_test_runner_agent

        async def run_single_case(test_case):
            async with semaphore:
                print(f"Starting Test Case: {test_case.title}")
                
                # 1. Get endpoint details
                try:
                    # Fetch endpoint synchronously from async context
                    endpoint = await sync_to_async(lambda: test_case.endpoint)()
                    endpoint_url = endpoint.url
                    endpoint_method = endpoint.method
                except Exception as e:
                    print(f"Error fetching endpoint: {e}")
                    return {
                        "test_case_id": test_case.id,
                        "status": "ERROR",
                        "output": f"Failed to fetch endpoint details: {str(e)}"
                    }
                
                # 2. Create Enhanced Context with URL and Method
                payload_str = json.dumps(test_case.payload, indent=2)
                if len(payload_str) > 1000:
                    payload_str = payload_str[:1000] + "... [TRUNCATED]"

                context = f"""
Title: {test_case.title}
Description: {test_case.description}

ENDPOINT DETAILS:
- URL: {endpoint_url}
- Method: {endpoint_method}
- Expected Status: {test_case.expected_status}

REQUEST BODY (JSON):
{payload_str}

INSTRUCTIONS:
Use make_http_request with:
- method="{endpoint_method}"
- url="{endpoint_url}"
- body=<the JSON object shown above in REQUEST BODY>
- expected_status={test_case.expected_status}
                """
                
                # 3. Get Agent
                agent = get_test_runner_agent(context)
                
                try:
                    # 4. Get LLM Adapter
                    adapter = await get_active_llm()
                    
                    # 5. Run Agent Loop
                    response_text = await adapter.generate_text(
                        system_prompt=agent.instruction,
                        user_prompt="Execute this test case now.",
                        tools=agent.tools
                    )
                    
                    # 6. Parse Status
                    status = 'FAILED'
                    if "STATUS: PASSED" in response_text:
                        status = 'PASSED'
                    
                    return {
                        "test_case_id": test_case.id,
                        "status": status,
                        "output": response_text
                    }
                    
                except Exception as e:
                    print(f"Error executing case {test_case.id}: {e}")
                    return {
                        "test_case_id": test_case.id,
                        "status": "ERROR",
                        "output": str(e)
                    }
                finally:
                    # No browser cleanup needed for HTTP requests
                    pass

        # Gather results
        tasks = [run_single_case(tc) for tc in test_cases]
        results = await asyncio.gather(*tasks)
        return results

    async def stream_parallel_tests(self, test_cases):
        """
        Executes tests in parallel and YIELDS events (logs, results) as they happen.
        Used for Server-Sent Events (SSE).
        """
        queue = asyncio.Queue()
        semaphore = asyncio.Semaphore(5)
        
        # Import locally
        from agent.api_test_agent.runner_agent import get_test_runner_agent
        
        active_tasks = len(test_cases)
        
        async def run_with_stream(test_case):
            nonlocal active_tasks
            async with semaphore:
                try:
                    # Notify Start
                    await queue.put({"type": "status", "test_case_id": str(test_case.id), "status": "RUNNING"})
                    
                    # Get endpoint details
                    try:
                        endpoint = await sync_to_async(lambda: test_case.endpoint)()
                        endpoint_url = endpoint.url
                        endpoint_method = endpoint.method
                    except Exception as e:
                        await queue.put({
                            "type": "result",
                            "test_case_id": str(test_case.id),
                            "status": "ERROR",
                            "output": f"Failed to fetch endpoint: {str(e)}"
                        })
                        active_tasks -= 1
                        if active_tasks == 0:
                            await queue.put(None)
                        return
                    
                    # Truncate payload
                    payload_str = json.dumps(test_case.payload, indent=2)
                    if len(payload_str) > 500: payload_str = payload_str[:500] + "... [TRUNCATED]"
                    
                    context = f"""
Title: {test_case.title}
Description: {test_case.description}
Endpoint URL: {endpoint_url}
HTTP Method: {endpoint_method}
Payload: {payload_str}
Expected Status: {test_case.expected_status}
                    """
                    
                    agent = get_test_runner_agent(context)
                    adapter = await get_active_llm()
                    
                    # Callback for Live Logs
                    async def on_log_callback(msg):
                        await queue.put({
                            "type": "log", 
                            "test_case_id": str(test_case.id), 
                            "message": msg
                        })
                    
                    response_text = await adapter.generate_text(
                        system_prompt=agent.instruction,
                        user_prompt="Execute this test case now.",
                        tools=agent.tools,
                        on_log=on_log_callback
                    )
                    
                    # Parse Result
                    status = 'FAILED'
                    if "STATUS: PASSED" in response_text:
                        status = 'PASSED'
                        
                    await queue.put({
                        "type": "result",
                        "test_case_id": str(test_case.id),
                        "status": status,
                        "output": response_text
                    })
                    
                except Exception as e:
                    await queue.put({
                        "type": "result",
                        "test_case_id": str(test_case.id),
                        "status": "ERROR",
                        "output": str(e)
                    })
                finally:
                    # No browser cleanup needed for HTTP requests
                    active_tasks -= 1
                    if active_tasks == 0:
                        await queue.put(None) # Sentinel

        # Start Tasks in Background
        for tc in test_cases:
            asyncio.create_task(run_with_stream(tc))
            
        # Yield from Queue
        while True:
            event = await queue.get()
            if event is None:
                break
            yield event

    async def generate_from_swagger(self, swagger_url: str):
        """
        1. Use Metadata crawler to get JSON spec from URL
        2. Parse JSON spec
        3. Create Collections (Tags) + Endpoints + Test Cases in DB
        """
        print(f"DEBUG: Starting Swagger generation for {swagger_url}")
        
        # 1. ARCHITECTURAL FIX: Deterministic "Smart Discovery" Strategy
        # Approach: Avoid AI for standard Swagger/OpenAPI tasks. Use heuristic probing instead.
        import requests
        from urllib.parse import urljoin, urlparse
        from asgiref.sync import sync_to_async

        print(f"DEBUG: Starting Smart Discovery for {swagger_url}")
        
        target_spec_data = None
        
        # Helper for non-blocking requests
        async def fetch_url(url, timeout=5):
            try:
                # Run blocking requests in a thread to avoid freezing the ASGI loop
                return await sync_to_async(requests.get)(url, timeout=timeout)
            except Exception as e:
                print(f"DEBUG: Fetch failed for {url}: {e}")
                return None

        try:
            # A. Try the provided URL directly
            response = await fetch_url(swagger_url, timeout=10)
            
            # If it's already JSON, we are golden
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, dict) and ('openapi' in data or 'swagger' in data):
                        print("DEBUG: URL is directly a valid OpenAPI JSON.")
                        target_spec_data = data
                except:
                    pass
            
            if not target_spec_data and response:
                # It's likely HTML (Swagger UI). Let's probe for the JSON file.
                print("DEBUG: URL is NOT JSON. Probing for spec files...")
                
                # B. Heuristic Probing for standard paths
                # Common patterns: /openapi.json, /swagger.json, /api/docs/json
                base_url = swagger_url.split('?')[0].split('#')[0]
                if base_url.endswith('/'): base_url = base_url[:-1]
                
                # Generate candidate URLs
                candidates = [
                    urljoin(base_url + '/', 'openapi.json'),
                    urljoin(base_url + '/', 'swagger.json'),
                    urljoin(base_url + '/', 'api-docs'),
                    # Try root relative if the user gave a deep doc link like /api/docs
                    f"{urlparse(base_url).scheme}://{urlparse(base_url).netloc}/openapi.json",
                    f"{urlparse(base_url).scheme}://{urlparse(base_url).netloc}/api/openapi.json",
                ]
                
                # Check for 'configUrl' in HTML (Django Ninja / DRF often embedded this)
                html_content = response.text
                import re
                match = re.search(r'url:\s*["\']([^"\']+)["\']', html_content)
                if match:
                    found_path = match.group(1)
                    if not found_path.startswith('http'):
                        candidates.insert(0, urljoin(base_url + '/', found_path))
                    else:
                        candidates.insert(0, found_path)
                
                # Check candidates async
                for candidate in list(dict.fromkeys(candidates)): # Dedupe
                     print(f"DEBUG: Probing {candidate}...")
                     resp = await fetch_url(candidate)
                     if resp and resp.status_code == 200:
                         try:
                             data = resp.json()
                             if 'openapi' in data or 'swagger' in data:
                                 print(f"DEBUG: Found Smart Spec at {candidate}")
                                 target_spec_data = data
                                 break
                         except:
                             pass
        except Exception as e:
            print(f"DEBUG: Smart Discovery Error: {e}")

        # C. If found, process deterministically (No AI)
        if target_spec_data:
            print("DEBUG: Processing spec deterministically (Zero Cost).")
            
            # Convert raw OpenAPI to our internal 'endpoints' list format
            # This replaces the Agent's "extraction" job with accurate code
            endpoints_list = []
            paths = target_spec_data.get('paths', {})
            
            for path, methods in paths.items():
                for method, details in methods.items():
                    if method.lower() not in ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']:
                        continue
                    
                    # Extract Params correctly
                    params = details.get('parameters', [])
                    # Resolve refs? (Simplified for now, assume resolved or raw)
                    
                    # Helper to resolve references (Simple DFS)
                    def resolve_ref(schema_node, root_spec):
                        if not isinstance(schema_node, dict):
                            return schema_node
                        
                        # Handle $ref directly
                        if '$ref' in schema_node:
                            ref_path = schema_node['$ref']
                            # e.g. "#/components/schemas/ProjectCreateSchema"
                            parts = ref_path.replace('#/', '').split('/')
                            current = root_spec
                            try:
                                for part in parts:
                                    current = current.get(part, {})
                                # Recursively resolve the found definition too
                                return resolve_ref(current, root_spec)
                            except:
                                return schema_node # Fallback to raw ref if not found
                        
                        # Handle recursive structures (properties, items)
                        resolved = {}
                        for k, v in schema_node.items():
                            if isinstance(v, dict):
                                resolved[k] = resolve_ref(v, root_spec)
                            elif isinstance(v, list):
                                resolved[k] = [resolve_ref(i, root_spec) for i in v]
                            else:
                                resolved[k] = v
                        return resolved

                    # Extract Body
                    body_schema = {}
                    if 'requestBody' in details:
                        content = details['requestBody'].get('content', {})
                        if 'application/json' in content:
                            raw_schema = content['application/json'].get('schema', {})
                            # Resolve Refs inline
                            body_schema = resolve_ref(raw_schema, target_spec_data)
                    
                    endpoints_list.append({
                        "path": path,
                        "method": method.upper(),
                        "summary": details.get('summary', ''),
                        "description": details.get('description', ''),
                        "parameters": params,
                        "request_body": body_schema,
                        "responses": details.get('responses', {})
                    })
            
            # Safe extraction of base_url
            servers = target_spec_data.get('servers', [])
            spec_base_url = ''
            if servers and isinstance(servers, list) and len(servers) > 0:
                spec_base_url = servers[0].get('url', '')
            
            parsed_data = {
                "base_url": spec_base_url,
                "endpoints": endpoints_list
            }
            
            # Execute Save
            # Execute Save
            return self._execute_save(parsed_data)

        # 2. Fallback: Run the Crawler Agent (Only if Smart Discovery failed)
        print("DEBUG: Smart Discovery failed. Falling back to AI Agent (Costly).")
        from agent.swagger_crawler.agent import swagger_crawler_agent
        
        adapter = await get_active_llm()
        
        # DEBUG: Check what key we are passing
        masked_key = adapter.api_key[:5] + "..." if adapter.api_key else "None"
        print(f"DEBUG: Passing Adapter with Key: {masked_key} to Agent (Type: {type(adapter).__name__})")
        
        # We need to give it the tool to navigate and extract
        prompt = f"Navigate to {swagger_url} and extract the Swagger/OpenAPI specification JSON."
        
        try:
            print("DEBUG: Invoking Swagger Agent...")
            response_text = await adapter.generate_text(
                system_prompt=swagger_crawler_agent.instruction,
                user_prompt=prompt,
                tools=swagger_crawler_agent.tools
            )
            
            # 2. Extract JSON from Agent Response
            # The agent is instructed to return a JSON structure
            print(f"DEBUG: Agent returned {len(response_text)} chars")
            print(f"DEBUG: Agent RAW Response: {response_text}")
            
            parsed_data = {}
            try:
                import re
                
                # 1. Robust Extraction: Look for content inside ```json ... ``` blocks first
                code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
                
                if code_block_match:
                    clean_json = code_block_match.group(1).strip()
                    # Clean comments (// ...)
                    clean_json = re.sub(r'(?m)^\s*//.*$', '', clean_json) 
                    clean_json = re.sub(r'//.*$', '', clean_json, flags=re.MULTILINE)
                    parsed_data = json.loads(clean_json, strict=False)
                else:
                    # 2. No code blocks? Try finding the largest outermost {}
                    # Find first {
                    start = response_text.find('{')
                    # Find LAST }
                    end = response_text.rfind('}') + 1
                    
                    if start != -1 and end != -1:
                         clean_json = response_text[start:end]
                         clean_json = re.sub(r'(?m)^\s*//.*$', '', clean_json)
                         parsed_data = json.loads(clean_json, strict=False)
                         
            except json.JSONDecodeError as jde:
                print(f"DEBUG: JSON Parse Error: {jde}")
                # Last ditch: try to fix common trailing comma errors if we had a near-miss?
                # For now, just logging.
                pass
            
            if not parsed_data:
                 print("DEBUG: Final JSON parse failed.")
            
            if not parsed_data or 'endpoints' not in parsed_data:
                return {
                    "success": False, 
                    "error": "Agent failed to extract structured endpoints",
                    "raw_response": response_text[:500]
                }
                
            # 3. Save to Database (Threading approach for django-tenants)
            return self._execute_save(parsed_data)

        except Exception as e:
            print(f"Swagger Generation Error: {e}")
            return {"success": False, "error": str(e)}

    def _execute_save(self, parsed_data):
        """Helper to run the DB save in a thread (for django-tenants safety)"""
        import threading
        from django.db import connections
        
        result_container = {}
        
        def run_db_save():
            connections.close_all()
            try:
                result_container['stats'] = self._save_swagger_data_sync(parsed_data)
            except Exception as e:
                result_container['error'] = e
            finally:
                connections.close_all()
        
        thread = threading.Thread(target=run_db_save)
        thread.start()
        thread.join()
        
        if 'error' in result_container:
            raise result_container['error']
        
        stats = result_container.get('stats', {})

        return {
            "success": True,
            **stats,
            "count": stats["test_cases_generated"] 
        }

    @transaction.atomic
    def _save_swagger_data_sync(self, parsed_data):
        from core.models import Collection, Endpoint, TestCase
        
        endpoints_data = parsed_data.get('endpoints', [])
        base_url = parsed_data.get('base_url', '')
        
        stats = {
            "collections_created": 0,
            "endpoints_created": 0,
            "test_cases_generated": 0,
            "errors": []
        }
        
        # Group by 'tag' or first segment of path to create collections
        for ep_data in endpoints_data:
            path = ep_data.get('path', '/')
            # Critical Fix: Normalize path. Agent often hallucinates double usage like /api/api/...
            if path.startswith('/api/api/'):
                path = path.replace('/api/api/', '/api/', 1)
            
            method = ep_data.get('method', 'GET').upper()
            summary = ep_data.get('summary', '')
            description = ep_data.get('description', '')
            
            # Determine Collection Name
            collection_name = "General"
            parts = [p for p in path.split('/') if p and not p.startswith('{')]
            if parts:
                collection_name = parts[0].capitalize()
            
            # Create/Get Collection
            collection, created = Collection.objects.get_or_create(
                project_id=self.project_id,
                name=collection_name,
                defaults={"description": f"Imported from Swagger for {collection_name}"}
            )
            if created:
                stats["collections_created"] += 1
            
            # Create/Update Endpoint
            full_url = path 
            
            # Anti-Duplicate Logic:
            # 1. Try to find existing endpoint by URL+Method (ignoring collection)
            # This handles cases where previous run put it in 'Default' and now we put it in 'Projects'
            endpoint = Endpoint.objects.filter(
                project_id=self.project_id,
                method=method,
                url=full_url
            ).first()
            
            if endpoint:
                # Update existing
                endpoint.collection = collection
                endpoint.name = summary or f"{method} {path}"
                endpoint.description = description
                endpoint.headers = {"Content-Type": "application/json"}
                endpoint.body_schema = ep_data.get('request_body') or {}
                # Only overwrite if new spec has content, or merge? safer to overwrite for sync.
                endpoint.response_schema = ep_data.get('responses') or {}
                endpoint.parameters = ep_data.get('parameters') or []
                endpoint.save()
                ep_created = False
            else:
                # Create new
                endpoint = Endpoint.objects.create(
                    project_id=self.project_id,
                    collection=collection,
                    method=method,
                    url=full_url,
                    name=summary or f"{method} {path}",
                    description=description,
                    headers={"Content-Type": "application/json"},
                    auth_config={"type": "inherit"},
                    body_schema=ep_data.get('request_body') or {},
                    response_schema=ep_data.get('responses') or {},
                    parameters=ep_data.get('parameters') or []
                )
                ep_created = True
            
            if ep_created:
                stats["endpoints_created"] += 1
                
        return stats
