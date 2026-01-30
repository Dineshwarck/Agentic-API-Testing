import os
import django

from django.test import RequestFactory
from core.router import get_test_history, get_flaky_tests, get_test_trends, get_collection_health
from core.models import Project

def verify():
    print("Starting verification...")
    try:
        p = Project.objects.first()
        if not p:
            print("No projects found, creating one...")
            p = Project.objects.create(name="Test Project")
            
        print(f"Testing with Project ID: {p.id}")
        factory = RequestFactory()
        req = factory.get('/')
        
        # Test History
        print("Testing get_test_history...")
        get_test_history(req, project_id=p.id)
        print("✅ History Endpoint OK")
        
        # Test Trends
        print("Testing get_test_trends...")
        get_test_trends(req, project_id=p.id)
        print("✅ Trends Endpoint OK")
        
        # Test Flaky
        print("Testing get_flaky_tests...")
        get_flaky_tests(req, project_id=p.id)
        print("✅ Flaky Tests Endpoint OK")
        
        # Test Collection Health
        print("Testing get_collection_health...")
        get_collection_health(req, project_id=p.id)
        print("✅ Collection Health Endpoint OK")
        
        print("\n🎉 VERIFICATION SUCCESS: All report queries are valid!")
        
    except Exception as e:
        print("\n❌ VERIFICATION FAILED")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify()
