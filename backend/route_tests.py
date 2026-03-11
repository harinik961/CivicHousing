import unittest
from app import app

class TestRoutes(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True
    def test_housing_endpoint(self):
        response = self.client.get("/api/housing")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data["data"], list)
    def test_housing_response_structure(self):
        response = self.client.get("/api/housing")
        data = response.get_json()
        self.assertIn("data", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertIn("pages", data)
    def test_housing_id(self):
        response = self.client.get("/api/housing/26")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("project_name", data)
        self.assertIn("address", data)
        self.assertIn("zip_code", data)
        self.assertIn("unit_type", data)
        self.assertIn("council_district", data)
        self.assertIn("latitude", data)
        self.assertIn("longitude", data)
    def test_housing_invalid_id(self):
        response = self.client.get("/api/housing/999999")
        self.assertEqual(response.status_code, 404)
    def test_community_endpoint(self):
        response = self.client.get("/api/community")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data["data"], list)

    def test_community_response_structure(self):
        response = self.client.get("/api/community")
        data = response.get_json()
        self.assertIn("data", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertIn("pages", data)
    def test_community_by_id(self):
        response = self.client.get("/api/community/35")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("county", data)
        self.assertIn("zip_code", data)
        self.assertIn("population", data)
        self.assertIn("crime_index", data)
        self.assertIn("transit_score", data)

    def test_community_invalid_id(self):
        response = self.client.get("/api/community/999999")
        self.assertEqual(response.status_code, 404)

    def test_transportation_endpoint(self):
        response = self.client.get("/api/transportation")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIsInstance(data["data"], list)

    def test_transportation_response_structure(self):
        response = self.client.get("/api/transportation")
        data = response.get_json()
        self.assertIn("data", data)
        self.assertIn("total", data)
        self.assertIn("page", data)
        self.assertIn("pages", data)

    def test_transportation_by_id(self):
        response = self.client.get("/api/transportation/1")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("stop_name", data)
        self.assertIn("stop_id", data)
        self.assertIn("latitude", data)
        self.assertIn("longitude", data)
        self.assertIn("transport_type", data)

    def test_transportation_invalid_id(self):
        response = self.client.get("/api/transportation/999999")
        self.assertEqual(response.status_code, 404)
if __name__ == "__main__":
    unittest.main()
