from ninja import Router, File, Form, Schema
from ninja.files import UploadedFile
from typing import List, Optional, Dict, Any
from django.shortcuts import get_object_or_404
from uuid import UUID
from .models import Project, Endpoint, Document, TestCase, TestRun, TestResult
from django.utils.timezone import now
from .schemas import (
    ProjectSchema, ProjectCreateSchema, ProjectUpdateSchema,
    EndpointSchema, EndpointCreateSchema, EndpointUpdateSchema,
    DocumentSchema,
    TestCaseSchema, TestCaseCreateSchema, TestCaseUpdateSchema,
    TestRunSchema, TestRunCreateSchema, TestResultSchema,
    LLMProviderSchema, LLMProviderCreateSchema, LLMProviderUpdateSchema,
    EnvironmentSchema, EnvironmentCreateSchema, EnvironmentUpdateSchema,
    BulkTestRunSchema, BulkTestRunCreateSchema, BulkRunProgressSchema,
    TestRunHistoryResponseSchema, TrendResponseSchema,
    FlakyTestResponseSchema, CollectionHealthResponseSchema
)
from .models import Project, Endpoint, Document, TestCase, TestRun, TestResult, LLMProvider, Environment # Added Models
import requests
import os # Added os import
from django.utils import timezone

router = Router()

@router.get("/health")
def health(request):
    return {"status": "ok"}

@router.get("/test", auth=None)
def test(request):
    return {"message": "Test successful"}

# --- Projects ---

@router.get("/projects", response=List[ProjectSchema])
def list_projects(request):
    return Project.objects.all()

@router.post("/projects", response=ProjectSchema)
def create_project(request, payload: ProjectCreateSchema):
    project = Project.objects.create(**payload.dict())
    return project

@router.get("/projects/{project_id}", response=ProjectSchema)
def get_project(request, project_id: UUID):
    project = get_object_or_404(Project, id=project_id)
    return project

@router.put("/projects/{project_id}", response=ProjectSchema)
def update_project(request, project_id: UUID, payload: ProjectUpdateSchema):
    print(f"DEBUG UPDATE: id={project_id}, payload={payload}")
    project = get_object_or_404(Project, id=project_id)
    for attr, value in payload.dict(exclude_unset=True).items():
        setattr(project, attr, value)
    project.save()
    return project

@router.delete("/projects/{project_id}")
def delete_project(request, project_id: UUID):
    project = get_object_or_404(Project, id=project_id)
    project.delete()
    return {"success": True}

# --- Endpoints ---

@router.get("/projects/{project_id}/endpoints", response=List[EndpointSchema])
def list_endpoints(request, project_id: UUID):
    return Endpoint.objects.filter(project_id=project_id)

@router.post("/projects/{project_id}/endpoints", response=EndpointSchema)
def create_endpoint(request, project_id: UUID, payload: EndpointCreateSchema):
    project = get_object_or_404(Project, id=project_id)
    endpoint = Endpoint.objects.create(project=project, **payload.dict())
    return endpoint

@router.get("/endpoints/{endpoint_id}", response=EndpointSchema)
def get_endpoint(request, endpoint_id: UUID):
    endpoint = get_object_or_404(Endpoint, id=endpoint_id)
    return endpoint

@router.put("/endpoints/{endpoint_id}", response=EndpointSchema)
def update_endpoint(request, endpoint_id: UUID, payload: EndpointUpdateSchema):
    endpoint = get_object_or_404(Endpoint, id=endpoint_id)
    for attr, value in payload.dict(exclude_unset=True).items():
        setattr(endpoint, attr, value)
    endpoint.save()
    return endpoint

# --- Bulk Test Execution ---

