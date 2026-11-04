"""Ollama integration for local LLM inference."""

from __future__ import annotations

import logging

from typing import Any, Dict, List, Optional

import requests


class OllamaIntegration:
    """Client for the Ollama local model REST API."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        timeout: int = 120,
        auto_pull: bool = False,
        session: Optional[Any] = None,
    ) -> None:

        self.base_url = base_url.rstrip("/")

        self.logger = logging.getLogger(
            self.__class__.__name__
        )

        self.timeout = timeout
        self.auto_pull = auto_pull

        self.session = session or requests.Session()

        self.available_models: List[str] = []

        self.is_connected = False
        self.last_error: Optional[str] = None

        self.load_available_models()

    @staticmethod
    def _validate_model_name(model: str) -> None:

        if not isinstance(model, str) or not model.strip():
            raise ValueError(
                "A valid model name is required."
            )

    def load_available_models(self) -> List[str]:
        """Retrieve locally installed Ollama models."""

        try:
            response = self.session.get(
                f"{self.base_url}/api/tags",
                timeout=self.timeout,
            )

            response.raise_for_status()

            data = response.json()

            self.available_models = [
                item["name"]
                for item in data.get("models", [])
                if isinstance(item, dict) and item.get("name")
            ]

            self.is_connected = True
            self.last_error = None

            self.logger.info(
                "Discovered %s local Ollama models.",
                len(self.available_models),
            )

        except requests.RequestException as exc:

            self.is_connected = False
            self.last_error = str(exc)

            self.logger.warning(
                "Ollama is currently unavailable: %s",
                exc,
            )

            self.available_models = []

        except (ValueError, KeyError, TypeError) as exc:

            self.logger.warning(
                "Invalid Ollama model listing response: %s",
                exc,
            )

            self.available_models = []

        return self.list_models()

    def list_models(self) -> List[str]:
        """Return a copy of available model names."""

        return self.available_models.copy()

    def _model_is_available(self, model: str) -> bool:

        return any(
            existing == model
            or existing.split(":")[0] == model.split(":")[0]
            for existing in self.available_models
        )

    def pull_model(
        self,
        model_name: str,
    ) -> bool:
        """Download a model from the Ollama registry."""

        self._validate_model_name(model_name)

        self.logger.info(
            "Pulling Ollama model: %s",
            model_name,
        )

        try:
            response = self.session.post(
                f"{self.base_url}/api/pull",
                json={
                    "model": model_name,
                    "stream": False,
                },
                timeout=(10, 3600),
            )

            response.raise_for_status()

            result = response.json()

            if result.get("status") not in (
                None,
                "success",
            ):
                raise RuntimeError(
                    f"Ollama model pull failed: {result}"
                )

            self.load_available_models()

            return True

        except (
            requests.RequestException,
            ValueError,
            RuntimeError,
        ):
            self.logger.exception(
                "Failed to pull Ollama model %s",
                model_name,
            )

            return False

    def _ensure_model(
        self,
        model: str,
    ) -> None:

        self._validate_model_name(model)

        if not self.is_connected:
            self.load_available_models()

        if self._model_is_available(model):
            return

        if self.auto_pull:
            if self.pull_model(model):
                return

        raise ValueError(
            f"Model '{model}' is not available locally. "
            f"Install it with: ollama pull {model}"
        )

    def generate_text(
        self,
        prompt: str,
        model: str = "llama3.2",
        options: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate text using an installed Ollama model."""

        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError(
                "Prompt must be a non-empty string."
            )

        self._ensure_model(model)

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
        }

        if options:
            if not isinstance(options, dict):
                raise ValueError(
                    "options must be a dictionary."
                )

            payload["options"] = options

        try:
            response = self.session.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=(10, self.timeout),
            )

            response.raise_for_status()

            return response.json().get(
                "response",
                "",
            )

        except (requests.RequestException, ValueError):
            self.logger.exception(
                "Ollama text generation failed."
            )
            raise

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama3.2",
    ) -> str:
        """Generate a chat response using conversation history."""

        if not isinstance(messages, list) or not messages:
            raise ValueError(
                "Messages must be a non-empty list."
            )

        for message in messages:

            if (
                not isinstance(message, dict)
                or message.get("role") not in (
                    "system",
                    "user",
                    "assistant",
                )
                or not isinstance(
                    message.get("content"),
                    str,
                )
            ):
                raise ValueError(
                    "Invalid conversation message."
                )

        self._ensure_model(model)

        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
        }

        try:
            response = self.session.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=(10, self.timeout),
            )

            response.raise_for_status()

            return response.json().get(
                "message",
                {},
            ).get(
                "content",
                "",
            )

        except (requests.RequestException, ValueError):
            self.logger.exception(
                "Ollama chat completion failed."
            )
            raise

    def get_model_info(
        self,
        model: str,
    ) -> Dict[str, Any]:
        """Retrieve details of a locally installed model."""

        self._ensure_model(model)

        try:
            response = self.session.post(
                f"{self.base_url}/api/show",
                json={
                    "model": model
                },
                timeout=self.timeout,
            )

            response.raise_for_status()

            return response.json()

        except (requests.RequestException, ValueError):
            self.logger.exception(
                "Failed to retrieve Ollama model information."
            )
            raise

    def delete_model(
        self,
        model: str,
    ) -> bool:
        """Delete a locally installed model."""

        self._validate_model_name(model)

        try:
            response = self.session.delete(
                f"{self.base_url}/api/delete",
                json={
                    "model": model
                },
                timeout=self.timeout,
            )

            response.raise_for_status()

            self.load_available_models()

            return True

        except requests.RequestException:
            self.logger.exception(
                "Failed to delete Ollama model %s",
                model,
            )

            return False