import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

# SQL to create the table
create_table_sql = """
CREATE TABLE IF NOT EXISTS core_environment (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    project_id UUID NOT NULL REFERENCES core_project(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS core_environment_project_id_idx ON core_environment(project_id);
"""

# Execute in PUBLIC schema (where the actual project data is)
with schema_context('public'):
    with connection.cursor() as cursor:
        cursor.execute(create_table_sql)
        print("✓ Created core_environment table in PUBLIC schema")
        
print("\nVerifying table exists in PUBLIC schema...")
with schema_context('public'):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'core_environment'
        """)
        result = cursor.fetchone()
        if result:
            print(f"✓ Table confirmed in public schema: {result[0]}")
        else:
            print("✗ Table NOT found in public schema!")

# Test querying Environment model in public schema
print("\nTesting Environment model query in public schema...")
with schema_context('public'):
    from core.models import Environment
    try:
        count = Environment.objects.count()
        print(f"✓ Successfully queried Environment model in PUBLIC")
        print(f"✓ Found {count} environment(s)")
    except Exception as e:
        print(f"✗ ERROR: {e}")
