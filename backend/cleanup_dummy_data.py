#!/usr/bin/env python
"""
Cleanup script to remove all dummy endpoints and test cases from ABC_User_API workspace
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

# Count before deletion
endpoints = Endpoint.objects.filter(project=project)
test_cases = TestCase.objects.filter(endpoint__project=project)

endpoint_count = endpoints.count()
test_case_count = test_cases.count()

print(f"\n📊 Current Status:")
print(f"  - Endpoints: {endpoint_count}")
print(f"  - Test Cases: {test_case_count}")

if endpoint_count == 0 and test_case_count == 0:
    print("\n✨ Already clean! No dummy data found.")
    exit(0)

# Delete
print(f"\n🗑️  Deleting...")
deleted_tests = test_cases.delete()
deleted_endpoints = endpoints.delete()

print(f"\n✅ Cleanup Complete!")
print(f"  - Deleted {deleted_tests[0]} test cases")
print(f"  - Deleted {deleted_endpoints[0]} endpoints")
print(f"\n🎉 ABC_User_API workspace is now clean and ready for real data!")
