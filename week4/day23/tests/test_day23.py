"""Automated tests for Day 23 Generative AI integrations."""

from types import SimpleNamespace

import pytest

from ai.openai_integration import OpenAIIntegration
from ai.huggingface_integration import HuggingFaceIntegration
from ai.ollama_integration import OllamaIntegration
from ai.content_generation_api import AIContentGenerationAPI


class FakeOpenAIClient:

    def __init__(self):

        self.chat = SimpleNamespace(
            completions=SimpleNamespace(
                create=self.create_completion
            )
        )

        self.embeddings = SimpleNamespace(
            create=self.create_embedding
        )

    def create_completion(self, **kwargs):

        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content="Generated test response."
                    )
                )
            ]
        )

    def create_embedding(self, **kwargs):

        return SimpleNamespace(
            data=[
                SimpleNamespace(
                    embedding=[0.1, 0.2, 0.3]
                )
            ]
        )


def test_openai_text_generation_and_embeddings():

    client = FakeOpenAIClient()

    service = OpenAIIntegration(
        api_key="test-key",
        model="test-model",
        client=client,
    )

    result = service.generate_text(
        "Explain generative AI."
    )

    assert result == "Generated test response."

    embedding = service.generate_embeddings(
        "Artificial intelligence"
    )

    assert embedding == [0.1, 0.2, 0.3]

    summary = service.generate_summary(
        "A long demonstration text.",
        max_length=50,
    )

    assert summary == "Generated test response."


def test_openai_rejects_missing_api_key(monkeypatch):

    monkeypatch.delenv(
        "OPENAI_API_KEY",
        raising=False,
    )

    with pytest.raises(
        ValueError,
        match="OpenAI API key is required",
    ):

        OpenAIIntegration(
            api_key=None
        )


class FakeHFPipeline:

    def __init__(self, task):

        self.task = task

        self.tokenizer = SimpleNamespace(
            pad_token_id=0,
            eos_token=None,
        )

    def __call__(self, *args, **kwargs):

        if self.task == "text-generation":
            return [
                {
                    "generated_text": "Generated Hugging Face text."
                }
            ]

        if self.task == "summarization":
            return [
                {
                    "summary_text": "Generated summary."
                }
            ]

        if self.task == "question-answering":
            return {
                "answer": "Artificial intelligence",
                "score": 0.95,
            }

        raise ValueError(
            f"Unsupported task: {self.task}"
        )


def test_huggingface_pipelines():

    loaded = []

    def fake_factory(task, model, device):

        loaded.append(
            {
                "task": task,
                "model": model,
                "device": device,
            }
        )

        return FakeHFPipeline(task)

    service = HuggingFaceIntegration(
        pipeline_factory=fake_factory
    )

    generated = service.generate_text(
        "Once upon a time",
        max_length=30,
    )

    assert generated == "Generated Hugging Face text."

    summary = service.summarize_text(
        "A long demonstration article.",
        max_length=100,
        min_length=20,
    )

    assert summary == "Generated summary."

    answer = service.answer_question(
        "What is the topic?",
        "The topic is Artificial intelligence.",
    )

    assert answer["answer"] == "Artificial intelligence"

    assert len(loaded) == 3

    service.generate_text(
        "Another prompt"
    )

    assert len(loaded) == 3

    info = service.get_model_info()

    assert "device" in info
    assert len(info["loaded_models"]) == 3


class FakeResponse:

    def __init__(self, payload):

        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeOllamaSession:

    def __init__(self):

        self.requests = []

    def get(self, url, **kwargs):

        self.requests.append(
            ("GET", url)
        )

        return FakeResponse(
            {
                "models": [
                    {
                        "name": "llama3.2:latest"
                    }
                ]
            }
        )

    def post(self, url, **kwargs):

        self.requests.append(
            ("POST", url, kwargs)
        )

        if url.endswith("/api/generate"):

            return FakeResponse(
                {
                    "response": "Local Ollama generation."
                }
            )

        if url.endswith("/api/chat"):

            return FakeResponse(
                {
                    "message": {
                        "role": "assistant",
                        "content": "Local Ollama response.",
                    }
                }
            )

        if url.endswith("/api/show"):

            return FakeResponse(
                {
                    "details": {
                        "format": "gguf"
                    }
                }
            )

        if url.endswith("/api/pull"):

            return FakeResponse(
                {
                    "status": "success"
                }
            )

        raise AssertionError(
            f"Unexpected URL: {url}"
        )

    def delete(self, url, **kwargs):

        self.requests.append(
            ("DELETE", url, kwargs)
        )

        return FakeResponse(
            {
                "status": "success"
            }
        )


