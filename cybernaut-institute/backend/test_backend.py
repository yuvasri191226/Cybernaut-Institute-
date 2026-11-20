"""
test_backend.py - Comprehensive Unit & Integration Test Suite
==============================================================
Tests:
1. Werkzeug password hashing and verification against seed.sql demo users
2. JWT generation, decoding, expiration handling, and auth decorators
3. AI Service summarization, Tamil translation, and Q&A engine
4. Flask App Factory, route registration, CORS, error handling
5. Mocked API endpoints for Auth, Announcements, Admin, Bookmarks, Notifications, AI
"""

import unittest
from unittest.mock import patch, MagicMock
from werkzeug.security import check_password_hash
from app import create_app
from config import Config
from utils.auth_middleware import generate_token, decode_token
from utils.ai_service import (
    AIService,
    deterministic_summarize,
    deterministic_translate_tamil,
    answer_announcement_question
)


class TestCybernautBackend(unittest.TestCase):
    """Test suite for Cybernaut Institute Flask Backend."""

    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

        # Admin user test token
        self.admin_user = {
            "user_id": 1,
            "email": "admin.it@cybernaut.edu.in",
            "role": "admin",
            "full_name": "Dr. R. Meenakshi",
            "department": "IT",
            "academic_year": "All"
        }
        self.admin_token = generate_token(self.admin_user)

        # Student user test token
        self.student_user = {
            "user_id": 3,
            "email": "arun.kumar@cybernaut.edu.in",
            "role": "student",
            "full_name": "Arun Kumar",
            "department": "CSE",
            "academic_year": "Third Year"
        }
        self.student_token = generate_token(self.student_user)

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Password Hash & Demo User Verification
    # ──────────────────────────────────────────────────────────────────────────
    def test_demo_user_passwords(self):
        """Verify the 5 demo accounts against seed.sql Werkzeug pbkdf2:sha256 hashes."""
        demo_accounts = [
            ("Dr. R. Meenakshi", "admin.it@cybernaut.edu.in", "Admin@123",
             "pbkdf2:sha256:1000000$R0VPV8XItUxLNBmq$2fd3bc88d94aae0c2f16d9341225477dca1b89ab9a292dacd8839a6fb053277c"),
            ("Dr. S. Karthikeyan", "admin.cse@cybernaut.edu.in", "Admin@123",
             "pbkdf2:sha256:1000000$RxXE2QbkVopyhUkb$91c68a97015ff7283102cc29318fc8d0536e3f311104ae832d1090e4a34c9766"),
            ("Arun Kumar", "arun.kumar@cybernaut.edu.in", "Student@123",
             "pbkdf2:sha256:1000000$OJV5X3t7iZFUD4n3$bdaac382a206371136fc3a19acbe51bd17fa1e04a1d7e1c2d1b4ac81ff51a35b"),
            ("Priya Lakshmi", "priya.lakshmi@cybernaut.edu.in", "Student@123",
             "pbkdf2:sha256:1000000$V20BEIxPsrMKVgIa$3cf919534324a326e6ba1763daae032a1a39068679ddc3ccb5a87d51b12cc2f6"),
            ("Vignesh Raja", "vignesh.raja@cybernaut.edu.in", "Student@123",
             "pbkdf2:sha256:1000000$KjC1hY1eQTC0jrW9$5f7bc925f10317ed1197045ed219932283ee4005a5b21a9c1c6735e5bce84cc5"),
        ]

        for name, email, plaintext, expected_hash in demo_accounts:
            self.assertTrue(
                check_password_hash(expected_hash, plaintext),
                f"Password verification failed for {name} ({email})"
            )
            # Ensure wrong password fails
            self.assertFalse(
                check_password_hash(expected_hash, "WrongPassword"),
                f"Wrong password check failed for {name}"
            )

    # ──────────────────────────────────────────────────────────────────────────
    # 2. JWT Generation & Verification
    # ──────────────────────────────────────────────────────────────────────────
    def test_jwt_generation_and_decoding(self):
        """Test token creation, payload extraction, and expiration decoding."""
        user_data = {
            "user_id": 3,
            "email": "arun.kumar@cybernaut.edu.in",
            "role": "student",
            "full_name": "Arun Kumar",
            "department": "CSE",
            "academic_year": "Third Year"
        }
        token = generate_token(user_data)
        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 20)

        payload = decode_token(token)
        self.assertEqual(payload["user_id"], 3)
        self.assertEqual(payload["email"], "arun.kumar@cybernaut.edu.in")
        self.assertEqual(payload["role"], "student")
        self.assertIn("exp", payload)

    # ──────────────────────────────────────────────────────────────────────────
    # 3. AI Service Tests
    # ──────────────────────────────────────────────────────────────────────────
    def test_ai_summarization(self):
        """Test AI summarization produces bullet points and identifies action."""
        title = "End Semester Examination Timetable - November 2026"
        desc = "The End Semester Examination timetable for all undergraduate programmes has been published. Hall tickets will be available from 24 November 2026."

        res = deterministic_summarize(title, desc)
        self.assertIn("summary", res)
        self.assertIn("key_points", res)
        self.assertTrue(len(res["key_points"]) > 0)
        self.assertIn("action_required", res)

    def test_ai_translation_tamil(self):
        """Test Tamil translation generator."""
        title = "Placement Drive"
        desc = "Campus placement drive will begin on 22 November."
        tamil = deterministic_translate_tamil(title, desc)
        self.assertIsInstance(tamil, str)
        self.assertTrue(len(tamil) > 10)

    def test_ai_question_answering(self):
        """Test interactive contextual Q&A logic."""
        context = "Hall tickets will be available from 24 November 2026 through the Examination Cell portal. Registration deadline is 20 November 2026."

        # Question with answer in context
        q1 = "When will hall tickets be available?"
        ans1 = answer_announcement_question(q1, context)
        self.assertTrue(ans1["found"])
        self.assertIn("24 November 2026", ans1["answer"])

        # Question about something NOT mentioned
        q2 = "What is the fee for bus transport?"
        ans2 = answer_announcement_question(q2, context)
        self.assertFalse(ans2["found"])
        self.assertIn("not mentioned", ans2["answer"].lower())

    # ──────────────────────────────────────────────────────────────────────────
    # 4. App Factory & Core Routes
    # ──────────────────────────────────────────────────────────────────────────
    def test_root_and_health_routes(self):
        """Test root identity and health endpoints."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["institution"], "Cybernaut Institute of Technology")
        self.assertIn("health", data["endpoints"])

        res_health = self.client.get("/api/health")
        self.assertIn(res_health.status_code, (200, 503))
        health_data = res_health.get_json()
        self.assertIn("database", health_data)

    def test_error_handlers(self):
        """Test 404 error handler returns structured JSON."""
        res_404 = self.client.get("/api/non-existent-route-999")
        self.assertEqual(res_404.status_code, 404)
        data_404 = res_404.get_json()
        self.assertEqual(data_404["error"], "Not Found")

    # ──────────────────────────────────────────────────────────────────────────
    # 5. Mocked Endpoint Integration Tests
    # ──────────────────────────────────────────────────────────────────────────
    @patch("routes.auth_routes.query_db")
    def test_login_flow(self, mock_query):
        """Test login endpoint with valid and invalid credentials."""
        mock_query.return_value = {
            "user_id": 1,
            "register_number": None,
            "full_name": "Dr. R. Meenakshi",
            "email": "admin.it@cybernaut.edu.in",
            "password_hash": "pbkdf2:sha256:1000000$R0VPV8XItUxLNBmq$2fd3bc88d94aae0c2f16d9341225477dca1b89ab9a292dacd8839a6fb053277c",
            "role": "admin",
            "department": "IT",
            "academic_year": "All",
            "preferred_language": "English",
            "is_active": True
        }

        # Valid login
        res = self.client.post("/api/login", json={
            "username": "admin.it@cybernaut.edu.in",
            "password": "Admin@123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("token", data)
        self.assertEqual(data["role"], "admin")
        self.assertEqual(data["user"]["full_name"], "Dr. R. Meenakshi")

        # Invalid password
        res_fail = self.client.post("/api/login", json={
            "username": "admin.it@cybernaut.edu.in",
            "password": "WrongPassword"
        })
        self.assertEqual(res_fail.status_code, 401)

    @patch("routes.announcement_routes.query_db")
    def test_announcements_feed_format(self, mock_query):
        """Test announcement feed returns array structure expected by api.js."""
        mock_query.return_value = [
            {
                "id": 1,
                "title": "End Semester Exam",
                "description": "Exam timetable published.",
                "category": "Examination",
                "department": "All Departments",
                "target_year": "All Years",
                "announcement_type": "Exam Timetable",
                "published_date": "2026-11-15 09:00:00",
                "deadline_date": "2026-11-24 17:00:00",
                "updated_date": None,
                "is_updated": False,
                "update_count": 0,
                "is_important": True,
                "source_website": "Cybernaut Examination Cell",
                "source_url": "https://exam.cybernaut.edu.in/notices/end-sem",
                "verification_status": "Verified",
                "verification_note": "Verified note"
            }
        ]

        res = self.client.get("/api/announcements")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)
        item = data[0]
        self.assertEqual(item["id"], 1)
        self.assertEqual(item["title"], "End Semester Exam")
        self.assertIn("attachments", item)
        self.assertIn("ai_summary", item)

    @patch("utils.auth_middleware.query_db")
    @patch("routes.admin_routes.query_db")
    def test_admin_statistics_route(self, mock_admin_query, mock_auth_query):
        """Test admin statistics endpoint matching admin.js expectations."""
        mock_auth_query.return_value = {
            "user_id": 1,
            "role": "admin",
            "is_active": True,
            "full_name": "Dr. R. Meenakshi",
            "email": "admin.it@cybernaut.edu.in"
        }
        mock_admin_query.return_value = {
            "total_announcements": 10,
            "verified_announcements": 7,
            "pending_announcements": 2,
            "rejected_announcements": 1,
            "important_announcements": 3,
            "total_registered_students": 45,
            "total_scraping_runs": 8,
            "last_successful_scrape": "2026-11-20 12:00:00"
        }

        res = self.client.get(
            "/api/admin/statistics",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(res.status_code, 200)
        stats = res.get_json()
        self.assertEqual(stats["total"], 10)
        self.assertEqual(stats["verified"], 7)
        self.assertEqual(stats["review"], 2)
        self.assertEqual(stats["needs_review"], 2)
        self.assertEqual(stats["students"], 45)

    @patch("utils.auth_middleware.query_db")
    def test_admin_route_forbidden_for_students(self, mock_auth_query):
        """Test that regular students receive 403 Forbidden on admin endpoints."""
        mock_auth_query.return_value = {
            "user_id": 3,
            "role": "student",
            "is_active": True,
            "full_name": "Arun Kumar",
            "email": "arun.kumar@cybernaut.edu.in"
        }

        res = self.client.get(
            "/api/admin/statistics",
            headers={"Authorization": f"Bearer {self.student_token}"}
        )
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertEqual(data["error"], "Forbidden")

    @patch("routes.ai_routes.query_db")
    @patch("routes.ai_routes.execute_db")
    def test_ai_assistant_ask_route(self, mock_exec, mock_query):
        """Test POST /api/assistant/ask endpoint."""
        mock_query.return_value = {
            "title": "Infosys Campus Drive",
            "description": "Infosys placement drive will take place on 28 November. Eligible: final year CSE and IT.",
            "department": "CSE, IT",
            "target_year": "Fourth Year",
            "deadline_date": "2026-11-25"
        }

        res = self.client.post("/api/assistant/ask", json={
            "question": "When is the Infosys placement drive?",
            "announcement_id": 2
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("answer", data)
        self.assertTrue(data["found"])


if __name__ == "__main__":
    unittest.main()
