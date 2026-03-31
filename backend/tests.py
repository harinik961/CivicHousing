import unittest
from app import app
from app import (
    nearest_transport_stop_for_housing,
    app as flask_app,
    get_google_walking_distance_miles,
)
from models import Housing
from unittest.mock import patch
from datetime import datetime


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

    def test_housing_zip_filter(self):
        response = self.client.get("/api/housing?zip=78705")
        self.assertEqual(response.status_code, 200)

    def test_housing_district_filter(self):
        response = self.client.get("/api/housing?district=1")
        self.assertEqual(response.status_code, 200)

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
        response = self.client.get("/api/community/18")
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

    def test_nearest_stop_missing_coords(app):
        h = Housing(latitude=None, longitude=None)
        with flask_app.app_context():
            result = nearest_transport_stop_for_housing(h)
        assert result is None

    def test_google_distance_exception(self):
        from app import get_google_walking_distance_miles

        with patch("requests.get", side_effect=Exception):
            result = get_google_walking_distance_miles(
                30.0, -97.0, 30.1, -97.1, "not_a_key"
            )
        assert result is None

    def test_google_distance_bad_response(self):
        with patch("requests.get") as mock_get:
            json_data = {"status": "OK", "routes": []}
        mock_get.return_value.json.return_value = json_data
        mock_get.return_value.raise_for_status = lambda: None

        result = get_google_walking_distance_miles(
            30.0, -97.0, 30.1, -97.1, "not_a_key"
        )
        assert result is None

    def test_google_distance_missing_legs(self):
        json_data = {"status": "OK", "routes": []}
        with patch("requests.get") as mock_get:
            mock_get.return_value.json.return_value = json_data
            mock_get.return_value.raise_for_status = lambda: None

            result = get_google_walking_distance_miles(
                30.0, -97.0, 30.1, -97.1, "not_a_key"
            )
        assert result is None

    def test_transportation_invalid_id(self):
        response = self.client.get("/api/transportation/999999")
        self.assertEqual(response.status_code, 404)

    def test_docs_redirect(self):
        response = self.client.get("/docs")
        self.assertEqual(response.status_code, 302)

    def test_app_endpoint(self):
        response = self.client.get("/api")
        self.assertEqual(response.status_code, 200)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)

    def test_api(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_data_as_of_endpoint_shape(self):
        response = self.client.get("/api/data-as-of")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("last_synced_at", data)

        if data["last_synced_at"] is not None:
            parsed = datetime.fromisoformat(data["last_synced_at"])
            self.assertIsInstance(parsed, datetime)

    def test_data_as_of_endpoint_empty_housing_table(self):
        class DummyQuery:
            def scalar(self):
                return None

        with patch("app.db.session.query", return_value=DummyQuery()):
            response = self.client.get("/api/data-as-of")

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["last_synced_at"], None)

    def test_community_list_contains_aggregate_fields(self):
        response = self.client.get("/api/community")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        data = payload.get("data", [])
        self.assertIsInstance(data, list)

        if data:
            first = data[0]
            self.assertIn("community_total_affordable_units", first)
            self.assertIn("community_housing_count", first)

    def test_community_aggregate_fields_are_numeric(self):
        response = self.client.get("/api/community")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        data = payload.get("data", [])

        if data:
            first = data[0]
            self.assertIsInstance(first["community_total_affordable_units"], int)
            self.assertIsInstance(first["community_housing_count"], int)
            self.assertGreaterEqual(first["community_total_affordable_units"], 0)
            self.assertGreaterEqual(first["community_housing_count"], 0)

    def test_community_list_is_relation_lightweight(self):
        response = self.client.get("/api/community")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        data = payload.get("data", [])

        if data:
            first = data[0]
            self.assertNotIn("housing", first)
            self.assertNotIn("transportation", first)

    def test_transportation_list_is_relation_lightweight(self):
        response = self.client.get("/api/transportation")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        data = payload.get("data", [])

        if data:
            first = data[0]
            self.assertNotIn("communities", first)
            self.assertNotIn("housing", first)

    def test_community_detail_includes_relations(self):
        response = self.client.get("/api/community/18")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("housing", data)
        self.assertIn("transportation", data)

    def test_transportation_detail_includes_relations(self):
        response = self.client.get("/api/transportation/1")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("communities", data)
        self.assertIn("housing", data)

    def test_community_pagination_consistency(self):
        page1 = self.client.get("/api/community?page=1&per_page=5")
        page2 = self.client.get("/api/community?page=2&per_page=5")

        self.assertEqual(page1.status_code, 200)
        self.assertEqual(page2.status_code, 200)

        data1 = page1.get_json()
        data2 = page2.get_json()

        self.assertEqual(data1["page"], 1)
        self.assertEqual(data2["page"], 2)
        self.assertIn("data", data1)
        self.assertIn("data", data2)

    def test_community_sort_descending(self):
        response = self.client.get("/api/community?sort=crime_index&order=desc")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        values = [
            item.get("crime_index")
            for item in payload.get("data", [])
            if item.get("crime_index") is not None
        ]

        if len(values) > 1:
            self.assertEqual(values, sorted(values, reverse=True))


if __name__ == "__main__":
    unittest.main()
