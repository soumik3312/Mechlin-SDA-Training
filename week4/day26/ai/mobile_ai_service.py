"""Mobile gateway for the existing Day 25 AI web service."""

from __future__ import annotations

import json
import logging
import re
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request


THREAD_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class MobileAIService:
    """Expose mobile-friendly endpoints without loading a second AI model."""

    def __init__(
        self,
        upstream_base_url: str = "http://127.0.0.1:5002",
        timeout: int = 90,
    ) -> None:
        self.app = Flask(__name__)
        self.app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024
        self.logger = logging.getLogger(__name__)
        self.upstream_base_url = upstream_base_url.rstrip("/")
        self.timeout = timeout
        self.setup_routes()

    @staticmethod
    def _decode_response(raw_body: bytes) -> dict[str, Any]:
        if not raw_body:
            return {"success": True}

        try:
            decoded = json.loads(raw_body.decode("utf-8"))
            if isinstance(decoded, dict):
                return decoded
            return {"success": True, "data": decoded}
        except (UnicodeDecodeError, json.JSONDecodeError):
            return {
                "success": False,
                "error": "The Day 25 service returned invalid JSON.",
            }

    def _forward(
        self,
        path: str,
        method: str = "POST",
        payload: dict[str, Any] | None = None,
    ) -> tuple[dict[str, Any], int]:
        url = f"{self.upstream_base_url}{path}"
        body = None
        headers = {"Accept": "application/json"}

        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        upstream_request = Request(
            url=url,
            data=body,
            headers=headers,
            method=method.upper(),
        )

        try:
            with urlopen(upstream_request, timeout=self.timeout) as response:
                return self._decode_response(response.read()), response.status

        except HTTPError as exc:
            error_data = self._decode_response(exc.read())
            error_data.setdefault(
                "error",
                f"Day 25 service returned HTTP {exc.code}.",
            )
            return error_data, exc.code

        except (URLError, TimeoutError, OSError) as exc:
            reason = getattr(exc, "reason", str(exc))
            self.logger.warning("Day 25 service unavailable: %s", reason)
            return {
                "success": False,
                "error": (
                    "The Day 25 AI service is unavailable. "
                    "Start it on port 5002 and try again."
                ),
            }, 503

    @staticmethod
    def _json_response(result: tuple[dict[str, Any], int]):
        payload, status_code = result
        return jsonify(payload), status_code

    @staticmethod
    def _read_payload() -> dict[str, Any]:
        payload = request.get_json(silent=True)
        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def _valid_thread_id(value: Any) -> bool:
        return isinstance(value, str) and bool(
            THREAD_ID_PATTERN.fullmatch(value)
        )

    def setup_routes(self) -> None:
        """Register mobile gateway endpoints."""

        @self.app.get("/mobile/health")
        def health():
            return self._json_response(
                self._forward("/health", method="GET")
            )

        @self.app.post("/mobile/chat")
        def chat():
            data = self._read_payload()
            message = data.get("message")
            thread_id = data.get("thread_id")
            agent_type = data.get("agent_type", "conversation")

            if not isinstance(message, str) or not message.strip():
                return jsonify({
                    "success": False,
                    "error": "Message is required.",
                }), 400

            if len(message) > 10_000:
                return jsonify({
                    "success": False,
                    "error": "Message exceeds 10,000 characters.",
                }), 413

            if not self._valid_thread_id(thread_id):
                return jsonify({
                    "success": False,
                    "error": "A valid persistent thread_id is required.",
                }), 400

            if agent_type not in {"conversation", "langchain"}:
                return jsonify({
                    "success": False,
                    "error": "agent_type must be conversation or langchain.",
                }), 400

            return self._json_response(
                self._forward(
                    "/api/ai/chat",
                    payload={
                        "message": message.strip(),
                        "thread_id": thread_id,
                        "agent_type": agent_type,
                    },
                )
            )

        @self.app.get("/mobile/memory")
        def memory():
            thread_id = request.args.get("thread_id")

            if not self._valid_thread_id(thread_id):
                return jsonify({
                    "success": False,
                    "error": "A valid thread_id is required.",
                }), 400

            query = urlencode({"thread_id": thread_id})
            return self._json_response(
                self._forward(
                    f"/api/ai/memory?{query}",
                    method="GET",
                )
            )

        @self.app.post("/mobile/memory/clear")
        def clear_memory():
            data = self._read_payload()
            thread_id = data.get("thread_id")

            if not self._valid_thread_id(thread_id):
                return jsonify({
                    "success": False,
                    "error": "A valid thread_id is required.",
                }), 400

            return self._json_response(
                self._forward(
                    "/api/ai/memory/clear",
                    payload={"thread_id": thread_id},
                )
            )

        @self.app.post("/mobile/generate")
        def generate_content():
            data = self._read_payload()
            topic = data.get("topic")
            content_type = data.get("content_type", "article")
            tone = data.get("tone", "professional")
            length = data.get("length", "medium")
            keywords = data.get("keywords", [])

            if not isinstance(topic, str) or not topic.strip():
                return jsonify({
                    "success": False,
                    "error": "Topic is required.",
                }), 400

            if len(topic) > 500:
                return jsonify({
                    "success": False,
                    "error": "Topic must not exceed 500 characters.",
                }), 400

            if not isinstance(keywords, list) or len(keywords) > 12:
                return jsonify({
                    "success": False,
                    "error": "Keywords must be a list of at most 12 items.",
                }), 400

            if any(
                not isinstance(item, str) or len(item) > 60
                for item in keywords
            ):
                return jsonify({
                    "success": False,
                    "error": "Each keyword must be text of at most 60 characters.",
                }), 400

            return self._json_response(
                self._forward(
                    "/api/ai/generate",
                    payload={
                        "content_type": content_type,
                        "topic": topic.strip(),
                        "tone": tone,
                        "length": length,
                        "keywords": keywords,
                    },
                )
            )

        @self.app.route("/mobile/profile", methods=["GET"])
        def profile():
            return self._json_response(
                self._forward(
                    "/api/ai/recommendations/profile",
                    method="GET",
                )
            )

        @self.app.post("/mobile/recommendations")
        def recommendations():
            data = self._read_payload()
            user_profile = data.get("user_profile", {})
            maximum = data.get("max_recommendations", 5)

            if not isinstance(user_profile, dict):
                return jsonify({
                    "success": False,
                    "error": "user_profile must be a JSON object.",
                }), 400

            if (
                isinstance(maximum, bool)
                or not isinstance(maximum, int)
                or not 1 <= maximum <= 8
            ):
                return jsonify({
                    "success": False,
                    "error": "max_recommendations must be an integer from 1 to 8.",
                }), 400

            return self._json_response(
                self._forward(
                    "/api/ai/recommendations",
                    payload={
                        "user_profile": user_profile,
                        "max_recommendations": maximum,
                    },
                )
            )

        @self.app.post("/mobile/recommendations/feedback")
        def recommendation_feedback():
            data = self._read_payload()
            rating = data.get("rating")
            recommendations = data.get("recommendations", [])
            user_profile = data.get("user_profile", {})

            if (
                isinstance(rating, bool)
                or not isinstance(rating, int)
                or rating not in {1, 2, 3, 4}
            ):
                return jsonify({
                    "success": False,
                    "error": "rating must be an integer from 1 to 4.",
                }), 400

            if not isinstance(recommendations, list):
                return jsonify({
                    "success": False,
                    "error": "recommendations must be a list.",
                }), 400

            if not isinstance(user_profile, dict):
                return jsonify({
                    "success": False,
                    "error": "user_profile must be a JSON object.",
                }), 400

            return self._json_response(
                self._forward(
                    "/api/ai/recommendations/feedback",
                    payload={
                        "rating": rating,
                        "recommendations": recommendations,
                        "user_profile": user_profile,
                    },
                )
            )

    def run(self, host: str = "0.0.0.0", port: int = 5003) -> None:
        """Run the gateway on a trusted local network."""
        self.logger.info(
            "Starting Mobile AI Gateway on %s:%s; upstream=%s",
            host,
            port,
            self.upstream_base_url,
        )
        self.app.run(
            host=host,
            port=port,
            debug=False,
            use_reloader=False,
            threaded=True,
        )