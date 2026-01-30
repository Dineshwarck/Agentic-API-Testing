#!/usr/bin/env python
"""
List all projects and their test case counts
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Project, Endpoint, TestCase

# Get all projects
projects = Project.objects.all()

print(f"📊 All Projects in Database:\n")
for project in projects:
    endpoints = Endpoint.objects.filter(project=project)
    test_cases = TestCase.objects.filter(endpoint__project=project)
    
    print(f"  📁 {project.name}")
    print(f"     ID: {project.id}")
    print(f"     Endpoints: {endpoints.count()}")
    print(f"     Test Cases: {test_cases.count()}")
    print()