@router.post("/projects/{project_id}/run-all", response=BulkTestRunSchema)
async def run_workspace_tests(request, project_id: UUID, payload: BulkTestRunCreateSchema):
    """
    Execute all test cases in a workspace/project.
    Returns the BulkTestRun tracking object.
    """
    print(f"DEBUG: Received Bulk Run Request for Project {project_id}")
    from .services.execution_service import ExecutionService
    
    project = get_object_or_404(Project, id=project_id)
    
    bulk_run = await ExecutionService.execute_workspace_tests(
        project=project,
        parallel=payload.parallel,
        max_workers=payload.max_workers,
        test_data_id=payload.test_data_id
    )
    
    return bulk_run

@router.get("/bulk-runs/{run_id}/progress", response=BulkRunProgressSchema)
async def get_bulk_run_progress(request, run_id: UUID):
    """
    Get the current progress of a bulk test run.
    Used for real-time progress tracking on the frontend.
    """
    from .services.execution_service import ExecutionService
    
    progress = await ExecutionService.get_bulk_run_progress(str(run_id))
    return progress

@router.delete("/endpoints/{endpoint_id}")
def delete_endpoint(request, endpoint_id: UUID):
    endpoint = get_object_or_404(Endpoint, id=endpoint_id)
    endpoint.delete()
    return {"success": True}

# Documents
@router.post("/documents", response=DocumentSchema)
def upload_document(request, 
    file: UploadedFile = File(...), 
    doc_type: str = Form("OTHER"), 
    project_id: Optional[UUID] = Form(None), 
    endpoint_id: Optional[UUID] = Form(None)
):
    doc = Document.objects.create(
        name=file.name,
        file=file,
        size=file.size,
        doc_type=doc_type,
        project_id=project_id,
        endpoint_id=endpoint_id
    )
    return doc

# --- Agentic Workflow ---

from .adk_service import AdkService
from agent.orchestrator.service import OrchestratorService
from core.services.execution_service import ExecutionService

class ExecutionRequestSchema(Schema):
    method: str
    url: str
    headers: Dict[str, str] = {}
    params: Dict[str, str] = {}
    body: Any = None

@router.post("/execute/request")
async def execute_manual_request(request, payload: ExecutionRequestSchema):
    """Execute a manual request (ad-hoc)"""
    result = await ExecutionService.execute_request(
        method=payload.method,
        url=payload.url,
        headers=payload.headers,
        params=payload.params,
        body=payload.body
    )
    return result

class ExecuteRunSchema(Schema):
    test_case_ids: Optional[List[str]] = None

@router.post("/projects/{project_id}/runs")
async def execute_run(request, project_id: UUID, payload: ExecuteRunSchema):
    """Execute test cases for a project"""
    # 1. Create Run
    run = await ExecutionService.create_test_run(project_id=str(project_id))
    
    # 2. Identify Test Cases
    if payload.test_case_ids:
        test_cases = []
        for tid in payload.test_case_ids:
            try:
                tc = await TestCase.objects.aget(id=tid)
                test_cases.append(tc)
            except TestCase.DoesNotExist:
                pass
    else:
        # Run all Draft/Approved
        test_cases = [tc async for tc in TestCase.objects.filter(total_project_id=str(project_id))] # Need to fix lookup logic
        # Fix: Filter by endpoint__project_id
        test_cases = [tc async for tc in TestCase.objects.filter(endpoint__project_id=str(project_id))]

    # 3. Execute (Async Loop for now, Celery later)
    results_summary = []
    pass_count = 0
    
    for case in test_cases:
        res = await ExecutionService.execute_test_case(case, run)
        if res.passed:
            pass_count += 1
        results_summary.append({
            "test_case_id": str(case.id),
            "passed": res.passed,
            "status_code": res.status_code
        })
    
    # 4. Update Run Status
    run.status = 'COMPLETED'
    run.completed_at = now()
    run.summary = f"Executed {len(test_cases)} tests. Passed: {pass_count}. Failed: {len(test_cases) - pass_count}"
    await run.asave()
    
@router.get("/runs/{run_id}")
def get_run_details(request, run_id: UUID):
    run = get_object_or_404(TestRun, id=run_id)
    return {
        "id": str(run.id),
        "status": run.status,
        "summary": run.summary,
        "started_at": run.started_at,
        "completed_at": run.completed_at
    }

