"""OpenAI integration for text, code, chat, and embedding generation."""

from __future__ import annotations

import logging
import os

from typing import Any, Dict, List, Optional


class OpenAIIntegration:
    """Reusable client for OpenAI generation and embedding APIs."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        client: Optional[Any] = None,
    ) -> None:

        self.api_key = (
            api_key
            or os.getenv("OPENAI_API_KEY")
        )

        self.default_model = (
            model
            or os.getenv(
                "OPENAI_MODEL",
                "gpt-4o-mini",
            )
        )

        self.logger = logging.getLogger(
            self.__class__.__name__
        )

        self.models = {
            "gpt-4o-mini": "gpt-4o-mini",
            "gpt-4.1-mini": "gpt-4.1-mini",
            "gpt-4": "gpt-4",
            "gpt-3.5-turbo": "gpt-3.5-turbo",
        }

        if client is not None:
            self.client = client

        else:
            if not self.api_key:
                raise ValueError(
                    "OpenAI API key is required. "
                    "Set the OPENAI_API_KEY environment variable."
                )

            try:
                from openai import OpenAI

            except ImportError as exc:
                raise RuntimeError(
                    "Install the OpenAI package using "
                    "pip install openai."
                ) from exc

            self.client = OpenAI(
                api_key=self.api_key
            )

    @staticmethod
    def _validate_prompt(prompt: str) -> None:

        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError(
                "Prompt must be a non-empty string."
            )

    @staticmethod
    def _validate_generation_options(
        max_tokens: int,
        temperature: float,
    ) -> None:

        if (
            isinstance(max_tokens, bool)
            or not isinstance(max_tokens, int)
            or max_tokens <= 0
        ):
            raise ValueError(
                "max_tokens must be a positive integer."
            )

        if not 0 <= temperature <= 2:
            raise ValueError(
                "temperature must be between 0 and 2."
            )

    def _create_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> str:
        """Create a Chat Completions response."""

        self._validate_generation_options(
            max_tokens,
            temperature,
        )

        selected_model = (
            model or self.default_model
        )

        try:
            response = self.client.chat.completions.create(
                model=selected_model,
                messages=messages,
                max_completion_tokens=max_tokens,
                temperature=temperature,
            )

            content = (
                response.choices[0].message.content
            )

            if content is None:
                raise RuntimeError(
                    "OpenAI returned an empty response."
                )

            return content.strip()

        except Exception:
            self.logger.exception(
                "OpenAI completion request failed."
            )
            raise

    def generate_text(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> str:
        """Generate text from a user prompt."""

        self._validate_prompt(prompt)

        return self._create_completion(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    def generate_summary(
        self,
        text: str,
        max_length: int = 150,
    ) -> str:
        """Summarize text using the selected OpenAI model."""

        self._validate_prompt(text)

        if max_length <= 0:
            raise ValueError(
                "max_length must be positive."
            )

        prompt = (
            f"Summarize the following text in no more "
            f"than {max_length} words.\n\n"
            f"{text}"
        )

        return self.generate_text(
            prompt,
            max_tokens=max_length + 50,
            temperature=0.3,
        )

    def generate_code(
        self,
        description: str,
        language: str = "python",
    ) -> str:
        """Generate code from a natural language description."""

        self._validate_prompt(description)

        if not language.strip():
            raise ValueError(
                "Programming language is required."
            )

        prompt = (
            f"Write {language} code for the following "
            f"requirement:\n\n"
            f"{description}\n\n"
            "Return only the code without Markdown fences "
            "or additional explanations."
        )

        return self.generate_text(
            prompt,
            temperature=0.2,
        )

    def generate_documentation(
        self,
        code: str,
        language: str = "python",
    ) -> str:
        """Generate documentation for source code."""

        self._validate_prompt(code)

        prompt = (
            f"Generate comprehensive documentation "
            f"for the following {language} code.\n\n"
            f"{code}\n\n"
            "Include function descriptions, parameters, "
            "return values, exceptions, and usage examples."
        )

        return self.generate_text(
            prompt,
            temperature=0.4,
        )

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> str:
        """Generate a response using conversation history."""

        if not isinstance(messages, list) or not messages:
            raise ValueError(
                "Messages must be a non-empty list."
            )

        allowed_roles = {
            "system",
            "developer",
            "user",
            "assistant",
        }

        for message in messages:

            if not isinstance(message, dict):
                raise ValueError(
                    "Every message must be an object."
                )

            if message.get("role") not in allowed_roles:
                raise ValueError(
                    "Invalid conversation message role."
                )

            if not isinstance(
                message.get("content"),
                str,
            ):
                raise ValueError(
                    "Message content must be a string."
                )

        return self._create_completion(
            messages=messages,
            model=model,
            max_tokens=1000,
            temperature=0.7,
        )

    def generate_embeddings(
        self,
        text: str,
        model: str = "text-embedding-3-small",
    ) -> List[float]:
        """Generate a vector embedding for input text."""

        self._validate_prompt(text)

        if not model.strip():
            raise ValueError(
                "Embedding model is required."
            )

        try:
            response = self.client.embeddings.create(
                model=model,
                input=text,
            )

            return response.data[0].embedding

        except Exception:
            self.logger.exception(
                "OpenAI embedding request failed."
            )
            raise

    def batch_generate(
        self,
        prompts: List[str],
        model: Optional[str] = None,
    ) -> List[str]:
        """Generate outputs for multiple prompts."""

        if not isinstance(prompts, list):
            raise ValueError(
                "prompts must be a list."
            )

        results = []

        for prompt in prompts:

            try:
                results.append(
                    self.generate_text(
                        prompt,
                        model=model,
                    )
                )

            except Exception:
                self.logger.exception(
                    "Batch generation failed."
                )

                results.append(
                    "Error: Text generation failed."
                )

        return results