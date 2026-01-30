import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection
from django_tenants.utils import schema_context, get_tenant_model
from customers.models import Client

print("="*60)
print("TENANT SCHEMA DEBUGGING")
print("="*60)

# List all tenants
print("\n1. ALL TENANTS:")
for tenant in Client.objects.all():
    print(f"   - {tenant.schema_name}: {tenant.name} (domain: {tenant.get_primary_domain()})")

# Check demo schema tables
print("\n2. TABLES IN 'demo' SCHEMA:")
with schema_context('demo'):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'demo' 
            AND table_name LIKE 'core_%'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        for table in tables:
            print(f"   ✓ {table[0]}")

# Try to query Environment model
print("\n3. TESTING Environment MODEL QUERY:")
with schema_context('demo'):
    from core.models import Environment, Project
    
    # Check if we can query
    try:
        count = Environment.objects.count()
        print(f"   ✓ Successfully queried Environment model")
        print(f"   ✓ Found {count} environment(s)")
    except Exception as e:
        print(f"   ✗ ERROR querying Environment: {e}")
    
    # Check current schema
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_schema()")
        schema = cursor.fetchone()[0]
        print(f"   ✓ Current schema: {schema}")

# Check what happens with a real project ID
print("\n4. TESTING WITH ACTUAL PROJECT:")
with schema_context('demo'):
    from core.models import Project, Environment
    import uuid
    
    project_id = uuid.UUID("e3d13f16-79fa-49e6-aa66-ca5538098901")
    try:
        project = Project.objects.get(id=project_id)
        print(f"   ✓ Project found: {project.name}")
        
        # Try the exact query from the endpoint
        envs = project.environments.all()
        print(f"   ✓ Environments query successful: {envs.count()} items")
        
    except Exception as e:
        print(f"   ✗ ERROR: {e}")

print("\n" + "="*60)
