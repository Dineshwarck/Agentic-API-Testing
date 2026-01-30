import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django_tenants.utils import schema_context

# Project ID from the error log
project_id = 'e3d13f16-79fa-49e6-aa66-ca5538098901'

print("=" * 80)
print("CREATING core_bulktestrun TABLE IN CORRECT SCHEMA")
print("=" * 80)

# SQL to create the table
create_table_sql = """
CREATE TABLE IF NOT EXISTS core_bulktestrun (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES core_project(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_tests INTEGER NOT NULL DEFAULT 0,
    completed_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    parallel BOOLEAN NOT NULL DEFAULT FALSE,
    max_workers INTEGER NOT NULL DEFAULT 5,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255) NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS core_bulktestrun_project_id_idx ON core_bulktestrun(project_id);
"""

# Try PUBLIC schema first (where we know project data is)
print("\n1. CHECKING PUBLIC SCHEMA:")
with schema_context('public'):
    with connection.cursor() as cursor:
        # Check if project exists
        cursor.execute("SELECT id, name FROM core_project WHERE id = %s", [project_id])
        project = cursor.fetchone()
        
        if project:
            print(f"   ✓ Project found: {project[1]} (ID: {project[0]})")
            print(f"   ✓ Creating core_bulktestrun table in PUBLIC schema...")
            
            cursor.execute(create_table_sql)
            print(f"   ✓ Table created successfully!")
            
            # Verify
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'core_bulktestrun'
            """)
            if cursor.fetchone():
                print(f"   ✓ Verified: core_bulktestrun exists in public schema")
        else:
            print(f"   ✗ Project not found in public schema")

print("\n" + "=" * 80)
print("DONE! Backend server should now work.")
print("=" * 80)
