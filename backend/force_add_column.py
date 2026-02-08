
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def force_add_column():
    print("--- FORCING ADD COLUMN 'parameters' TO public.core_endpoint ---")
    
    with connection.cursor() as cursor:
        # Check if column exists first to avoid error
        cursor.execute(
            "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'core_endpoint' AND column_name = 'parameters';"
        )
        if cursor.fetchone():
            print("Column 'parameters' ALREADY EXISTS in 'public' schema. Skipping.")
            return

        try:
            # Force add column
            print("Executing ALTER TABLE...")
            cursor.execute('ALTER TABLE "public"."core_endpoint" ADD COLUMN "parameters" jsonb DEFAULT \'[]\'::jsonb;')
            print("✅ SUCCESS: Column added.")
        except Exception as e:
            print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    force_add_column()