@router.get("/runs/{run_id}/results", response=List[TestResultSchema])
def get_run_results(request, run_id: UUID):
    run = get_object_or_404(TestRun, id=run_id)
    results = run.results.all()
    # Simple serialization helper if Schema doesn't match perfectly
    return results

@router.get("/runs/{run_id}/report")
def download_run_report(request, run_id: UUID):
    """Simple JSON report for MVP"""
    run = get_object_or_404(TestRun, id=run_id)
    results = run.results.all()
    
    report_data = {
        "run_id": str(run.id),
        "summary": run.summary,
        "results": [
            {
                "test_case": r.test_case.title,
                "passed": r.passed,
                "status_code": r.status_code,
                "duration_ms": r.duration_ms
            }
            for r in results
        ]
    }
    return report_data

class GenerateSpecsSchema(Schema):
    additional_context: str = None
    endpoint_ids: List[UUID] = None  # Optional: filter to specific endpoints

class GenerateFromSwaggerSchema(Schema):
    swagger_url: str
    additional_context: Optional[str] = None

@router.post("/agent/generate-from-swagger")
async def generate_from_swagger(request, project_id: UUID, payload: GenerateFromSwaggerSchema):
    """Generate test cases by crawling Swagger URL"""
    print(f"DEBUG: Generate from Swagger called for project {project_id}")
    
    # Get Key
    api_key = request.headers.get('X-API-Key') or os.getenv("GOOGLE_API_KEY")
    adk = AdkService(api_key=api_key, project_id=str(project_id))
    
    result = await adk.generate_from_swagger(payload.swagger_url)
    
    if not result.get('success'):
        # Return error with 400 Bad Request
        from django.http import JsonResponse
        return JsonResponse(result, status=400)
    
    return result

@router.post("/agent/generate-specs/{project_id}")
async def generate_specs(request, project_id: UUID, payload: GenerateSpecsSchema = None):
    print(f"\n\n========== GENERATE SPECS CALLED ==========")
    print(f"Project ID: {project_id}")
    print(f"Payload: {payload}")
    print(f"Additional Context: {payload.additional_context if payload else 'None'}")
    print(f"Endpoint IDs Filter: {payload.endpoint_ids if payload else 'None'}")
    
    project = get_object_or_404(Project, id=project_id)
    print(f"Project Found: {project.name}")
    
    # 0. Cleanup Old Generated Drafts
    deleted_count = await TestCase.objects.filter(
        endpoint__project_id=project_id, 
        is_generated=True
    ).adelete()
    print(f"Deleted {deleted_count} old test cases")

    # 1. Gather Context (Docs & Endpoints)
    # Filter endpoints by IDs if provided, otherwise get all
    if payload and payload.endpoint_ids:
        endpoints = Endpoint.objects.filter(project=project, id__in=payload.endpoint_ids)
        print(f"Filtering to {len(payload.endpoint_ids)} specified endpoints")
    else:
        endpoints = Endpoint.objects.filter(project=project)
        print(f"Processing all endpoints in project")
        
    endpoint_summaries = [f"{ep.method} {ep.url} - {ep.description}" for ep in endpoints]
    
    context = f"Project: {project.name}\nDescription: {project.description}\n"
    context += "Endpoints:\n" + "\n".join(endpoint_summaries)
    print(f"Endpoints found: {len(endpoint_summaries)}")
    
    # Add Uploaded Docs Content
    docs = Document.objects.filter(project=project)
    doc_count = 0
    async for doc in docs:
        try:
            content = doc.file.read().decode('utf-8', errors='ignore')
            context += f"\n\n--- DOCUMENT: {doc.name} ({doc.doc_type}) ---\n{content}\n"
            doc_count += 1
        except Exception as e:
            print(f"Failed to read doc {doc.name}: {e}")
    print(f"Documents processed: {doc_count}")

    # Add Client Text Context
    if payload and payload.additional_context:
         context += f"\n\n--- CLIENT REQUIREMENTS (TEXT) ---\n{payload.additional_context}\n"
         print(f"Client context added: {len(payload.additional_context)} chars")
    
    # Check for X-API-Key header
    api_key = request.headers.get('X-API-Key')
    if not api_key:
        api_key = os.getenv("GOOGLE_API_KEY") 
        
    if not api_key:
        print("Warning: No Google API Key provided. ADK might fail.")

    # 2. Call ADK Agent
    print("Calling ADK Service...")
    adk = AdkService(api_key=api_key, project_id=project_id)
    generated_cases = await adk.generate_test_plan(context)
    print(f"ADK returned {len(generated_cases)} test cases")
    
    # 3. Save to DB
    saved_cases = []
    
    # Match cases to endpoints by URL/Method if possible
    endpoint_list = [e async for e in endpoints]
    print(f"Endpoint list has {len(endpoint_list)} items")

    for case in generated_cases:
        target_ep = endpoint_list[0] if endpoint_list else None
        
        if target_ep:
            tc = await TestCase.objects.acreate(
                endpoint=target_ep,
                title=case.get('title', 'Untitled'),
                description=case.get('description', ''),
                payload=case.get('payload', {}),
                expected_status=case.get('expected_status', 200),
                status='APPROVED',
                is_generated=True
            )
            saved_cases.append(tc)
            print(f"Saved test case: {tc.title}")

    print(f"Total saved: {len(saved_cases)} test cases")
    print(f"========== GENERATE SPECS COMPLETE ==========\n\n")
    return [TestCaseSchema.from_orm(tc) for tc in saved_cases]
