"""Flask API integrating OpenAI, Hugging Face, and Ollama."""

from __future__ import annotations

import logging
import os

from typing import Any, Dict, Optional

from flask import Flask, jsonify, request
from flask_cors import CORS

from ai.openai_integration import OpenAIIntegration
from ai.huggingface_integration import HuggingFaceIntegration
from ai.ollama_integration import OllamaIntegration


class AIContentGenerationAPI:

    def __init__(
        self,
        openai_key: Optional[str] = None,
        ollama_url: Optional[str] = None,
        openai_service: Optional[Any] = None,
        ollama_service: Optional[Any] = None,
        huggingface_service: Optional[Any] = None,
    ) -> None:

        self.app = Flask(__name__)

        self.app.config["MAX_CONTENT_LENGTH"] = (
            1 * 1024 * 1024
        )

        self.logger = logging.getLogger(
            self.__class__.__name__
        )

        key = (
            openai_key
            or os.getenv("OPENAI_API_KEY")
        )

        if openai_service is not None:
            self.openai_service = openai_service

        elif key:
            self.openai_service = OpenAIIntegration(
                api_key=key
            )

        else:
            self.openai_service = None

        # Only initialize Ollama when explicitly configured.
        url = (
            ollama_url
            or os.getenv("OLLAMA_BASE_URL")
        )

        if ollama_service is not None:
            self.ollama_service = ollama_service

        elif url:
            self.ollama_service = OllamaIntegration(url)

        else:
            self.ollama_service = None

        self.huggingface_service = (
            huggingface_service
            if huggingface_service is not None
            else HuggingFaceIntegration()
        )

        allowed_origins = [
            origin.strip()
            for origin in os.getenv(
                "AI_ALLOWED_ORIGINS",
                (
                    "http://localhost:3000,"
                    "http://localhost:5173,"
                    "http://127.0.0.1:3000,"
                    "http://127.0.0.1:5173"
                ),
            ).split(",")
            if origin.strip()
        ]

        CORS(
            self.app,
            resources={
                r"/*": {
                    "origins": allowed_origins
                }
            },
        )

        self.setup_routes()

    @staticmethod
    def _read_json() -> Optional[Dict[str, Any]]:

        data = request.get_json(
            silent=True
        )

        return data if isinstance(data, dict) else None

    def _error_response(
        self,
        error: Exception,
    ):

        if isinstance(error, ValueError):
            status = 400
            message = str(error)

        elif isinstance(error, RuntimeError):
            status = 503
            message = str(error)

        else:
            status = 502
            message = (
                "The selected AI provider request failed."
            )

        self.logger.exception(
            "Content generation request failed."
        )

        return jsonify(
            {
                "success": False,
                "error": message,
            }
        ), status

    def _resolve_text_provider(
        self,
        provider: Optional[str],
        model: Optional[str],
    ) -> str:

        if provider:
            return provider.lower()

        if model is None:
            return "openai"

        if model.startswith("gpt-"):
            return "openai"

        if model.split(":")[0].startswith(
            (
                "llama",
                "mistral",
                "qwen",
                "deepseek",
                "gemma",
                "phi",
            )
        ):
            return "ollama"

        return "huggingface"

    def setup_routes(self) -> None:

        @self.app.post("/generate/text")
        def generate_text():

            data = self._read_json()

            if data is None:
                return jsonify(
                    {
                        "success": False,
                        "error": "Expected a JSON object.",
                    }
                ), 400

            prompt = data.get("prompt")

            if not isinstance(prompt, str) or not prompt.strip():
                return jsonify(
                    {
                        "success": False,
                        "error": "Prompt is required.",
                    }
                ), 400

            model = data.get("model")

            provider = self._resolve_text_provider(
                data.get("provider"),
                model,
            )

            try:
                max_tokens = data.get(
                    "max_tokens",
                    500,
                )

                temperature = float(
                    data.get(
                        "temperature",
                        0.7,
                    )
                )

                if (
                    isinstance(max_tokens, bool)
                    or not isinstance(max_tokens, int)
                    or max_tokens <= 0
                    or not 0 <= temperature <= 2
                ):
                    raise ValueError(
                        "Invalid generation options."
                    )

                if provider == "openai":

                    if self.openai_service is None:
                        raise RuntimeError(
                            "OpenAI is not configured. "
                            "Set OPENAI_API_KEY."
                        )

                    result = self.openai_service.generate_text(
                        prompt=prompt,
                        model=model,
                        max_tokens=max_tokens,
                        temperature=temperature,
                    )

                    selected_model = (
                        model
                        or self.openai_service.default_model
                    )

                elif provider == "ollama":

                    if self.ollama_service is None:
                        raise RuntimeError(
                            "Ollama is not configured. "
                            "Set OLLAMA_BASE_URL."
                        )

                    selected_model = (
                        model or "llama3.2"
                    )

                    result = self.ollama_service.generate_text(
                        prompt=prompt,
                        model=selected_model,
                        options={
                            "temperature": temperature,
                            "num_predict": max_tokens,
                            "num_ctx": 2048,
                        },
                    )

                elif provider == "huggingface":

                    selected_model = (
                        model or "gpt2"
                    )

                    result = self.huggingface_service.generate_text(
                        prompt=prompt,
                        model_name=selected_model,
                        max_length=max_tokens,
                        temperature=temperature,
                    )

                else:
                    raise ValueError(
                        "Unsupported provider. "
                        "Use openai, ollama, or huggingface."
                    )

                return jsonify(
                    {
                        "success": True,
                        "result": result,
                        "provider": provider,
                        "model": selected_model,
                    }
                )

            except Exception as error:
                return self._error_response(error)

        @self.app.post("/generate/summary")
        def generate_summary():

            data = self._read_json()

            if data is None:
                return jsonify(
                    {
                        "success": False,
                        "error": "Expected a JSON object.",
                    }
                ), 400

            text = data.get("text")

            if not isinstance(text, str) or not text.strip():
                return jsonify(
                    {
                        "success": False,
                        "error": "Text is required.",
                    }
                ), 400

            try:
                max_length = int(
                    data.get("max_length", 150)
                )

                result = self.huggingface_service.summarize_text(
                    text,
                    max_length=max_length,
                )

                return jsonify(
                    {
                        "success": True,
                        "summary": result,
                        "original_length": len(text),
                        "summary_length": len(result),
                    }
                )

            except Exception as error:
                return self._error_response(error)

        @self.app.post("/generate/code")
        def generate_code():

            data = self._read_json()

            if data is None:
                return jsonify(
                    {
                        "success": False,
                        "error": "Expected a JSON object.",
                    }
                ), 400

            description = data.get("description")

            if (
                not isinstance(description, str)
                or not description.strip()
            ):
                return jsonify(
                    {
                        "success": False,
                        "error": "Description is required.",
                    }
                ), 400

            if self.openai_service is None:
                return jsonify(
                    {
                        "success": False,
                        "error": "OpenAI is not configured.",
                    }
                ), 503

            language = data.get(
                "language",
                "python",
            )

            try:
                result = self.openai_service.generate_code(
                    description,
                    language,
                )

                return jsonify(
                    {
                        "success": True,
                        "code": result,
                        "language": language,
                    }
                )

            except Exception as error:
                return self._error_response(error)

        @self.app.post("/chat")
        def chat():

            data = self._read_json()

            if data is None:
                return jsonify(
                    {
                        "success": False,
                        "error": "Expected a JSON object.",
                    }
                ), 400

            messages = data.get("messages", [])

            if not isinstance(messages, list) or not messages:
                return jsonify(
                    {
                        "success": False,
                        "error": "Messages are required.",
                    }
                ), 400

            model = data.get("model")

            provider = data.get("provider")

            if provider is None:
                provider = (
                    "openai"
                    if not model or model.startswith("gpt-")
                    else "ollama"
                )

            provider = provider.lower()

            try:
                if provider == "openai":

                    if self.openai_service is None:
                        raise RuntimeError(
                            "OpenAI is not configured."
                        )

                    result = self.openai_service.chat_completion(
                        messages,
                        model=model,
                    )

                    selected_model = (
                        model
                        or self.openai_service.default_model
                    )

                elif provider == "ollama":

                    if self.ollama_service is None:
                        raise RuntimeError(
                            "Ollama is not configured."
                        )

                    selected_model = (
                        model or "llama3.2"
                    )

                    result = self.ollama_service.chat_completion(
                        messages,
                        model=selected_model,
                    )

                else:
                    raise ValueError(
                        "Unsupported chat provider."
                    )

                return jsonify(
                    {
                        "success": True,
                        "response": result,
                        "provider": provider,
                        "model": selected_model,
                    }
                )

            except Exception as error:
                return self._error_response(error)

        @self.app.get("/models")
        def list_models():

            openai_models = []

            if self.openai_service is not None:
                openai_models = list(
                    self.openai_service.models.values()
                )

            ollama_models = (
                self.ollama_service.list_models()
                if self.ollama_service is not None
                else []
            )

            huggingface_models = [
                "gpt2",
                "facebook/bart-large-cnn",
                "distilbert-base-cased-distilled-squad",
            ]

            return jsonify(
                {
                    "success": True,
                    "models": {
                        "openai": openai_models,
                        "ollama": ollama_models,
                        "huggingface": huggingface_models,
                    },
                }
            )

        @self.app.get("/health")
        def health():

            return jsonify(
                {
                    "status": "healthy",
                    "services": {
                        "openai": (
                            self.openai_service is not None
                        ),
                        "ollama": (
                            self.ollama_service is not None
                            and self.ollama_service.is_connected
                        ),
                        "huggingface": (
                            self.huggingface_service is not None
                        ),
                    },
                }
            )

    def run(
        self,
        host: str = "127.0.0.1",
        port: int = 5001,
    ) -> None:

        self.logger.info(
            "Starting AI Content Generation API on %s:%s",
            host,
            port,
        )

        self.app.run(
            host=host,
            port=port,
            debug=False,
        )


def main() -> None:

    import argparse

    parser = argparse.ArgumentParser(
        description="Run the Day 23 Generative AI API."
    )

    parser.add_argument(
        "--host",
        default=os.getenv(
            "AI_HOST",
            "127.0.0.1",
        ),
    )

    parser.add_argument(
        "--port",
        type=int,
        default=int(
            os.getenv(
                "AI_PORT",
                "5001",
            )
        ),
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    service = AIContentGenerationAPI()

    service.run(
        host=args.host,
        port=args.port,
    )


if __name__ == "__main__":
    main()