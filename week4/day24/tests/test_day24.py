"""Automated tests for the Day 24 AI agent implementation."""

from __future__ import annotations

from pathlib import Path

import pytest

from week4.day24.ai.agents.agent_api import AIAgentAPI
from week4.day24.ai.agents.tools import (
    CustomTool,
    calculator,
    create_database_query_tool,
    create_file_operations_tool,
)


class StubAgent:
    """Lightweight agent substitute for testing Flask routes."""

    def __init__(self):
        self.tools = ["calculator", "custom_tool"]
        self.messages = []
        self.cleared_threads = []

    def chat(self, message: str, thread_id: str = "default") -> str:
        self.messages.append((message, thread_id))
        return f"Test response: {message}"

    def get_memory(self, thread_id: str = "default") -> dict:
        return {
            "thread_id": thread_id,
            "chat_history": [],
            "memory_variables": {"persistent": True},
        }

    def clear_memory(self, thread_id: str = "default") -> None:
        self.cleared_threads.append(thread_id)

    def list_tools(self) -> list[str]:
        return list(self.tools)

    def add_tool_by_name(self, name: str) -> bool:
        if name not in {"calculator", "custom_tool"}:
            raise ValueError(f"Unknown registered tool: {name}")

        if name in self.tools:
            return False

        self.tools.append(name)
        return True

    def remove_tool_by_name(self, name: str) -> bool:
        if name not in self.tools:
            return False

        self.tools.remove(name)
        return True


@pytest.fixture
def api(tmp_path: Path):
    langchain_stub = StubAgent()
    conversation_stub = StubAgent()

    service = AIAgentAPI(
        storage_dir=tmp_path,
        langchain_agent=langchain_stub,
        conversation_agent=conversation_stub,
    )

    return service.app.test_client(), langchain_stub, conversation_stub


def test_calculator_performs_arithmetic():
    result = calculator.invoke({"expression": "17 * 19"})
    assert result == "Calculation result: 323"


def test_calculator_rejects_arbitrary_python():
    result = calculator.invoke(
        {"expression": "__import__('os').system('whoami')"}
    )

    assert result.startswith("Calculation error:")


def test_calculator_rejects_unsupported_operations():
    result = calculator.invoke({"expression": "10 ** 1000"})
    assert result.startswith("Calculation error:")


def test_custom_tool_returns_result():
    custom = CustomTool()

    result = custom.invoke({"query": "Day 24"})
    assert result == "Custom tool result for: Day 24"


def test_file_operations_read_and_write(tmp_path: Path):
    file_tool = create_file_operations_tool(tmp_path)

    write_result = file_tool.invoke(
        {
            "operation": "write",
            "filename": "agent-note.txt",
            "content": "Persistent agent workspace.",
        }
    )

    assert "successfully" in write_result.lower()

    read_result = file_tool.invoke(
        {"operation": "read", "filename": "agent-note.txt"}
    )

    assert read_result == "Persistent agent workspace."


def test_file_operations_prevent_path_traversal(tmp_path: Path):
    file_tool = create_file_operations_tool(tmp_path)

    result = file_tool.invoke(
        {
            "operation": "write",
            "filename": "../outside.txt",
            "content": "Should not be written.",
        }
    )

    assert "outside the workspace" in result.lower() or "simple filename" in result.lower()
    assert not (tmp_path.parent / "outside.txt").exists()


def test_database_tool_allows_read_only_queries(tmp_path: Path):
    database_tool = create_database_query_tool(tmp_path)

    result = database_tool.invoke(
        {"query": "SELECT note FROM agent_notes"}
    )

    assert result == "[]"


def test_database_tool_rejects_modification(tmp_path: Path):
    database_tool = create_database_query_tool(tmp_path)

    result = database_tool.invoke(
        {"query": "DROP TABLE agent_notes"}
    )

    assert "only select" in result.lower()


def test_api_health_endpoint(api):
    client, _, _ = api

    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "healthy"