@router.post("/test-cases/{test_case_id}/refine", response=TestCaseSchema)
def refine_test_case(request, test_case_id: UUID, comment: str):
    """
    Agent 2 (Refiner): Updates DRAFT based on user comment.
    MOCK IMPLEMENTATION: Appends comment to feedback and updates description.
    """
    case = get_object_or_404(TestCase, id=test_case_id)
    case.user_feedback = (case.user_feedback or "") + f"\nUser: {comment}"
    case.description += f" [Refined based on: {comment}]"
    case.save()
    return case

@router.get("/projects/{project_id}/test-cases", response=List[TestCaseSchema])
def list_test_cases(request, project_id: UUID):
    return TestCase.objects.filter(endpoint__project_id=project_id)

@router.put("/test-cases/{test_case_id}", response=TestCaseSchema)
def update_test_case(request, test_case_id: UUID, payload: TestCaseUpdateSchema):
    case = get_object_or_404(TestCase, id=test_case_id)
    for attr, value in payload.dict(exclude_unset=True).items():
        setattr(case, attr, value)
    case.save()
    return case

@router.delete("/test-cases/{test_case_id}")
def delete_test_case(request, test_case_id: UUID):
    case = get_object_or_404(TestCase, id=test_case_id)
    case.delete()
    return {"success": True}

