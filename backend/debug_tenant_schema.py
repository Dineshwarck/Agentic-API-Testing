import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django_tenants.utils import get_tenant_model

Tenant = get_tenant_model()

def check_columns():
    tenants = Tenant.objects.all()
    print(f"Found {tenants.count()} tenants")
    
    for tenant in tenants:
        print(f"\n--- Checking Tenant: {tenant.schema_name} ---")
        connection.set_tenant(tenant)
        with connection.cursor() as cursor:
            try:
                cursor.execute(
                    "SELECT table_schema, column_name FROM information_schema.columns WHERE table_name = 'core_endpoint' ORDER BY table_schema;"
                )
                rows = cursor.fetchall()
                print(f"Columns found in specific schemas:")
                found_in_current = False
                current_schema = tenant.schema_name
                
                columns_by_schema = {}
                for schema, col in rows:
                    if schema not in columns_by_schema:
                        columns_by_schema[schema] = []
                    columns_by_schema[schema].append(col)
                
                for schema, cols in columns_by_schema.items():
                    # Only print if it matches the current tenant we are "checking" or verify all?
                    # Information schema shows ALL.
                    if 'parameters' not in cols:
                         print(f"  [SCHEMA: {schema}] ❌ 'parameters' MISSING")
                    else:
                         print(f"  [SCHEMA: {schema}] ✅ 'parameters' EXISTS")

                # Verify explicitly for the current tenant target
                if current_schema in columns_by_schema and 'parameters' in columns_by_schema[current_schema]:
                    print(f"CONCLUSION for '{current_schema}': ✅ Column Verified")
                else:
                    print(f"CONCLUSION for '{current_schema}': ❌ Column MISSING")

            except Exception as e:
                print(f"Error inspecting table: {e}")

if __name__ == "__main__":
    check_columns()
