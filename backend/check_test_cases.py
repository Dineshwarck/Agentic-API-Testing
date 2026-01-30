#!/usr/bin/env python
"""
Check what test cases still exist for ABC_User_API
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Project, Endpoint, TestCase

# Find the project
project = Project.objects.filter(name__icontains='ABC_User_API').first()

if not project:
    print("❌ ABC_User_API project not found")
    exit(1)

print(f"✅ Found project: {project.name} (ID: {project.id})")

# Get all test cases
test_cases = TestCase.objects.filter(endpoint__project=project)
endpoints = Endpoint.objects.filter(project=project)

print(f"\n📊 Current Status:")
print(f"  - Endpoints: {endpoints.count()}")
print(f"  - Test Cases: {test_cases.count()}")

if test_cases.exists():
    print(f"\n📋 Test Cases Found:")
    for tc in test_cases[:10]:  # Show first 10
        print(f"  - [{tc.status}] {tc.title} (Endpoint: {tc.endpoint.method} {tc.endpoint.url})")
        
if endpoints.exists():
    print(f"\n📋 Endpoints Found:")
    for ep in endpoints[:10]:  # Show first 10
        print(f"  - {ep.method} {ep.url}")
