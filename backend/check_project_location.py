import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection
from django_tenants.utils import schema_context
import uuid

project_id = uuid.UUID("e3d13f16-79fa-49e6-aa66-ca5538098901")

print("="*60)
print("CHECKING WHERE PROJECT DATA EXISTS")
print("="*60)

# Check public schema
print("\n1. CHECKING 'public' SCHEMA:")
with schema_context('public'):
    from core.models import Project
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_schema()")
        print(f"   Current schema: {cursor.fetchone()[0]}")
    
    try:
        project = Project.objects.get(id=project_id)
        print(f"   ✓ FOUND PROJECT IN PUBLIC: {project.name}")
        print(f"   Project table: core_project")
    except Exception as e:
        print(f"   ✗ NOT in public schema: {e}")

# Check demo schema
print("\n2. CHECKING 'demo' SCHEMA:")
with schema_context('demo'):
    from core.models import Project
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_schema()")
        print(f"   Current schema: {cursor.fetchone()[0]}")
    
    try:
        project = Project.objects.get(id=project_id)
        print(f"   ✓ FOUND PROJECT IN DEMO: {project.name}")
    except Exception as e:
        print(f"   ✗ NOT in demo schema: {e}")

# List all projects in each schema
print("\n3. ALL PROJECTS BY SCHEMA:")
print("\n   PUBLIC schema projects:")
with schema_context('public'):
    from core.models import Project
    for proj in Project.objects.all()[:5]:
        print(f"      - {proj.id}: {proj.name}")

print("\n   DEMO schema projects:")
with schema_context('demo'):
    from core.models import Project
    for proj in Project.objects.all()[:5]:
        print(f"      - {proj.id}: {proj.name}")

# Check which schema the tenant middleware would use for demo.localhost
print("\n4. TENANT ROUTING CHECK:")
from customers.models import Client, Domain

demo_domain = Domain.objects.filter(domain='demo.localhost').first()
if demo_domain:
    tenant = demo_domain.tenant
    print(f"   Domain 'demo.localhost' → Tenant: {tenant.schema_name}")
    print(f"   This means requests to demo.localhost should use schema: {tenant.schema_name}")
else:
    print("   ✗ Domain 'demo.localhost' not found!")

print("\n" + "="*60)
