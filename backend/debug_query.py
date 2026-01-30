import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import TestResult, Project
from django.db.models import Count, Sum, Case, When, IntegerField, Q, F

def test_queries():
    print("Testing Aggregation Queries...")
    
    # 1. Inspect Field
    print("\n--- Inspecting 'passed' field ---")
    f = TestResult._meta.get_field('passed')
    print(f"Field Type: {type(f)}")
    
    p = Project.objects.first()
    qs = TestResult.objects.filter(test_run__project=p)
    
    # 2. Try Count with Filter (Old method)
    print("\n--- 2. Testing Count(filter=...) ---")
    try:
        q = qs.values('test_run').annotate(
            passed=Count('id', filter=Q(passed=True))
        )
        print("SQL:", q.query)
        list(q) # Force execution
        print("Valid!")
    except Exception as e:
        print("FAILED:", e)

    # 3. Try Sum with Case (Current method)
    print("\n--- 3. Testing Sum(Case(...)) ---")
    try:
        q = qs.values('test_run').annotate(
            passed=Sum(Case(When(passed=True, then=1), default=0, output_field=IntegerField()))
        )
        print("SQL:", q.query)
        print("Valid!")
    except Exception as e:
        print("FAILED:", e)

    # 4. Try Count with Case
    print("\n--- 4. Testing Count(Case(...)) ---")
    try:
        q = qs.values('test_run').annotate(
            passed=Count(Case(When(passed=True, then=1)))
        )
        print("SQL:", q.query)
        print("Valid!")
    except Exception as e:
        print("FAILED:", e)

if __name__ == "__main__":
    test_queries()
