"""Automated tests for the Day 25 AI Web Integration."""

from __future__ import annotations

from typing import Any

import pytest

from week4.day25.ai.web_ai_service import AIWebService


class FakeAgent:
    """Small test double implementing the Day 24 agent interface."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []
        self.cleared_threads: list[str] = []

    def chat(self, message: str, thread_id: str = "default") -> str:
        self.calls.append((message, thread_id))
        return f"Fake AI response to: {message}"

    def get_memory(self, thread_id: str = "default") -> dict[str, Any]:
        return {
            "thread_id": thread_id,
            "chat_history": [],
            "memory_variables": {"persistent": True},
        }

    def clear_memory(self, thread_id: str = "default") -> None:
        self.cleared_threads.append(thread_id)


class FakeAgentAPI:
    def __init__(self) -> None:
        self.conversation_agent = FakeAgent()
        self.langchain_agent = FakeAgent()


class FakeModel:
    """Deterministic model replacement for content-generation tests."""

    def __init__(self) -> None:
        self.prompts: list[str] = []

    def invoke(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return "Generated test content about the requested topic."


@pytest.fixture
def service(tmp_path):
    fake_api = FakeAgentAPI()
    fake_model = FakeModel()

    instance = AIWebService(
        agent_api=fake_api,
        model=fake_model,
        storage_dir=tmp_path,
    )

    instance.app.config.update(TESTING=True)

    return instance


@pytest.fixture
def client(service):
    return service.app.test_client()


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json["success"] is True
    assert response.json["status"] == "healthy"
    assert response.json["provider"] == "ollama"


def test_demo_page_is_served(client):
    response = client.get("/")

    assert response.status_code == 200
    assert b"AI Web Integration" in response.data
    assert b"chatbot-container" in response.data


def test_browser_assets_are_served(client):
    javascript = client.get("/assets/ai-chatbot.js")
    stylesheet = client.get("/assets/ai-web.css")

    assert javascript.status_code == 200
    assert b"class AIChatbot" in javascript.data

    assert stylesheet.status_code == 200
    assert b".ai-chatbot" in stylesheet.data


def test_chat_uses_conversation_agent_and_thread_id(service, client):
    response = client.post(
        "/api/ai/chat",
        json={
            "message": "Hello from the web application",
            "agent_type": "conversation",
            "thread_id": "day25-test-thread",
        },
    )

    assert response.status_code == 200
    assert response.json["success"] is True
    assert response.json["thread_id"] == "day25-test-thread"
    assert "Hello from the web application" in response.json["response"]

    calls = service.agent_api.conversation_agent.calls

    assert len(calls) == 1
    assert calls[0] == (
        "Hello from the web application",
        "day25-test-thread",
    )


def test_chat_can_select_langchain_agent(service, client):
    response = client.post(
        "/api/ai/chat",
        json={
            "message": "Calculate 12 plus 8",
            "agent_type": "langchain",
            "thread_id": "day25-langchain-thread",
        },
    )

    assert response.status_code == 200
    assert len(service.agent_api.langchain_agent.calls) == 1
    assert service.agent_api.conversation_agent.calls == []


def test_chat_rejects_empty_message(client):
    response = client.post(
        "/api/ai/chat",
        json={"message": "   "},
    )

    assert response.status_code == 400
    assert response.json["success"] is False


def test_chat_rejects_invalid_agent_type(client):
    response = client.post(
        "/api/ai/chat",
        json={
            "message": "Hello",
            "agent_type": [],
        },
    )

    assert response.status_code == 400


def test_chat_rejects_invalid_thread_id(client):
    response = client.post(
        "/api/ai/chat",
        json={
            "message": "Hello",
            "thread_id": "invalid thread id!",
        },
    )

    assert response.status_code == 400


def test_memory_can_be_retrieved(client):
    response = client.get(
        "/api/ai/memory",
        query_string={"thread_id": "memory-test-thread"},
    )

    assert response.status_code == 200
    assert response.json["success"] is True
    assert response.json["memory"]["thread_id"] == "memory-test-thread"


def test_memory_can_be_cleared(service, client):
    response = client.post(
        "/api/ai/memory/clear",
        json={"thread_id": "clear-test-thread"},
    )

    assert response.status_code == 200
    assert response.json["success"] is True

    assert service.agent_api.conversation_agent.cleared_threads == [
        "clear-test-thread"
    ]


def test_content_generation_uses_local_model(service, client):
    response = client.post(
        "/api/ai/generate",
        json={
            "content_type": "blog-post",
            "topic": "Responsible AI development",
            "tone": "professional",
            "length": "short",
            "keywords": ["AI", "safety", "engineering"],
        },
    )

    assert response.status_code == 200
    assert response.json["success"] is True
    assert "Generated test content" in response.json["content"]

    assert len(service.model.prompts) == 1
    assert "Responsible AI development" in service.model.prompts[0]
    assert "professional" in service.model.prompts[0]
    assert "safety" in service.model.prompts[0]


def test_content_generation_rejects_missing_topic(client):
    response = client.post(
        "/api/ai/generate",
        json={
            "content_type": "article",
            "topic": " ",
        },
    )

    assert response.status_code == 400
    assert response.json["success"] is False


@pytest.mark.parametrize(
    "payload",
    [
        {"content_type": [], "topic": "AI"},
        {"content_type": "article", "topic": "AI", "tone": []},
        {"content_type": "article", "topic": "AI", "length": []},
        {"content_type": "unknown", "topic": "AI"},
    ],
)
def test_content_generation_rejects_invalid_fields(client, payload):
    response = client.post("/api/ai/generate", json=payload)

    assert response.status_code == 400
    assert response.json["success"] is False


def test_recommendations_are_ranked_by_profile(client):
    response = client.post(
        "/api/ai/recommendations",
        json={
            "user_profile": {
                "interests": ["python", "ai"],
                "experience": "intermediate",
            },
            "max_recommendations": 5,
        },
    )

    assert response.status_code == 200
    assert response.json["success"] is True
    assert len(response.json["recommendations"]) == 5

    first = response.json["recommendations"][0]

    assert first["id"] == "ai-application-development"
    assert first["score"] == 1.0
    assert response.json["ranking_method"] == "catalogue tag matching"


def test_recommendations_reject_invalid_limit(client):
    response = client.post(
        "/api/ai/recommendations",
        json={
            "user_profile": {"interests": ["python"]},
            "max_recommendations": 100,
        },
    )

    assert response.status_code == 400


def test_recommendations_feedback_is_persisted(client):
    response = client.post(
        "/api/ai/recommendations/feedback",
        json={
            "rating": 4,
            "recommendations": [
                {"id": "python-engineering"},
                {"id": "ai-application-development"},
            ],
            "user_profile": {"interests": ["python", "ai"]},
        },
    )

    assert response.status_code == 200
    assert response.json["success"] is True

    analytics = client.get("/api/ai/analytics")

    assert analytics.status_code == 200
    assert analytics.json["feedback"]["count"] == 1
    assert analytics.json["feedback"]["average_rating"] == 4.0
    assert analytics.json["events"]["recommendation_feedback"] == 1


def test_feedback_rejects_invalid_rating(client):
    response = client.post(
        "/api/ai/recommendations/feedback",
        json={
            "rating": 5,
            "recommendations": [],
            "user_profile": {},
        },
    )

    assert response.status_code == 400


def test_analytics_endpoint_returns_real_database_counts(client):
    client.post(
        "/api/ai/recommendations",
        json={
            "user_profile": {"interests": ["python"]},
            "max_recommendations": 3,
        },
    )

    client.post(
        "/api/ai/recommendations",
        json={
            "user_profile": {"interests": ["web"]},
            "max_recommendations": 2,
        },
    )

    response = client.get("/api/ai/analytics")

    assert response.status_code == 200
    assert response.json["success"] is True
    assert response.json["events"]["recommendations"] == 2
    assert "note" in response.json