@router.post("/projects/{project_id}/runs", response=TestRunSchema)
async def execute_run(request, project_id: UUID, payload: TestRunCreateSchema = None):
    """
    Agent 3 (Executor): Executes TestCases (Specific list or all APPROVED) in PARALLEL.
    Supports Data-Driven execution if test_data_id is provided.
    """
    from .services.execution_service import ExecutionService
    
    # 1. Fetch Project
    project = await Project.objects.aget(id=project_id)
    
    # 2. Fetch Cases
    if payload and payload.test_case_ids:
        cases = await sync_to_async(list)(TestCase.objects.filter(endpoint__project_id=project.id, id__in=payload.test_case_ids))
    else:
        cases = await sync_to_async(list)(TestCase.objects.filter(endpoint__project_id=project_id, status='APPROVED'))
        
    if not cases:
        return await TestRun.objects.acreate(project=project, status='COMPLETED')

    # 3. Load Test Data if provided
    data_rows = []
    if payload and payload.test_data_id:
        try:
            data_rows = await ExecutionService._load_test_data(payload.test_data_id)
        except Exception as e:
            print(f"Failed to load test data: {e}")

    # 4. Create Run Record
    run = await TestRun.objects.acreate(
        project=project,
        status='RUNNING' 
    )
    
    # 5. Execute Tests (using BulkTestRun structure for consistency or just direct?)
    # ExecutionService methods expect a BulkTestRun for progress tracking.
    
    num_iterations = len(data_rows) if data_rows else 1
    total_tests = len(cases) * num_iterations
    
    bulk_run = await BulkTestRun.objects.acreate(
        project=project,
        total_tests=total_tests,
        status='RUNNING',
        created_by='system-adhoc'
    )
    
    # Execute
    # Execute in Background
    import asyncio
    asyncio.create_task(ExecutionService._execute_parallel(
        test_cases=cases,
        test_run=run,
        bulk_run=bulk_run,
        data_rows=data_rows
    ))
    
    return run
    
    num_iterations = len(data_rows) if data_rows else 1
    total_tests = len(cases) * num_iterations
    
    bulk_run = await BulkTestRun.objects.acreate(
        project=project,
        total_tests=total_tests,
        status='RUNNING',
        created_by='system-adhoc'
    )
    
    # Execute
    # We use fire-and-forget or await? 
    # Frontend expects immediate ID, so we launch task. 
    # But since this is async view, awaiting is cleaner for now unless it times out. 
    # Let's await for MVP stability, user waits for "Agents at work" spinner.
    
    await ExecutionService._execute_parallel(
        test_cases=cases,
        test_run=run,
        bulk_run=bulk_run,
        data_rows=data_rows
    )
    
    # Update Run Status
    run.status = 'COMPLETED'
    run.completed_at = now()
    await run.save()
    
    return run

@router.get("/projects/{project_id}/runs/{run_id}/stream")
async def stream_run_execution(request, project_id: UUID, run_id: UUID):
    from django.http import StreamingHttpResponse
    import json
    
    # Verify Run Exists
    try:
        run = await TestRun.objects.aget(id=run_id)
    except TestRun.DoesNotExist:
        return 404
        
    # Get Key
    api_key = request.headers.get('X-API-Key') or os.getenv("GOOGLE_API_KEY")
    adk = AdkService(api_key=api_key, project_id=str(project_id))

    # Fetch Pending Results -> Test Cases
    results = TestResult.objects.filter(test_run__id=run_id)
    test_cases_list = []
    
    async for res in results:
        # Fetch related test case
        tc = await TestCase.objects.aget(id=res.test_case_id)
        test_cases_list.append(tc)

    async def event_generator():
        from django.db import close_old_connections
        import asyncio
        import json
        
        # Yield start event
        yield f"data: {json.dumps({'type': 'start', 'run_id': str(run_id)})}\n\n"
        
        sent_results = set()
        
        while True:
            close_old_connections()
            try:
                # Reload run to check status
                current_run = await TestRun.objects.aget(id=run_id)
                
                # Fetch completed/updated results
                # We want results that are NOT pending
                results = TestResult.objects.filter(test_run__id=run_id).exclude(status='PENDING')
                
                async for res in results:
                    if res.id not in sent_results:
                        event = {
                            'type': 'result',
                            'test_case_id': str(res.test_case_id),
                            'status': res.status,
                            'output': res.response_body.get('agent_output', '') if res.response_body else '',
                            'result_id': str(res.id)
                        }
                        yield f"data: {json.dumps(event)}\n\n"
                        sent_results.add(res.id)
                
                if current_run.status in ['COMPLETED', 'FAILED']:
                    break
                    
                await asyncio.sleep(1)
            except Exception as e:
                print(f"Stream Error: {e}")
                break
            
        yield f"data: {json.dumps({'type': 'end'})}\n\n"

    return StreamingHttpResponse(event_generator(), content_type='text/event-stream')

@router.get("/runs/{run_id}", response=TestRunSchema)
def get_run_details(request, run_id: UUID):
    return get_object_or_404(TestRun, id=run_id)

