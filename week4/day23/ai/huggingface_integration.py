"""Hugging Face Transformers integration."""

from __future__ import annotations

import logging

from typing import Any, Callable, Dict, Optional


class HuggingFaceIntegration:
    """Manage text generation, summarization, and QA pipelines."""

    DEFAULT_MODELS = {
        "text_generation": "gpt2",
        "summarization": "facebook/bart-large-cnn",
        "question_answering": (
            "distilbert-base-cased-distilled-squad"
        ),
    }

    def __init__(
        self,
        pipeline_factory: Optional[Callable] = None,
    ) -> None:

        self.logger = logging.getLogger(
            self.__class__.__name__
        )

        self.models: Dict[str, Any] = {}
        self.tokenizers: Dict[str, Any] = {}

        self.pipeline_factory = pipeline_factory

        self.cuda_available = False
        self.device = "cpu"

        try:
            import torch

            self.cuda_available = bool(
                torch.cuda.is_available()
            )

            if self.cuda_available:
                self.device = "cuda"

        except ImportError:
            self.logger.warning(
                "PyTorch is not installed. "
                "Hugging Face inference is unavailable."
            )

    def _get_pipeline(
        self,
        task: str,
        model_name: str,
    ) -> Any:
        """Load a pipeline once and reuse it."""

        key = task

        if key in self.models:
            return self.models[key]

        try:
            if self.pipeline_factory is not None:
                factory = self.pipeline_factory

            else:
                from transformers import pipeline

                factory = pipeline

            device_index = (
                0 if self.cuda_available else -1
            )

            self.logger.info(
                "Loading Hugging Face model %s for %s",
                model_name,
                task,
            )

            model_pipeline = factory(
                task,
                model=model_name,
                device=device_index,
            )

            tokenizer = getattr(
                model_pipeline,
                "tokenizer",
                None,
            )

            # GPT-2 does not have a separate padding token.
            if (
                tokenizer is not None
                and getattr(tokenizer, "pad_token_id", None) is None
                and getattr(tokenizer, "eos_token", None)
            ):
                tokenizer.pad_token = tokenizer.eos_token

            self.models[key] = model_pipeline

            if tokenizer is not None:
                self.tokenizers[key] = tokenizer

            self.logger.info(
                "Model %s loaded successfully.",
                model_name,
            )

            return model_pipeline

        except ImportError as exc:
            raise RuntimeError(
                "Hugging Face dependencies are missing. "
                "Install requirements-huggingface.txt."
            ) from exc

        except Exception:
            self.logger.exception(
                "Failed to load Hugging Face model %s",
                model_name,
            )
            raise

    def load_text_generation_model(
        self,
        model_name: str = "gpt2",
    ) -> Any:
        """Load a text-generation model."""

        return self._get_pipeline(
            "text-generation",
            model_name,
        )

    def load_summarization_model(
        self,
        model_name: str = "facebook/bart-large-cnn",
    ) -> Any:
        """Load a summarization model."""

        return self._get_pipeline(
            "summarization",
            model_name,
        )

    def load_question_answering_model(
        self,
        model_name: str = (
            "distilbert-base-cased-distilled-squad"
        ),
    ) -> Any:
        """Load a question-answering model."""

        return self._get_pipeline(
            "question-answering",
            model_name,
        )

    def generate_text(
        self,
        prompt: str,
        max_length: int = 100,
        temperature: float = 0.7,
        model_name: str = "gpt2",
    ) -> str:
        """Generate text using a Hugging Face model."""

        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError(
                "Prompt must be a non-empty string."
            )

        if max_length <= 0:
            raise ValueError(
                "max_length must be positive."
            )

        if temperature < 0:
            raise ValueError(
                "temperature cannot be negative."
            )

        generator = self._get_pipeline(
            "text-generation",
            model_name,
        )

        try:
            options = {
                "max_new_tokens": max_length,
                "do_sample": temperature > 0,
                "return_full_text": False,
            }

            if temperature > 0:
                options["temperature"] = temperature

            tokenizer = getattr(
                generator,
                "tokenizer",
                None,
            )

            if tokenizer is not None:
                pad_token_id = getattr(
                    tokenizer,
                    "pad_token_id",
                    None,
                )

                if pad_token_id is not None:
                    options["pad_token_id"] = pad_token_id

            result = generator(
                prompt,
                **options,
            )

            if not result:
                raise RuntimeError(
                    "Hugging Face returned no generated text."
                )

            return result[0]["generated_text"]

        except Exception:
            self.logger.exception(
                "Hugging Face text generation failed."
            )
            raise

    def summarize_text(
        self,
        text: str,
        max_length: int = 150,
        min_length: int = 30,
    ) -> str:
        """Summarize text using a Hugging Face model."""

        if not isinstance(text, str) or not text.strip():
            raise ValueError(
                "Text must be a non-empty string."
            )

        if (
            max_length <= 0
            or min_length < 0
            or min_length >= max_length
        ):
            raise ValueError(
                "Require 0 <= min_length < max_length."
            )

        summarizer = self._get_pipeline(
            "summarization",
            self.DEFAULT_MODELS["summarization"],
        )

        try:
            result = summarizer(
                text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
                truncation=True,
            )

            if not result:
                raise RuntimeError(
                    "No summary was generated."
                )

            return result[0]["summary_text"]

        except Exception:
            self.logger.exception(
                "Hugging Face summarization failed."
            )
            raise

    def answer_question(
        self,
        question: str,
        context: str,
    ) -> Dict[str, Any]:
        """Answer a question using the supplied context."""

        if not question.strip() or not context.strip():
            raise ValueError(
                "Question and context are required."
            )

        qa_pipeline = self._get_pipeline(
            "question-answering",
            self.DEFAULT_MODELS["question_answering"],
        )

        try:
            result = qa_pipeline(
                question=question,
                context=context,
            )

            return result

        except Exception:
            self.logger.exception(
                "Hugging Face question answering failed."
            )
            raise

    def get_model_info(self) -> Dict[str, Any]:
        """Return the current inference environment."""

        return {
            "device": self.device,
            "cuda_available": self.cuda_available,
            "loaded_models": list(self.models.keys()),
            "model_names": self.DEFAULT_MODELS.copy(),
        }