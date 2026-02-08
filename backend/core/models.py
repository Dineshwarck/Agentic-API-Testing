from django.db import models
import uuid
from .fields import EncryptedCharField

class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Collection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, related_name='collections', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.project.name})"

class Endpoint(models.Model):
    METHODS = [
        ('GET', 'GET'),
        ('POST', 'POST'),
        ('PUT', 'PUT'),
        ('DELETE', 'DELETE'),
        ('PATCH', 'PATCH'),
        ('HEAD', 'HEAD'),
        ('OPTIONS', 'OPTIONS'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, related_name='endpoints', on_delete=models.CASCADE)
    collection = models.ForeignKey(Collection, related_name='endpoints', on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=255)
    url = models.CharField(max_length=2048)
    method = models.CharField(max_length=10, choices=METHODS, default='GET')
    description = models.TextField(blank=True, null=True)
    headers = models.JSONField(default=dict, blank=True)
    parameters = models.JSONField(default=list, blank=True, help_text="Query parameters")
    auth_config = models.JSONField(default=dict, blank=True)
    body_schema = models.JSONField(default=dict, blank=True)
    response_schema = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.method} {self.name}"

class Document(models.Model):
    DOCUMENT_TYPES = [
        ('DEV_DOCS', 'Developer Documentation'),
        ('REQUIREMENTS', 'Client Requirements'),
        ('OTHER', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, related_name='documents', on_delete=models.CASCADE, null=True, blank=True)
    endpoint = models.ForeignKey(Endpoint, related_name='documents', on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    doc_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES, default='OTHER')
    size = models.IntegerField(help_text="Size in bytes")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.doc_type})"

class Environment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, related_name='environments', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    variables = models.JSONField(default=dict, blank=True, help_text="Key-value pairs for environment variables")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.project.name})"

class BulkTestRun(models.Model):
    """Tracks bulk test execution across multiple test cases"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, related_name='bulk_runs', on_delete=models.CASCADE)
    collection = models.ForeignKey(Collection, related_name='bulk_runs', on_delete=models.SET_NULL, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    total_tests = models.IntegerField(default=0, help_text="Total number of tests to execute")
    completed_tests = models.IntegerField(default=0, help_text="Number of tests completed so far")
    passed_tests = models.IntegerField(default=0, help_text="Number of tests that passed")
    failed_tests = models.IntegerField(default=0, help_text="Number of tests that failed")
    
    parallel = models.BooleanField(default=False, help_text="Whether to run tests in parallel")
    max_workers = models.IntegerField(default=5, help_text="Maximum number of parallel workers")
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.CharField(max_length=255, default='system')
    
    def __str__(self):
        return f"Bulk Run {self.id} - {self.status} ({self.completed_tests}/{self.total_tests})"
    
    @property
    def progress_percentage(self):
        if self.total_tests == 0:
            return 0
        return int((self.completed_tests / self.total_tests) * 100)
    
    @property
    def elapsed_seconds(self):
        if not self.started_at:
            return 0
        end_time = self.completed_at if self.completed_at else timezone.now()
        return int((end_time - self.started_at).total_seconds())

# --- New Agentic Models ---

class TestCase(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('APPROVED', 'Approved'),
        ('ARCHIVED', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    endpoint = models.ForeignKey(Endpoint, related_name='test_cases', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Execution Specs
    payload = models.JSONField(default=dict, blank=True, help_text="Request body or query params")
    expected_status = models.IntegerField(default=200)
    
    # Agentic/Review Meta
    is_generated = models.BooleanField(default=False)
    user_feedback = models.TextField(blank=True, null=True, help_text="History of user comments/refinements")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"[{self.status}] {self.title}"

class TestRun(models.Model):
    STATUS_CHOICES = [
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, related_name='test_runs', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RUNNING')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    summary = models.TextField(blank=True, null=True, help_text="AI Generated Summary of the run")

    def __str__(self):
        return f"Run {self.id} ({self.status})"


class TestData(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, related_name='test_data', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='test_data/%Y/%m/%d/')
    file_type = models.CharField(max_length=10, default='csv')  # csv, json
    uploaded_at = models.DateTimeField(auto_now_add=True)
    row_count = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.name} ({self.row_count} rows)"

class TestResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_run = models.ForeignKey(TestRun, related_name='results', on_delete=models.CASCADE)
    test_case = models.ForeignKey(TestCase, related_name='results', on_delete=models.CASCADE)
    
    # Data Driven Testing Links
    test_data = models.ForeignKey(TestData, null=True, blank=True, on_delete=models.SET_NULL)
    data_row_index = models.IntegerField(null=True, blank=True)
    
    status = models.CharField(max_length=20, default='PENDING') # PENDING, RUNNING, PASSED, FAILED
    passed = models.BooleanField(default=False)
    status_code = models.IntegerField(null=True)
    response_body = models.JSONField(null=True, blank=True)
    headers = models.JSONField(default=dict, blank=True)
    duration_ms = models.IntegerField(default=0)
    
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['executed_at'], name='testresult_executed_at_idx'),
            models.Index(fields=['test_run', 'status'], name='testresult_run_status_idx'),
            models.Index(fields=['test_case', 'status', 'executed_at'], name='testresult_flaky_idx'),
        ]

    def __str__(self):
        return f"{self.test_case.title}: {'PASS' if self.passed else 'FAIL'}"

class LLMProvider(models.Model):
    PROVIDER_TYPES = [
        ('GEMINI', 'Google Gemini'),
        ('OPENAI', 'OpenAI Compatible (Groq, AIPipe, etc.)'),
        ('OLLAMA', 'Ollama (Local)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text="e.g. 'Groq', 'Gemini Pro'")
    provider_type = models.CharField(max_length=50, choices=PROVIDER_TYPES, default='OPENAI')
    
    base_url = models.CharField(max_length=500, blank=True, null=True, help_text="Required for OpenAI compatible providers (e.g. https://api.groq.com/openai/v1)")
    api_key = EncryptedCharField(max_length=500, help_text="Stored securely using Fernet encryption.")
    default_model = models.CharField(max_length=100, help_text="Model ID to use (e.g. gpt-4o, llama3-70b-8192)")
    
    is_active = models.BooleanField(default=False, help_text="Only one provider should be active at a time.")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.is_active:
            # Deselect all others
            LLMProvider.objects.filter(is_active=True).exclude(id=self.id).update(is_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.provider_type})"
