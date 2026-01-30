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

# Execute in demo schema
with schema_context('demo'):
    with connection.cursor() as cursor:
        cursor.execute(create_table_sql)
        print("✓ Created core_environment table in demo schema")
        
print("\nVerifying table exists...")
with schema_context('demo'):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'demo' 
            AND table_name = 'core_environment'
        """)
        result = cursor.fetchone()
        if result:
            print(f"✓ Table confirmed: {result[0]}")
        else:
            print("✗ Table NOT found!")
