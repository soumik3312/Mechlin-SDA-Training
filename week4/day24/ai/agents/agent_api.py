"""Flask REST API for the Day 24 AI agents."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request

from .conversation_agent import ConversationAgent
from .langchain_agent import LangChainAgent


class AIAgentAPI:
    """Expose LangChain and conversation agents through Flask endpoints."""

    def __init__(
        self,
        storage_dir: str | Path | None = None,
        langchain_agent: Any = None,
        conversation_agent: Any = None,
    ) -> None:
        self.app = Flask(__name__)
        self.logger = logging.getLogger(__name__)

        self.storage_dir = Path(
            storage_dir
            or os.getenv(
                "DAY24_STORAGE_DIR",
                r"D:\Mechlin-SDA-Training\AI-Storage\Day24",
            )
        ).resolve()

        self.storage_dir.mkdir(parents=True, exist_ok=True)

        self.langchain_agent = langchain_agent or LangChainAgent(
            storage_dir=self.storage_dir
        )

        self.conversation_agent = conversation_agent or ConversationAgent(
            storage_dir=self.storage_dir,
            max_memory_length=10,
        )

        self.setup_routes()

    @staticmethod
    def _payload() -> dict[str, Any]:
        data = request.get_json(silent=True)
        return data if isinstance(data, dict) else {}

    def _get_agent(self, agent_type: str):
        if agent_type == "langchain":
            return self.langchain_agent

        if agent_type == "conversation":
            return self.conversation_agent

        raise ValueError("agent_type must be langchain or conversation.")

    def setup_routes(self) -> None:
        """Register all agent API endpoints."""

        @self.app.route("/health", methods=["GET"])
        def health():
            return jsonify(
                {
                    "status": "healthy",
                    "agents": {
                        "langchain": True,
                        "conversation": True,
                    },
                    "model": "mistral:latest",
                    "provider": "ollama",
                }
            ), 200

        @self.app.route("/chat", methods=["POST"])
        def chat():
            try:
                data = self._payload()

                message = data.get("message")
                agent_type = data.get("agent_type", "langchain")
                thread_id = data.get("thread_id", "default")

                if not isinstance(message, str) or not message.strip():
                    return jsonify({"error": "Message is required."}), 400

                if not isinstance(thread_id, str) or not thread_id.strip():
                    return jsonify({"error": "Invalid thread_id."}), 400

                agent = self._get_agent(agent_type)
                response = agent.chat(message, thread_id=thread_id)

                return jsonify(
                    {
                        "success": True,
                        "response": response,
                        "agent_type": agent_type,
                        "thread_id": thread_id,
                    }
                ), 200

            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
            except Exception:
                self.logger.exception("Chat request failed.")
                return jsonify({"error": "Agent chat request failed."}), 500

        @self.app.route("/memory", methods=["GET"])
        def get_memory():
            try:
                agent_type = request.args.get("agent_type", "langchain")
                thread_id = request.args.get("thread_id", "default")

                agent = self._get_agent(agent_type)
                memory = agent.get_memory(thread_id)

                return jsonify(
                    {
                        "success": True,
                        "memory": memory,
                        "agent_type": agent_type,
                    }
                ), 200

            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
            except Exception:
                self.logger.exception("Memory retrieval failed.")
                return jsonify({"error": "Memory retrieval failed."}), 500

        @self.app.route("/memory/clear", methods=["POST"])
        def clear_memory():
            try:
                data = self._payload()
                agent_type = data.get("agent_type", "langchain")
                thread_id = data.get("thread_id", "default")

                agent = self._get_agent(agent_type)
                agent.clear_memory(thread_id)

                return jsonify(
                    {
                        "success": True,
                        "message": "Memory cleared successfully.",
                        "agent_type": agent_type,
                        "thread_id": thread_id,
                    }
                ), 200

            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
            except Exception:
                self.logger.exception("Memory clearing failed.")
                return jsonify({"error": "Memory clearing failed."}), 500

        @self.app.route("/tools", methods=["GET"])
        def list_tools():
            try:
                agent_type = request.args.get("agent_type", "langchain")
                agent = self._get_agent(agent_type)

                return jsonify(
                    {
                        "success": True,
                        "tools": agent.list_tools(),
                        "agent_type": agent_type,
                    }
                ), 200

            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400

        @self.app.route("/tools/add", methods=["POST"])
        def add_tool():
            try:
                data = self._payload()
                agent_type = data.get("agent_type", "langchain")
                tool_name = data.get("name")

                if not isinstance(tool_name, str) or not tool_name.strip():
                    return jsonify({"error": "Tool name is required."}), 400

                agent = self._get_agent(agent_type)
                added = agent.add_tool_by_name(tool_name.strip())

                return jsonify(
                    {
                        "success": True,
                        "added": added,
                        "tool_name": tool_name.strip(),
                        "tools": agent.list_tools(),
                    }
                ), 200

            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
            except Exception:
                self.logger.exception("Tool addition failed.")
                return jsonify({"error": "Tool addition failed."}), 500

        @self.app.route("/tools/remove", methods=["POST"])
        def remove_tool():
            try:
                data = self._payload()
                agent_type = data.get("agent_type", "langchain")
                tool_name = data.get("name")

                if not isinstance(tool_name, str) or not tool_name.strip():
                    return jsonify({"error": "Tool name is required."}), 400

                agent = self._get_agent(agent_type)
                removed = agent.remove_tool_by_name(tool_name.strip())

                return jsonify(
                    {
                        "success": True,
                        "removed": removed,
                        "tool_name": tool_name.strip(),
                        "tools": agent.list_tools(),
                    }
                ), 200

            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
            except Exception:
                self.logger.exception("Tool removal failed.")
                return jsonify({"error": "Tool removal failed."}), 500

    def run(self, host: str = "127.0.0.1", port: int = 5002) -> None:
        """Start the local Flask API."""

        self.logger.info("Starting Day 24 AI Agent API on %s:%s", host, port)
        self.app.run(host=host, port=port, debug=False, use_reloader=False)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    AIAgentAPI().run()