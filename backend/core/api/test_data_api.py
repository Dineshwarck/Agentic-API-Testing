from typing import List
from ninja import Router, File, UploadedFile, Schema
from django.shortcuts import get_object_or_404
from core.models import Project, TestData
import uuid
from datetime import datetime
import csv
import io
import pandas as pd

router = Router()

class TestDataSchema(Schema):
    id: uuid.UUID
    name: str
    file_type: str
    row_count: int
    uploaded_at: datetime

class TestDataPreviewSchema(Schema):
    headers: List[str]
    rows: List[dict]

@router.post("/projects/{project_id}/test-data", response=TestDataSchema)
def upload_test_data(request, project_id: uuid.UUID, file: UploadedFile = File(...)):
    project = get_object_or_404(Project, id=project_id)
    
    # Determine type
    file_type = 'csv' if file.name.endswith('.csv') else 'json'
    
    # Read file to count rows
    content = file.read()
    file.seek(0)
    
    row_count = 0
    if file_type == 'csv':
        try:
            df = pd.read_csv(io.BytesIO(content))
            row_count = len(df)
        except Exception:
            row_count = 0 
    
    test_data = TestData.objects.create(
        project=project,
        name=file.name,
        file=file,
        file_type=file_type,
        row_count=row_count
    )
    
    return test_data

@router.get("/projects/{project_id}/test-data", response=List[TestDataSchema])
def list_test_data(request, project_id: uuid.UUID):
    return TestData.objects.filter(project_id=project_id).order_by('-uploaded_at')

@router.delete("/test-data/{test_data_id}")
def delete_test_data(request, test_data_id: uuid.UUID):
    data = get_object_or_404(TestData, id=test_data_id)
    data.delete()
    return {"success": True}

@router.get("/test-data/{test_data_id}/preview", response=TestDataPreviewSchema)
def preview_test_data(request, test_data_id: uuid.UUID):
    data = get_object_or_404(TestData, id=test_data_id)
    
    if not data.file:
        return {"headers": [], "rows": []}
        
    try:
        if data.file_type == 'csv':
            df = pd.read_csv(data.file.path, nrows=5)
            # Replace NaN with None/Empty string for JSON serialization
            df = df.where(pd.notnull(df), None)
            return {
                "headers": list(df.columns),
                "rows": df.to_dict('records')
            }
    except Exception as e:
        print(f"Error reading file: {e}")
        return {"headers": ["Error"], "rows": [{"Error": str(e)}]}
        
    return {"headers": [], "rows": []}
