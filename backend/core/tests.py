import json
import uuid
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Project, Endpoint, Document
from urllib.parse import urlencode

class APITestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.content_type = "application/json"

    def test_health(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_test_endpoint(self):
        response = self.client.get("/api/test")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"message": "Test successful"})

class ProjectTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.project_data = {
            "name": "Test Project",
            "description": "A test project description",
            # "repository_url": "http://example.com/repo" # Removed: Not in Model
        }
        self.project = Project.objects.create(**self.project_data)

    def test_list_projects(self):
        response = self.client.get("/api/projects")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        self.assertEqual(data[0]["name"], self.project_data["name"])

    def test_create_project(self):
        new_project_data = {
            "name": "New Project",
            "description": "New description",
            # "repository_url": "http://example.com/new" # Removed
        }
        response = self.client.post(
            "/api/projects",
            data=json.dumps(new_project_data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], new_project_data["name"])
        self.assertTrue(Project.objects.filter(id=data["id"]).exists())

    def test_get_project(self):
        response = self.client.get(f"/api/projects/{self.project.id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], str(self.project.id))

    def test_update_project(self):
        update_data = {
            "name": "Updated Project Name"
        }
        response = self.client.put(
            f"/api/projects/{self.project.id}",
            data=json.dumps(update_data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "Updated Project Name")

    def test_delete_project(self):
        response = self.client.delete(f"/api/projects/{self.project.id}")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Project.objects.filter(id=self.project.id).exists())

class EndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.project = Project.objects.create(name="Endpoint Project", description="For Endpoints")
        self.endpoint_data = {
            "url": "/api/users", # Changed from path
            "method": "GET",
            "description": "Get users",
            "body_schema": {}, # Changed from request_schema
            "response_schema": {}
        }
        self.endpoint = Endpoint.objects.create(project=self.project, **self.endpoint_data)

    def test_list_endpoints(self):
        response = self.client.get(f"/api/projects/{self.project.id}/endpoints")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["url"], self.endpoint_data["url"]) # Changed from path

    def test_create_endpoint(self):
        new_endpoint_data = {
            "name": "Create Item",
            "url": "/api/items", # Changed from path
            "method": "POST",
            "description": "Create item",
            "body_schema": {}, # Changed from request_schema
            "response_schema": {}
        }
        response = self.client.post(
            f"/api/projects/{self.project.id}/endpoints",
            data=json.dumps(new_endpoint_data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["url"], new_endpoint_data["url"]) # Changed from path
        
        # Verify persistence
        endpoint_id = data["id"]
        endpoint = Endpoint.objects.get(id=endpoint_id)
        self.assertEqual(endpoint.project_id, self.project.id)

    def test_get_endpoint(self):
        response = self.client.get(f"/api/endpoints/{self.endpoint.id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], str(self.endpoint.id))

    def test_update_endpoint(self):
        update_data = {
            "description": "Updated description"
        }
        response = self.client.put(
            f"/api/endpoints/{self.endpoint.id}",
            data=json.dumps(update_data),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.endpoint.refresh_from_db()
        self.assertEqual(self.endpoint.description, "Updated description")

    def test_delete_endpoint(self):
        response = self.client.delete(f"/api/endpoints/{self.endpoint.id}")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Endpoint.objects.filter(id=self.endpoint.id).exists())

class DocumentTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.project = Project.objects.create(name="Doc Project", description="For Docs")

    def test_upload_document(self):
        file_content = b"This is a test document."
        uploaded_file = SimpleUploadedFile("test_doc.txt", file_content, content_type="text/plain")
        
        # Ninja API likely expects these as Query params since they are not Form(...) fields
        # However, since it is a POST with File, params might be mixed.
        # Let's try sending them as Query parameters in the URL.
        
        query_params = {
            "project_id": self.project.id,
            "doc_type": "REQUIREMENTS" # Changed to vary from default OTHER
        }
        url = f"/api/documents?{urlencode(query_params)}"
        
        # We only send 'file' in the body
        data = {
            "file": uploaded_file,
        }
        
        response = self.client.post(
            url,
            data=data
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "test_doc.txt")
        self.assertEqual(data["doc_type"], "REQUIREMENTS")
        
        # Verify persistence
        doc_id = data["id"]
        doc = Document.objects.get(id=doc_id)
        self.assertEqual(doc.project_id, self.project.id)
