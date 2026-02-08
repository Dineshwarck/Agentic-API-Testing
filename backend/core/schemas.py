from ninja import Schema, ModelSchema
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from .models import Project, Endpoint, Document, TestCase, TestRun, TestResult, Environment, BulkTestRun

class ProjectSchema(ModelSchema):
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

class ProjectCreateSchema(Schema):
    name: str
    description: Optional[str] = None

class ProjectUpdateSchema(Schema):
    name: Optional[str] = None
    description: Optional[str] = None

class CollectionSchema(ModelSchema):
    class Meta:
        from .models import Collection
        model = Collection
        fields = ['id', 'project', 'name', 'description', 'created_at', 'updated_at']

class CollectionCreateSchema(Schema):
    name: str
    description: Optional[str] = None

class EndpointSchema(ModelSchema):
    class Meta:
        model = Endpoint
        fields = ['id', 'project', 'collection', 'name', 'url', 'method', 'description', 'headers', 'parameters', 'auth_config', 'body_schema', 'response_schema', 'created_at', 'updated_at']

class EndpointCreateSchema(Schema):
    name: str
    url: str
    method: str = "GET"
    description: Optional[str] = None
    headers: dict = {}
    auth_config: dict = {}

class EndpointUpdateSchema(Schema):
    name: Optional[str] = None
    url: Optional[str] = None
    method: Optional[str] = None
    description: Optional[str] = None

class DocumentSchema(ModelSchema):
    class Meta:
        model = Document
        fields = ['id', 'name', 'doc_type', 'size', 'created_at', 'file']

# --- Agentic Schemas ---

class TestCaseSchema(ModelSchema):
    class Meta:
        model = TestCase
        fields = ['id', 'endpoint', 'title', 'description', 'status', 'payload', 'expected_status', 'is_generated', 'user_feedback', 'created_at']

class TestCaseCreateSchema(Schema):
    endpoint_id: UUID
    title: str
    description: Optional[str] = None
    payload: dict = {}
    expected_status: int = 200

class TestCaseUpdateSchema(Schema):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    payload: Optional[dict] = None
    expected_status: Optional[int] = None
    user_feedback: Optional[str] = None

class TestRunCreateSchema(Schema):
    test_case_ids: Optional[List[UUID]] = None
    test_data_id: Optional[UUID] = None

class TestRunSchema(ModelSchema):
    class Meta:
        model = TestRun
        fields = ['id', 'project', 'status', 'started_at', 'completed_at', 'summary']

class TestResultSchema(ModelSchema):
    class Meta:
        model = TestResult
        fields = ['id', 'test_run', 'test_case', 'status', 'passed', 'status_code', 'response_body', 'headers', 'duration_ms', 'executed_at']

from .models import LLMProvider

class LLMProviderSchema(ModelSchema):
    class Meta:
        model = LLMProvider
        fields = ['id', 'name', 'provider_type', 'base_url', 'default_model', 'is_active', 'created_at'] # Exclude api_key for security in list? Or include for Editing?
        # For security, we should probably NOT return the API Key, or mask it.
        # But for MVP settings page, user might want to see it? Standard is mask.
        pass

class LLMProviderCreateSchema(Schema):
    name: str
    provider_type: str
    base_url: Optional[str] = None
    api_key: str
    default_model: str
    is_active: bool = False

class LLMProviderUpdateSchema(Schema):
    name: Optional[str] = None
    provider_type: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    default_model: Optional[str] = None
    is_active: Optional[bool] = None

    default_model: Optional[str] = None
    is_active: Optional[bool] = None


from .models import Environment

class EnvironmentSchema(ModelSchema):
    class Meta:
        model = Environment
        fields = ['id', 'project', 'name', 'variables', 'created_at', 'updated_at']

class EnvironmentCreateSchema(Schema):
    name: str
    variables: dict = {}

class EnvironmentUpdateSchema(Schema):
    name: Optional[str] = None
    variables: Optional[dict] = None

# --- Bulk Test Run Schemas ---

class BulkTestRunSchema(ModelSchema):
    progress_percentage: int
    elapsed_seconds: int
    
    class Meta:
        model = BulkTestRun
        fields = ['id', 'project', 'status', 'total_tests', 'completed_tests', 
                  'passed_tests', 'failed_tests', 'parallel', 'max_workers', 'started_at', 
                  'completed_at', 'created_by']

class BulkTestRunCreateSchema(Schema):
    parallel: bool = True
    max_workers: int = 5
    collection_id: Optional[UUID] = None
    test_data_id: Optional[UUID] = None

class BulkRunProgressSchema(Schema):
    run_id: UUID
    status: str
    total_tests: int
    completed: int
    passed: int
    failed: int
    progress_percentage: int
    elapsed_seconds: int
    current_test: Optional[str] = None

# --- Report Schemas ---

class TestRunHistoryItemSchema(Schema):
    id: UUID
    executed_at: datetime
    total_tests: int
    passed: int
    failed: int
    duration_seconds: float
    pass_rate: float

class TestRunHistoryResponseSchema(Schema):
    runs: List[TestRunHistoryItemSchema]
    total_runs: int

class TrendDataPointSchema(Schema):
    date: str
    total_runs: int
    total_tests: int
    passed: int
    failed: int
    pass_rate: float
    avg_duration: float

class TrendResponseSchema(Schema):
    trends: List[TrendDataPointSchema]

class FlakyTestSchema(Schema):
    test_case_id: UUID
    test_name: str
    total_runs: int
    passed: int
    failed: int
    flake_rate: float
    last_failure: Optional[datetime] = None

class FlakyTestResponseSchema(Schema):
    flaky_tests: List[FlakyTestSchema]

class CollectionHealthItemSchema(Schema):
    collection_name: str
    total_tests: int
    passed: int
    failed: int
    pass_rate: float

class CollectionHealthResponseSchema(Schema):
    collections: List[CollectionHealthItemSchema]
