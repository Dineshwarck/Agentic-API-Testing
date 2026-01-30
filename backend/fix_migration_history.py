import os
import django

# Setup Django Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection
from customers.models import Client

print("--- Tenant Diagnosis & Repair ---")

def fix_schema(schema_name):
    print(f"\nProcessing schema: {schema_name}")
    cursor = connection.cursor()
    try:
        cursor.execute(f"SET search_path TO {schema_name}")
    except Exception as e:
        print(f"  [ERROR] Setting search path: {e}")
        return

    # 1. Delete migration record
    try:
        cursor.execute("DELETE FROM django_migrations WHERE app='core' AND name='0010_testresult_data_row_index_collection_and_more'")
        if cursor.rowcount > 0:
            print(f"  [FIX] Removed 0010 from django_migrations")
        else:
            print(f"  [INFO] 0010 not found in django_migrations")
    except Exception as e:
        print(f"  [ERROR] Checking migrations: {e}")
        connection.rollback()

    # 2. Drop partial Tables
    for table in ['core_collection', 'core_testdata']:
        try:
            cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
            print(f"  [FIX] Dropped table {table}")
        except Exception as e:
            print(f"  [ERROR] Dropping {table}: {e}")
            connection.rollback()
            
    # 3. Drop Columns
    columns_to_drop = [
        ('core_endpoint', 'collection_id'), 
        ('core_testresult', 'data_row_index'), 
        ('core_testresult', 'test_data_id'),
        ('core_bulktestrun', 'collection_id')
    ]
    for table, col in columns_to_drop:
        try:
            # Check if column exists first to avoid error log noise? 
            # Postgres supports DROP COLUMN IF EXISTS
            cursor.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {col}")
            # We don't get feedback if it existed or not easily without query, but command succeeds.
            # print(f"  [FIX] Dropped {col} from {table} (if existed)")
        except Exception as e:
            print(f"  [ERROR] Dropping {col} from {table}: {e}")
            connection.rollback()
    
    print(f"  [DONE] Schema {schema_name} cleaned.")

# Fix 'public' schema
try:
    fix_schema('public')
except Exception as e:
    print(f"Error accessing public schema: {e}")

# Explicitly fix 'demo' schema just in case
try:
    fix_schema('demo')
except Exception as e:
    print(f"Error accessing demo schema: {e}")

# Fix Tenant Schemas
try:
    clients = Client.objects.all()
    print(f"Found {len(clients)} clients in DB")
    for client in clients:
        fix_schema(client.schema_name)
except Exception as e:
    print(f"Error iterating clients: {e}")
    
print("\n--- Repair Complete. Ready for migrate_schemas. ---")