@router.get("/runs/{run_id}/results", response=List[TestResultSchema])
def get_run_results(request, run_id: UUID):
    return TestResult.objects.filter(test_run_id=run_id)

@router.get("/runs/{run_id}/report")
def generate_report(request, run_id: UUID):
    run = get_object_or_404(TestRun, id=run_id)
    results = run.results.all()
    
    css_styles = "body { font-family: sans-serif; padding: 20px; } h1 { color: #2c3e50; border-bottom: 2px solid #3498db; } .pass { color: green; } .fail { color: red; }"

    html_string = f"""
    <html>
    <head>
        <style>
        {css_styles}
        </style>
    </head>
    <body>
        <h1>Test Execution Report</h1>
        
        <div class="summary">
            <h3>Executive Summary (AI)</h3>
            <p>{run.summary or "No summary available."}</p>
            <div class="meta">
                <p><strong>Run ID:</strong> {run.id}</p>
                <p><strong>Status:</strong> {run.status}</p>
                <p><strong>Date:</strong> {run.started_at.strftime('%Y-%m-%d %H:%M') if run.started_at else 'N/A'}</p>
            </div>
        </div>
        
        <h3>Detailed Results</h3>
        <table>
            <thead>
                <tr>
                    <th>Test Case</th>
                    <th>Status</th>
                    <th>HTTP Code</th>
                    <th>Duration (ms)</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for res in results:
        status_class = "pass" if res.passed else "fail"
        status_text = "PASS" if res.passed else "FAIL"
        # Truncate output
        output_sample = (str(res.response_body)[:200] + "...") if res.response_body else "-"
        
        html_string += f"""
                <tr>
                    <td>
                        <strong>{res.test_case.title}</strong><br/>
                        <span style="font-size:0.8em; color:#666;">{res.test_case.description}</span>
                    </td>
                    <td class="{status_class}">{status_text}</td>
                    <td>{res.status_code}</td>
                    <td>{res.duration_ms}</td>
                </tr>
        """
        
    html_string += """
            </tbody>
        </table>
    </body>
    </html>
    """
    
    try:
        from xhtml2pdf import pisa
        from django.http import HttpResponse, JsonResponse
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="report_{run.id}.pdf"'
        
        # Create PDF
        pisa_status = pisa.CreatePDF(html_string, dest=response)
        
        if pisa_status.err:
             return JsonResponse({"error": "PDF Generation Error"}, status=500)
             
        return response

    except ImportError:
         from django.http import JsonResponse
         return JsonResponse({"error": "xhtml2pdf not installed"}, status=500)
    except Exception as e:
         from django.http import JsonResponse
         return JsonResponse({"error": str(e)}, status=500)

# --- LLM Settings ---

@router.get("/llm-providers", response=List[LLMProviderSchema])
def list_llm_providers(request):
    return LLMProvider.objects.all().order_by('-created_at')

@router.post("/llm-providers", response=LLMProviderSchema)
def create_llm_provider(request, payload: LLMProviderCreateSchema):
    provider = LLMProvider.objects.create(**payload.dict())
    return provider

@router.put("/llm-providers/{provider_id}", response=LLMProviderSchema)
def update_llm_provider(request, provider_id: UUID, payload: LLMProviderUpdateSchema):
    provider = get_object_or_404(LLMProvider, id=provider_id)
    for attr, value in payload.dict(exclude_unset=True).items():
        setattr(provider, attr, value)
    provider.save()
    return provider

@router.delete("/llm-providers/{provider_id}")
def delete_llm_provider(request, provider_id: UUID):
    provider = get_object_or_404(LLMProvider, id=provider_id)
    provider.delete()
    return {"success": True}

# --- Environments ---

@router.get("/projects/{project_id}/environments", response=List[EnvironmentSchema])
def list_environments(request, project_id: UUID):
    project = get_object_or_404(Project, id=project_id)
    return project.environments.all()

@router.post("/projects/{project_id}/environments", response=EnvironmentSchema)
def create_environment(request, project_id: UUID, payload: EnvironmentCreateSchema):
    project = get_object_or_404(Project, id=project_id)
    environment = Environment.objects.create(project=project, **payload.dict())
    return environment

@router.put("/environments/{env_id}", response=EnvironmentSchema)
def update_environment(request, env_id: UUID, payload: EnvironmentUpdateSchema):
    environment = get_object_or_404(Environment, id=env_id)
    for attr, value in payload.dict(exclude_unset=True).items():
        setattr(environment, attr, value)
    environment.save()
    return environment

@router.delete("/environments/{env_id}")
def delete_environment(request, env_id: UUID):
    environment = get_object_or_404(Environment, id=env_id)
    environment.delete()
    return {"success": True}

@router.post("/llm-providers/{provider_id}/activate", response=LLMProviderSchema)
def activate_llm_provider(request, provider_id: UUID):
    provider = get_object_or_404(LLMProvider, id=provider_id)
    provider.is_active = True
    provider.save()
    return provider

# --- Reports Endpoints ---

@router.get("/reports/history", response=TestRunHistoryResponseSchema)
def get_test_history(
    request,
    project_id: UUID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    collection_id: Optional[UUID] = None
):
    """
    Get test run history with filtering.
    Returns list of test runs with summary statistics.
    """
    from datetime import datetime, timedelta
    from django.db.models import Count, Q, Sum, Avg
    
    # Default to last 30 days if no dates provided
    if not end_date:
        end_date_obj = timezone.now()
    else:
        end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    if not start_date:
        start_date_obj = end_date_obj - timedelta(days=30)
    else:
        start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    
    # Query test results within date range
    results_query = TestResult.objects.filter(
        test_run__project_id=project_id,
        executed_at__gte=start_date_obj,
        executed_at__lte=end_date_obj
    )
    
    # Group by test_run and aggregate
    from django.db.models import F, ExpressionWrapper, fields
    
    runs_data = results_query.values('test_run_id', 'test_run__started_at').annotate(
        total=Count('id'),
        passed_count=Count('id', filter=Q(passed=True)),
        failed_count=Count('id', filter=Q(passed=False)),
        avg_duration=Avg('duration_ms')
    ).order_by('-test_run__started_at')
    
    # Format response
    runs = []
    for run in runs_data:
        total = run['total']
        passed = run['passed_count']
        failed = run['failed_count']
        pass_rate = (passed / total * 100) if total > 0 else 0
        duration_seconds = (run['avg_duration'] or 0) / 1000.0
        
        runs.append({
            'id': run['test_run_id'],
            'executed_at': run['test_run__started_at'],
            'total_tests': total,
            'passed': passed,
            'failed': failed,
            'duration_seconds': duration_seconds,
            'pass_rate': round(pass_rate, 2)
        })
    
    return {
        'runs': runs,
        'total_runs': len(runs)
    }

@router.get("/reports/trends", response=TrendResponseSchema)
def get_test_trends(
    request,
    project_id: UUID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    group_by: str = "day"
):
    """
    Get aggregated test statistics grouped by time period.
    group_by: "day" | "week" | "month"
    """
    from datetime import datetime, timedelta
    from django.db.models import Count, Q, Avg
    from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
    
    # Default to last 30 days
    if not end_date:
        end_date_obj = timezone.now()
    else:
        end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    if not start_date:
        start_date_obj = end_date_obj - timedelta(days=30)
    else:
        start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    
    # Choose truncation function
    if group_by == "week":
        trunc_func = TruncWeek
    elif group_by == "month":
        trunc_func = TruncMonth
    else:
        trunc_func = TruncDate
    
    # Query and aggregate
    results = TestResult.objects.filter(
        test_run__project_id=project_id,
        executed_at__gte=start_date_obj,
        executed_at__lte=end_date_obj
    ).annotate(
        period=trunc_func('executed_at')
    ).values('period').annotate(
        total_runs=Count('test_run_id', distinct=True),
        total_tests=Count('id'),
        passed_count=Count('id', filter=Q(passed=True)),
        failed_count=Count('id', filter=Q(passed=False)),
        avg_duration=Avg('duration_ms')
    ).order_by('period')
    
    # Format response
    trends = []
    for item in results:
        total = item['total_tests']
        passed = item['passed_count']
        failed = item['failed_count']
        pass_rate = (passed / total * 100) if total > 0 else 0
        avg_duration_sec = (item['avg_duration'] or 0) / 1000.0
        
        trends.append({
            'date': item['period'].strftime('%Y-%m-%d'),
            'total_runs': item['total_runs'],
            'total_tests': total,
            'passed': passed,
            'failed': failed,
            'pass_rate': round(pass_rate, 2),
            'avg_duration': round(avg_duration_sec, 2)
        })
    
    return {'trends': trends}

@router.get("/reports/flaky-tests", response=FlakyTestResponseSchema)
def get_flaky_tests(
    request,
    project_id: UUID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_runs: int = 5
):
    """
    Identify tests with inconsistent pass/fail results.
    A test is "flaky" if it has both passes AND fails in the time period.
    """
    from datetime import datetime, timedelta
    from django.db.models import Count, Q, Max
    
    # Default to last 30 days
    if not end_date:
        end_date_obj = timezone.now()
    else:
        end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    if not start_date:
        start_date_obj = end_date_obj - timedelta(days=30)
    else:
        start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    
    # Query results and group by test_case
    test_stats = TestResult.objects.filter(
        test_run__project_id=project_id,
        executed_at__gte=start_date_obj,
        executed_at__lte=end_date_obj
    ).values('test_case_id', 'test_case__title').annotate(
        total_runs=Count('id'),
        passed_count=Count('id', filter=Q(passed=True)),
        failed_count=Count('id', filter=Q(passed=False)),
        last_failure=Max('executed_at', filter=Q(passed=False))
    ).filter(
        total_runs__gte=min_runs,
        passed_count__gt=0,  # Has at least 1 pass
        failed_count__gt=0   # Has at least 1 fail (flaky!)
    ).order_by('-failed_count')
    
    # Format response
    flaky_tests = []
    for test in test_stats:
        total = test['total_runs']
        failed = test['failed_count']
        flake_rate = (failed / total * 100) if total > 0 else 0
        
        flaky_tests.append({
            'test_case_id': test['test_case_id'],
            'test_name': test['test_case__title'],
            'total_runs': total,
            'passed': test['passed_count'],
            'failed': failed,
            'flake_rate': round(flake_rate, 2),
            'last_failure': test['last_failure']
        })
    
    return {'flaky_tests': flaky_tests}

@router.get("/reports/collection-health", response=CollectionHealthResponseSchema)
def get_collection_health(
    request,
    project_id: UUID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get pass/fail distribution per collection.
    Note: Currently grouping by endpoint since collections aren't in the schema yet.
    """
    from datetime import datetime, timedelta
    from django.db.models import Count, Q
    
    # Default to last 30 days
    if not end_date:
        end_date_obj = timezone.now()
    else:
        end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    if not start_date:
        start_date_obj = end_date_obj - timedelta(days=30)
    else:
        start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    
    # Query and group by endpoint name (proxy for collection)
    endpoint_stats = TestResult.objects.filter(
        test_run__project_id=project_id,
        executed_at__gte=start_date_obj,
        executed_at__lte=end_date_obj
    ).values('test_case__endpoint__name').annotate(
        total=Count('id'),
        passed_count=Count('id', filter=Q(passed=True)),
        failed_count=Count('id', filter=Q(passed=False))
    ).order_by('-total')
    
    # Format response
    collections = []
    for endpoint in endpoint_stats:
        total = endpoint['total']
        passed = endpoint['passed_count']
        pass_rate = (passed / total * 100) if total > 0 else 0
        
        collections.append({
            'collection_name': endpoint['test_case__endpoint__name'] or 'Unknown',
            'total_tests': total,
            'passed': passed,
            'failed': endpoint['failed'],
            'pass_rate': round(pass_rate, 2)
        })
    
    return {'collections': collections}