def test_api_chat_endpoint(api):
    client, langchain_stub, _ = api

    response = client.post(
        "/chat",
        json={
            "message": "Hello agent",
            "agent_type": "langchain",
            "thread_id": "test-thread",
        },
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert response.get_json()["thread_id"] == "test-thread"
    assert langchain_stub.messages[-1][1] == "test-thread"


def test_api_rejects_empty_message(api):
    client, _, _ = api

    response = client.post(
        "/chat",
        json={"message": "", "agent_type": "langchain"},
    )

    assert response.status_code == 400


def test_api_conversation_agent(api):
    client, _, conversation_stub = api

    response = client.post(
        "/chat",
        json={
            "message": "Remember this topic.",
            "agent_type": "conversation",
            "thread_id": "conversation-1",
        },
    )

    assert response.status_code == 200
    assert conversation_stub.messages[-1][1] == "conversation-1"


def test_api_memory_endpoint(api):
    client, _, _ = api

    response = client.get(
        "/memory?agent_type=conversation&thread_id=conversation-1"
    )

    assert response.status_code == 200
    assert response.get_json()["success"] is True


def test_api_memory_clear(api):
    client, _, conversation_stub = api

    response = client.post(
        "/memory/clear",
        json={
            "agent_type": "conversation",
            "thread_id": "conversation-1",
        },
    )

    assert response.status_code == 200
    assert "conversation-1" in conversation_stub.cleared_threads


def test_api_lists_tools(api):
    client, _, _ = api

    response = client.get("/tools?agent_type=langchain")

    assert response.status_code == 200
    assert "calculator" in response.get_json()["tools"]


def test_api_adds_registered_tool(api):
    client, langchain_stub, _ = api

    langchain_stub.remove_tool_by_name("custom_tool")

    response = client.post(
        "/tools/add",
        json={
            "name": "custom_tool",
            "agent_type": "langchain",
        },
    )

    assert response.status_code == 200
    assert "custom_tool" in langchain_stub.tools


def test_api_rejects_unregistered_tool(api):
    client, _, _ = api

    response = client.post(
        "/tools/add",
        json={
            "name": "arbitrary_python",
            "agent_type": "langchain",
            "function": "__import__('os').system('whoami')",
        },
    )

    assert response.status_code == 400


def test_api_removes_registered_tool(api):
    client, _, _ = api

    response = client.post(
        "/tools/remove",
        json={
            "name": "custom_tool",
            "agent_type": "langchain",
        },
    )

    assert response.status_code == 200
    assert "custom_tool" not in response.get_json()["tools"]
def test_conversation_memory_persists_after_restart(tmp_path: Path):
    from week4.day24.ai.agents.conversation_agent import ConversationAgent

    first_agent = ConversationAgent(
        storage_dir=tmp_path,
        max_memory_length=2,
    )

    first_agent.set_context(
        "favorite_topic",
        "Generative AI",
        thread_id="thread-alpha",
    )

    first_agent._update_context(
        "thread-alpha",
        "I am studying Python and AI at college.",
        "That is a useful combination.",
    )

    assert first_agent.get_context(
        "favorite_topic",
        thread_id="thread-alpha",
    ) == "Generative AI"

    first_agent.close()

    second_agent = ConversationAgent(
        storage_dir=tmp_path,
        max_memory_length=2,
    )

    try:
        assert second_agent.get_context(
            "favorite_topic",
            thread_id="thread-alpha",
        ) == "Generative AI"

        history = second_agent.get_conversation_history("thread-alpha")

        assert len(history) == 1
        assert "Python" in history[0]["user"]

        memory = second_agent.get_memory("thread-alpha")

        assert memory["memory_variables"]["persistent"] is True
        assert memory["memory_variables"]["context"]["message_count"] == 1

        # A different thread must not see the first thread's context.
        assert second_agent.get_context(
            "favorite_topic",
            thread_id="thread-beta",
        ) is None

        second_agent.clear_memory("thread-alpha")

        assert second_agent.get_conversation_history("thread-alpha") == []
        assert second_agent.get_context(
            "favorite_topic",
            thread_id="thread-alpha",
        ) is None

    finally:
        second_agent.close()