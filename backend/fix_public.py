import os
import django
import datetime
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.db import connection

print("Patching Public Schema...")

sql_commands = [
    # Create Collection
    """
    CREATE TABLE IF NOT EXISTS public.core_collection (
        id uuid NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        description text,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        project_id uuid NOT NULL REFERENCES public.core_project(id) DEFERRABLE INITIALLY DEFERRED
    );
    """,
    # Create TestData
    """
    CREATE TABLE IF NOT EXISTS public.core_testdata (
        id uuid NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        file varchar(100) NOT NULL,
        file_type varchar(10) NOT NULL,
        uploaded_at timestamp with time zone NOT NULL,
        row_count integer NOT NULL,
        project_id uuid NOT NULL REFERENCES public.core_project(id) DEFERRABLE INITIALLY DEFERRED
    );
    """,
    # Add Columns (Postgres style)
    "ALTER TABLE public.core_endpoint ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.core_collection(id) DEFERRABLE INITIALLY DEFERRED;",
    "ALTER TABLE public.core_bulktestrun ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.core_collection(id) DEFERRABLE INITIALLY DEFERRED;",
    "ALTER TABLE public.core_testresult ADD COLUMN IF NOT EXISTS data_row_index integer;",
    "ALTER TABLE public.core_testresult ADD COLUMN IF NOT EXISTS test_data_id uuid REFERENCES public.core_testdata(id) DEFERRABLE INITIALLY DEFERRED;",
    
    # Mark Migration Applied
    """
    INSERT INTO public.django_migrations (app, name, applied)
    VALUES ('core', '0010_testresult_data_row_index_collection_and_more', NOW())
    ON CONFLICT DO NOTHING;
    """
]

cursor = connection.cursor()
for i, sql in enumerate(sql_commands):
    try:
        cursor.execute(sql)
        print(f"[{i+1}] SQL Executed.")
    except Exception as e:
        print(f"[{i+1}] Error: {e}")

print("Public schema patched.")
