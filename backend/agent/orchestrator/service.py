from .agent import orchestrator_agent
from ..swagger_crawler.agent import swagger_crawler_agent
from ..document_analyser.agent import document_analyser
from core.llm import get_active_llm
from core.models import TestCase, Project, Endpoint
from typing import Optional, List, Dict
import json
import asyncio

class OrchestratorService:
    def __init__(self, project_id: str):
        self.project_id = project_id

    async def generate_tests(
        self,
        project_id: str,
        swagger_url: Optional[str] = None,
        manual_context: Optional[str] = None
    ):
        """
        Orchestrate the test generation workflow.
        """
        print(f"Orchestrator started for Project: {project_id}")
        context = {}
        
        # 1. Gather Context
        adapter = await get_active_llm()
        
        # A. Crawl Swagger if provided
        if swagger_url:
            print(f"Crawling Swagger URL: {swagger_url}")
            try:
                crawl_result = await adapter.generate_text(
                    system_prompt=swagger_crawler_agent.instruction,
                    user_prompt=f"Crawl this Swagger URL: {swagger_url}",
                    tools=swagger_crawler_agent.tools
                )
                context['swagger'] = crawl_result
                print("Swagger crawling completed")
            except Exception as e:
                print(f"Swagger crawling failed: {e}")
                context['swagger'] = f"Error crawling Swagger: {str(e)}"
        
        # B. Analyze Documents (always try if project has docs)
        print("Analyzing documents...")
        try:
            # Check if project has docs first? (Optimization)
            # For now, let the agent handle it via list_documents
            doc_result = await adapter.generate_text(
                system_prompt=document_analyser.instruction,
                user_prompt=f"Analyze documents for project ID: {project_id}",
                tools=document_analyser.tools
            )
            context['documents'] = doc_result
            print("Document analysis completed")
        except Exception as e:
            print(f"Document analysis failed: {e}")
            context['documents'] = f"Error analyzing documents: {str(e)}"
            
        # C. Manual Context
        if manual_context:
            context['manual'] = manual_context

        # 2. Determine Strategy & Generate Tests
        # We'll use the orchestrator agent to "decide" but in code we trigger the specialized agents
        # based on the gathered context.
        
        # Combine context for specialized agents
        full_context = f"""
        PROJECT ID: {project_id}
        
        --- MANUAL CONTEXT ---
        {context.get('manual', 'None')}
        
        --- SWAGGER SPECIFICATION ---
        {context.get('swagger', 'None')[:5000]}... [Truncated if too long]
        
        --- DOCUMENT ANALYSIS ---
        {context.get('documents', 'None')}
        """
        
        # 3. Generate Tests (Delegating to ADK Service machinery for now or re-implementing here)
        # To reuse the robust logic in ADK Service, we can call it or implement the loop here.
        # Let's implement a direct generation loop here for clarity and control.
        
        from ..test_generation.functional_agent import functional_agent
        from ..test_generation.validation_agent import validation_agent
        from ..test_generation.security_agent import security_agent
        from ..test_generation.ux_error_agent import ux_error_agent
        
        print("Generating tests with specialized agents...")
        all_tests = []
        
        # Functional (Always)
        try:
            func_res = await adapter.generate_text(
                system_prompt=functional_agent.instruction,
                user_prompt=f"Generate functional tests based on:\n{full_context}"
            )
            all_tests.extend(self._parse_json(func_res, "Functional"))
        except Exception as e:
            print(f"Functional agent failed: {e}")

        # Validation (If Swagger or Docs implies inputs)
        # For simplicity in this plan, we run it. Logic could be more complex.
        try:
            val_res = await adapter.generate_text(
                system_prompt=validation_agent.instruction,
                user_prompt=f"Generate validation tests based on:\n{full_context}"
            )
            all_tests.extend(self._parse_json(val_res, "Validation"))
        except Exception as e:
            print(f"Validation agent failed: {e}")
            
        # Security (If requested or relevant)
        if manual_context and "security" in manual_context.lower():
            try:
                sec_res = await adapter.generate_text(
                    system_prompt=security_agent.instruction,
                    user_prompt=f"Generate security tests based on:\n{full_context}"
                )
                all_tests.extend(self._parse_json(sec_res, "Security"))
            except Exception as e:
                print(f"Security agent failed: {e}")

        # 4. Deduplicate
        unique_tests = self._deduplicate(all_tests)
        print(f"Generated {len(unique_tests)} unique tests")
        
        return unique_tests

    def _parse_json(self, response: str, agent_name: str) -> List[Dict]:
        """Parse JSON response with basic error handling"""
        try:
            # Strip markdown code blocks
            clean = response.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean)
            if isinstance(data, list):
                return data
            return []
        except Exception as e:
            print(f"Error parsing JSON from {agent_name}: {e}")
            print(f"Raw output: {response[:100]}...")
            return []

    def _deduplicate(self, tests: List[Dict]) -> List[Dict]:
        seen = set()
        unique = []
        for t in tests:
            # Key based on title and endpoint
            key = f"{t.get('title')}-{t.get('endpoint_id') or t.get('endpoint')}"
            if key not in seen:
                seen.add(key)
                unique.append(t)
        return unique
