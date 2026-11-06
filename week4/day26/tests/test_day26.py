"""Unit tests for the Day 26 mobile AI gateway."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlsplit

DAY26_AI_DIR = Path(__file__).resolve().parents[1] / "ai"
sys.path.insert(0, str(DAY26_AI_DIR))

from mobile_ai_service import MobileAIService


class MobileAIServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = MobileAIService()
        self.client = self.service.app.test_client()
        self.forwarded_calls: list[dict[str, Any]] = []

        def fake_forward(
            path: str,
            method: str = "POST",
            payload: dict[str, Any] | None = None,
        ) -> tuple[dict[str, Any], int]:
            self.forwarded_calls.append({
                "path": path,
                "method": method,
                "payload": payload,
            })

            if path == "/health":
                return {"success": True, "status": "healthy"}, 200

            if path.startswith("/api/ai/memory?"):
                return {"success": True, "memory": []}, 200

            if path == "/api/ai/memory/clear":
                return {"success": True, "message": "Memory cleared."}, 200

            if path == "/api/ai/chat":
                return {
                    "success": True,
                    "response": "Hello from the test assistant.",
                    "thread_id": "mobile-test-thread",
                }, 200

            if path == "/api/ai/generate":
                return {
                    "success": True,
                    "content": "Generated test content.",
                }, 200

            if path == "/api/ai/recommendations":
                return {
                    "success": True,
                    "recommendations": [{"id": "test", "title": "Test"}],
                }, 200

            if path == "/api/ai/recommendations/feedback":
                return {"success": True, "message": "Feedback received."}, 200

            if path == "/api/ai/recommendations/profile":
                return {
                    "success": True,
                    "profile": {"interests": ["AI"]},
                }, 200

            return {"success": False, "error": "Unknown test route."}, 404

        self.service._forward = fake_forward  # type: ignore[method-assign]

    def test_health_forwards_to_day25(self) -> None:
        response = self.client.get("/mobile/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "healthy")
        self.assertEqual(self.forwarded_calls[0]["path"], "/health")

    def test_chat_requires_message(self) -> None:
        response = self.client.post(
            "/mobile/chat",
            json={"thread_id": "test-thread"},
        )
        self.assertEqual(response.status_code, 400)

    def test_chat_requires_thread_id(self) -> None:
        response = self.client.post(
            "/mobile/chat",
            json={"message": "Hello"},
        )
        self.assertEqual(response.status_code, 400)

    def test_chat_forwards_persistent_thread(self) -> None:
        response = self.client.post(
            "/mobile/chat",
            json={
                "message": "  Hello assistant  ",
                "thread_id": "mobile-test-thread",
                "agent_type": "conversation",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.forwarded_calls[-1]["payload"]["message"],
            "Hello assistant",
        )
        self.assertEqual(
            self.forwarded_calls[-1]["payload"]["thread_id"],
            "mobile-test-thread",
        )

    def test_chat_rejects_invalid_agent(self) -> None:
        response = self.client.post(
            "/mobile/chat",
            json={
                "message": "Hello",
                "thread_id": "test-thread",
                "agent_type": "unknown",
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_memory_requires_thread_id(self) -> None:
        response = self.client.get("/mobile/memory")
        self.assertEqual(response.status_code, 400)

    def test_memory_forwards_thread_id(self) -> None:
        response = self.client.get(
            "/mobile/memory?thread_id=mobile-test-thread"
        )
        self.assertEqual(response.status_code, 200)

        forwarded_path = self.forwarded_calls[-1]["path"]
        query = parse_qs(urlsplit(forwarded_path).query)
        self.assertEqual(query["thread_id"], ["mobile-test-thread"])

    def test_clear_memory_forwards_thread_id(self) -> None:
        response = self.client.post(
            "/mobile/memory/clear",
            json={"thread_id": "mobile-test-thread"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.forwarded_calls[-1]["path"],
            "/api/ai/memory/clear",
        )
        self.assertEqual(
            self.forwarded_calls[-1]["payload"]["thread_id"],
            "mobile-test-thread",
        )

    def test_content_generation_requires_topic(self) -> None:
        response = self.client.post(
            "/mobile/generate",
            json={"content_type": "article"},
        )
        self.assertEqual(response.status_code, 400)

    def test_content_generation_forwards_request(self) -> None:
        response = self.client.post(
            "/mobile/generate",
            json={
                "content_type": "article",
                "topic": "Responsible AI",
                "tone": "professional",
                "length": "short",
                "keywords": ["AI", "software"],
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.forwarded_calls[-1]["path"],
            "/api/ai/generate",
        )
        self.assertEqual(
            self.forwarded_calls[-1]["payload"]["topic"],
            "Responsible AI",
        )

    def test_recommendations_reject_more_than_eight(self) -> None:
        response = self.client.post(
            "/mobile/recommendations",
            json={
                "user_profile": {"interests": ["AI"]},
                "max_recommendations": 9,
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_recommendations_forward_profile(self) -> None:
        response = self.client.post(
            "/mobile/recommendations",
            json={
                "user_profile": {"interests": ["AI", "Python"]},
                "max_recommendations": 5,
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.forwarded_calls[-1]["path"],
            "/api/ai/recommendations",
        )

    def test_feedback_accepts_rating_four(self) -> None:
        response = self.client.post(
            "/mobile/recommendations/feedback",
            json={
                "rating": 4,
                "recommendations": [{"id": "ai-course"}],
                "user_profile": {"interests": ["AI"]},
            },
        )
        self.assertEqual(response.status_code, 200)

    def test_feedback_rejects_rating_five(self) -> None:
        response = self.client.post(
            "/mobile/recommendations/feedback",
            json={
                "rating": 5,
                "recommendations": [],
                "user_profile": {},
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_profile_forwards_get_request(self) -> None:
        response = self.client.get("/mobile/profile")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.forwarded_calls[-1]["path"],
            "/api/ai/recommendations/profile",
        )
        self.assertEqual(self.forwarded_calls[-1]["method"], "GET")


if __name__ == "__main__":
    unittest.main(verbosity=2)