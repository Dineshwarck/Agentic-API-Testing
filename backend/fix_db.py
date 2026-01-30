from django.db import connection
try:
    cursor = connection.cursor()
    cursor.execute("SET search_path TO demo")
    print("Dropping Tables...")
    cursor.execute("DROP TABLE IF EXISTS core_collection CASCADE")
    cursor.execute("DROP TABLE IF EXISTS core_testdata CASCADE")
    print("Dropping Columns...")
    try:
        cursor.execute("ALTER TABLE core_testresult DROP COLUMN IF EXISTS data_row_index")
    except Exception as e:
        print(e)
    try:
        cursor.execute("ALTER TABLE core_endpoint DROP COLUMN IF EXISTS collection_id")
    except Exception as e:
        print(e)
    try:
        cursor.execute("ALTER TABLE core_bulktestrun DROP COLUMN IF EXISTS collection_id")
    except Exception as e:
        print(e)
    print("Cleanup Finished")
except Exception as e:
    print(f"Error: {e}")