def test_ollama_generation_chat_and_model_info():

    session = FakeOllamaSession()

    service = OllamaIntegration(
        session=session
    )

    assert service.is_connected is True

    assert "llama3.2:latest" in service.list_models()

    result = service.generate_text(
        "Explain AI.",
        model="llama3.2",
    )

    assert result == "Local Ollama generation."

    chat_result = service.chat_completion(
        [
            {
                "role": "user",
                "content": "Hello",
            }
        ],
        model="llama3.2",
    )

    assert chat_result == "Local Ollama response."

    info = service.get_model_info(
        "llama3.2"
    )

    assert info["details"]["format"] == "gguf"

    assert any(
        item[1].endswith("/api/generate")
        for item in session.requests
    )


class FakeOpenAIService:

    default_model = "gpt-4o-mini"

    models = {
        "gpt-4o-mini": "gpt-4o-mini"
    }

    def generate_text(self, **kwargs):

        return "OpenAI generated text."

    def generate_code(self, description, language):

        return f"# Generated {language} code"

    def chat_completion(self, messages, model=None):

        return "OpenAI chat response."


class FakeHuggingFaceService:

    def generate_text(
        self,
        prompt,
        model_name,
        max_length,
        temperature,
    ):

        return "Hugging Face generated text."

    def summarize_text(self, text, max_length):

        return "Hugging Face summary."


class FakeOllamaService:

    is_connected = True

    def generate_text(
        self,
        prompt,
        model,
        options=None,
    ):

        return "Ollama generated text."

    def chat_completion(
        self,
        messages,
        model,
    ):

        return "Ollama chat response."

    def list_models(self):

        return ["llama3.2:latest"]


def create_test_api():

    return AIContentGenerationAPI(
        openai_service=FakeOpenAIService(),
        ollama_service=FakeOllamaService(),
        huggingface_service=FakeHuggingFaceService(),
    )


def test_content_generation_api_endpoints():

    service = create_test_api()

    client = service.app.test_client()

    health = client.get("/health")

    assert health.status_code == 200
    assert health.json["status"] == "healthy"

    models = client.get("/models")

    assert models.status_code == 200
    assert "openai" in models.json["models"]
    assert "ollama" in models.json["models"]

    text = client.post(
        "/generate/text",
        json={
            "prompt": "Explain generative AI.",
            "provider": "openai",
        },
    )

    assert text.status_code == 200
    assert text.json["result"] == "OpenAI generated text."

    hf_text = client.post(
        "/generate/text",
        json={
            "prompt": "Continue a story.",
            "provider": "huggingface",
        },
    )

    assert hf_text.status_code == 200

    assert (
        hf_text.json["result"]
        == "Hugging Face generated text."
    )

    ollama_text = client.post(
        "/generate/text",
        json={
            "prompt": "Explain AI.",
            "provider": "ollama",
            "model": "llama3.2",
        },
    )

    assert ollama_text.status_code == 200

    summary = client.post(
        "/generate/summary",
        json={
            "text": "A long example article.",
            "max_length": 100,
        },
    )

    assert summary.status_code == 200

    code = client.post(
        "/generate/code",
        json={
            "description": "Create a Python function.",
            "language": "python",
        },
    )

    assert code.status_code == 200

    chat = client.post(
        "/chat",
        json={
            "provider": "ollama",
            "model": "llama3.2",
            "messages": [
                {
                    "role": "user",
                    "content": "Hello AI.",
                }
            ],
        },
    )

    assert chat.status_code == 200
    assert chat.json["success"] is True


def test_api_rejects_invalid_prompt():

    service = create_test_api()

    client = service.app.test_client()

    response = client.post(
        "/generate/text",
        json={
            "prompt": ""
        },
    )

    assert response.status_code == 400
    assert response.json["success"] is False


def test_api_rejects_unsupported_provider():

    service = create_test_api()

    client = service.app.test_client()

    response = client.post(
        "/generate/text",
        json={
            "prompt": "Test",
            "provider": "unknown",
        },
    )

    assert response.status_code == 400