import httpx
import time
from typing import Dict, Any, Optional, List, Union
import json
import pandas as pd
import io
from asgiref.sync import sync_to_async
from ..models import TestCase, TestResult, TestRun, Project, BulkTestRun, TestData

class ExecutionService:
    @staticmethod
    async def execute_request(
        method: str,
        url: str,
        headers: Dict[str, str] = None,
        params: Dict[str, str] = None,
        body: Any = None
    ) -> Dict[str, Any]:
        """
        Execute a raw HTTP request and return the detailed result.
        Used for the Collections Explorer (manual testing).
        """
        if headers is None:
            headers = {}
        if params is None:
            params = {}
            
        # Ensure Content-Type if body is present
        if body and "Content-Type" not in headers:
            headers["Content-Type"] = "application/json"
            
        start_time = time.time()
        
        try:
            print(f"DEBUG: EXECUTE_REQUEST: {method} {url}")
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=body if body else None,
                    timeout=30.0
                )
                
                duration_ms = (time.time() - start_time) * 1000
                
                # Try to parse JSON response
                try:
                    response_data = response.json()
                except json.JSONDecodeError:
                    response_data = response.text
                
                return {
                    "status": response.status_code,
                    "status_text": response.reason_phrase,
                    "headers": dict(response.headers),
                    "data": response_data,
                    "size": len(response.content),
                    "time": round(duration_ms, 2)
                }
                
        except httpx.RequestError as e:
            duration_ms = (time.time() - start_time) * 1000
            return {
                "status": 0,
                "status_text": "Connection Error",
                "headers": {},
                "data": {"error": str(e)},
                "size": 0,
                "time": round(duration_ms, 2)
            }
        except Exception as e:
             return {
                "status": 0,
                "status_text": "Internal Error",
                "headers": {},
                "data": {"error": f"Execution failed: {str(e)}"},
                "size": 0,
                "time": 0
            }

    @staticmethod
    async def _load_test_data(test_data_id: str) -> List[Dict[str, Any]]:
        """Load test data from file into list of dicts"""
        test_data = await TestData.objects.aget(id=test_data_id)
        file_path = test_data.file.path
        
        def read_file():
            if test_data.file_type == 'csv':
                df = pd.read_csv(file_path)
                return df.to_dict('records')
            elif test_data.file_type == 'json':
                with open(file_path, 'r') as f:
                    return json.load(f)
            return []

        return await sync_to_async(read_file)()

    @staticmethod
    def _substitute_variables(content: Any, context: Dict[str, Any]) -> Any:
        """Recursively substitute variables {{ key }} in content"""
        if isinstance(content, str):
            for key, value in context.items():
                if f"{{{{ {key} }}}}" in content:
                    content = content.replace(f"{{{{ {key} }}}}", str(value))
                if f"{{{{{key}}}}}" in content:
                    content = content.replace(f"{{{{{key}}}}}", str(value))
            return content
        elif isinstance(content, dict):
            return {k: ExecutionService._substitute_variables(v, context) for k, v in content.items()}
        elif isinstance(content, list):
            return [ExecutionService._substitute_variables(item, context) for item in content]
        return content
    @staticmethod
    async def create_run(project_id: str):
        """Create a new TestRun entry"""
        # If no specific IDs, get all for project (logic to be refined)
        # For now assuming explicit list or running all
        
        run = await TestRun.objects.acreate(
            project_id=project_id,
            status='RUNNING'
        )
        return run



    @staticmethod
    async def execute_test_case(test_case: TestCase, test_run: TestRun, context: Dict[str, Any] = None, iteration_index: int = 0) -> TestResult:
        """
        Execute a saved test case and save the result.
        """
        # Prepare request
        endpoint = await sync_to_async(lambda: test_case.endpoint)()
        
        # Merge headers (Endpoint + Test Case override if any - future improvement)
        headers = endpoint.headers.copy()
        
        # Substitute variables if context provided
        payload = test_case.payload
        if context:
            payload = ExecutionService._substitute_variables(payload, context)
            headers = ExecutionService._substitute_variables(headers, context)
        
        # Resolve full URL (endpoints may store relative paths like /api/projects)
        url = endpoint.url
        if not url.startswith('http'):
            # Try to get base URL from project environment
            base_url = 'http://localhost:8001'  # Default fallback
            try:
                project = await sync_to_async(lambda: endpoint.project)()
                envs = await sync_to_async(list)(project.environments.all())
                for env in envs:
                    if env.variables and isinstance(env.variables, dict):
                        env_base = env.variables.get('base_url') or env.variables.get('BASE_URL')
                        if env_base:
                            base_url = env_base.rstrip('/')
                            break
            except Exception:
                pass
            url = f"{base_url}{url}"
            print(f"[EXEC] Resolved URL: {url}")
        
        # Execute
        result_data = await ExecutionService.execute_request(
            method=endpoint.method,
            url=url,
            headers=headers,
            body=payload
        )
        
        # Determine Pass/Fail directly here or delegate?
        # Simple check: Status code
        passed = result_data['status'] == test_case.expected_status
        
        # Save Result
        test_result = await TestResult.objects.acreate(
            test_run=test_run,
            test_case=test_case,
            status='COMPLETED',
            passed=passed,
            status_code=result_data['status'],
            response_body=result_data['data'] if isinstance(result_data['data'], (dict, list)) else {'raw': str(result_data['data'])},
            headers=result_data['headers'],
            duration_ms=int(result_data['time'])
        )
        
        return test_result

    @staticmethod
    async def execute_workspace_tests(
        project: Project,
        parallel: bool = True,
        max_workers: int = 5,
        test_data_id: str = None
    ) -> BulkTestRun:
        """
        Execute all test cases in a workspace (project).
        Returns the BulkTestRun tracking object.
        """
        # Create bulk run record
        test_cases = await sync_to_async(list)(TestCase.objects.filter(
            endpoint__project=project,
            status__in=['DRAFT', 'APPROVED']
        ))

        # Load Test Data if provided
        data_rows = []
        if test_data_id:
            try:
                data_rows = await ExecutionService._load_test_data(test_data_id)
            except Exception as e:
                print(f"Failed to load test data: {e}")
                # Fallback to single execution or fail? 
                # Ideally fail or warn. For now, empty list means no data-driven but handled below.
                
        # Calculate total tests
        num_iterations = len(data_rows) if data_rows else 1
        total_tests = len(test_cases) * num_iterations
        
        bulk_run = await BulkTestRun.objects.acreate(
            project=project,
            total_tests=total_tests,
            parallel=parallel,
            max_workers=max_workers,
            status='RUNNING',
            created_by='system'
        )
        
        # Create test run for tracking individual results
        test_run = await ExecutionService.create_run(str(project.id))
        
        # Execute tests
        if parallel:
            await ExecutionService._execute_parallel(
                test_cases=test_cases,
                test_run=test_run,
                bulk_run=bulk_run,
                max_workers=max_workers,
                data_rows=data_rows
            )
        else:
            await ExecutionService._execute_sequential(
                test_cases=test_cases,
                test_run=test_run,
                bulk_run=bulk_run,
                data_rows=data_rows
            )
        
        # Mark as completed
        from django.utils import timezone
        bulk_run.status = 'COMPLETED'
        bulk_run.completed_at = timezone.now()
        await sync_to_async(bulk_run.save)()
        
        return bulk_run

    @staticmethod
    async def _execute_sequential(
        test_cases: List[TestCase],
        test_run: TestRun,
        bulk_run: BulkTestRun,
        data_rows: List[Dict[str, Any]] = None
    ):
        """Execute test cases sequentially"""
        for test_case in test_cases:
            if data_rows:
                for i, context in enumerate(data_rows):
                    result = await ExecutionService.execute_test_case(test_case, test_run, context, i)
                    
                    # Update bulk run progress
                    bulk_run.completed_tests += 1
                    if result.passed:
                        bulk_run.passed_tests += 1
                    else:
                        bulk_run.failed_tests += 1
                    await sync_to_async(bulk_run.save)()
            else:
                result = await ExecutionService.execute_test_case(test_case, test_run)
                
                # Update bulk run progress
                bulk_run.completed_tests += 1
                if result.passed:
                    bulk_run.passed_tests += 1
                else:
                    bulk_run.failed_tests += 1
                
                await sync_to_async(bulk_run.save)()

    @staticmethod
    async def _execute_parallel(
        test_cases: List[TestCase],
        test_run: TestRun,
        bulk_run: BulkTestRun,
        max_workers: int = 5,
        data_rows: List[Dict[str, Any]] = None
    ):
        """Execute test cases in parallel using asyncio"""
        import asyncio
        
        async def execute_and_update(test_case, context=None, index=0):
            result = await ExecutionService.execute_test_case(test_case, test_run, context, index)
            
            # Update bulk run progress (with thread safety)
            bulk_run.completed_tests += 1
            if result.passed:
                bulk_run.passed_tests += 1
            else:
                bulk_run.failed_tests += 1
            
            await sync_to_async(bulk_run.save)()
            return result
        
        # Execute with concurrency limit
        semaphore = asyncio.Semaphore(max_workers)
        
        async def bounded_execute(test_case, context=None, index=0):
            async with semaphore:
                return await execute_and_update(test_case, context, index)
        
        # Prepare Tasks
        tasks = []
        for tc in test_cases:
            if data_rows:
                for i, row in enumerate(data_rows):
                    tasks.append(bounded_execute(tc, row, i))
            else:
                tasks.append(bounded_execute(tc))

        # Run all tests with max_workers concurrency
        await asyncio.gather(*tasks)

    @staticmethod
    async def get_bulk_run_progress(bulk_run_id: str) -> Dict[str, Any]:
        """Get current progress of a bulk test run"""
        bulk_run = await BulkTestRun.objects.aget(id=bulk_run_id)
        
        return {
            "run_id": str(bulk_run.id),
            "status": bulk_run.status,
            "total_tests": bulk_run.total_tests,
            "completed": bulk_run.completed_tests,
            "passed": bulk_run.passed_tests,
            "failed": bulk_run.failed_tests,
            "progress_percentage": bulk_run.progress_percentage,
            "elapsed_seconds": bulk_run.elapsed_seconds,
            "current_test": None  # Could track current test name in future
        }
