# Generative AI Guide

## 1. Generative AI Fundamentals

Generative Artificial Intelligence is a branch of AI
that creates new content based on patterns learned
from existing data.

Generative AI can produce:

- Text
- Images
- Audio
- Video
- Computer code
- Structured information

## 2. Large Language Models

Large Language Models (LLMs) are models trained
on large collections of text to understand and
generate natural language.

### Transformer Architecture

Transformers use attention mechanisms to process
relationships between tokens in a sequence.

Important concepts:

- Tokens
- Embeddings
- Attention mechanisms
- Encoder and decoder layers
- Context windows
- Model inference

### GPT Models

GPT models are autoregressive language models
used for text generation, conversation, code
generation, and other language tasks.

### BERT Models

BERT is an encoder-based transformer architecture
commonly used for language understanding tasks
such as classification and question answering.

## 3. OpenAI Integration

OpenAI provides APIs for accessing hosted
generative AI models.

The Day 23 implementation uses the maintained
OpenAI Python SDK.

Capabilities include:

- Text generation
- Text summarization
- Code generation
- Documentation generation
- Chat completion
- Text embeddings
- Batch generation

### API Key Management

Store the API key in an environment variable:

OPENAI_API_KEY

Never hardcode API keys in source code or
commit secrets to GitHub.

The default model is configurable through:

OPENAI_MODEL

The selected model must be available to
the configured OpenAI account.

### Cost Optimization

- Select an appropriate model for each task.
- Limit output tokens.
- Avoid unnecessarily long prompts.
- Monitor token usage.
- Reuse application results when appropriate.
- Handle rate limits and API failures.

## 4. Hugging Face Integration

Hugging Face provides access to open-source
models through the Transformers library.

The Day 23 integration supports three pipelines.

### Text Generation

Default model:

gpt2

Text generation creates new content from
an input prompt.

### Text Summarization

Default model:

facebook/bart-large-cnn

Summarization produces shorter versions of
longer text.

### Question Answering

Default model:

distilbert-base-cased-distilled-squad

Question answering extracts an answer based
on a supplied context.

### Model Loading

Models are loaded lazily and cached in memory.

This avoids downloading every model when
the application first starts.

The implementation automatically checks
for CUDA availability and selects GPU
when supported, otherwise CPU.

Hugging Face models may require substantial
disk space, memory, and download time.

## 5. Ollama Integration

Ollama provides local LLM deployment and
management through a local REST API.

Default server:

http://localhost:11434

Default demonstration model:

llama3.2

### Supported Operations

- List available models.
- Pull models.
- Generate text.
- Chat completion.
- Retrieve model information.
- Delete locally installed models.

### Common Ollama Commands

List models:

ollama list

Download a model:

ollama pull llama3.2

Run a model:

ollama run llama3.2

Start the server if it is not already running:

ollama serve

Ollama keeps inference local to the machine
unless an external service is explicitly
configured.

Model downloads and inference require
appropriate disk space, RAM, and processing
resources.

## 6. Prompt Engineering

Prompt engineering is the process of designing
instructions that guide an LLM toward useful
outputs.

### Effective Prompt Design

A good prompt should contain:

1. A clear task.
2. Relevant context.
3. Constraints.
4. Expected output format.
5. Examples when necessary.

### Prompt Optimization

- Use precise instructions.
- Avoid unnecessary ambiguity.
- Set output length limits.
- Separate instructions from input data.
- Validate model-generated output.
- Test prompts with representative examples.

## 7. Fine-Tuning and Optimization

Fine-tuning adapts an existing pretrained
model using additional task-specific data.

Common approaches include:

- Supervised fine-tuning
- Instruction tuning
- Parameter-efficient fine-tuning
- LoRA
- Quantization

Fine-tuning requires appropriate datasets,
evaluation, and computational resources.

Prompt engineering and retrieval-based methods
should also be evaluated before choosing
fine-tuning.

## 8. API Architecture

The Day 23 application uses Flask as a unified
REST API layer.

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| /generate/text | POST | Text generation |
| /generate/summary | POST | Summarization |
| /generate/code | POST | Code generation |
| /chat | POST | Chat completion |
| /models | GET | Model listing |
| /health | GET | Health monitoring |

### Request Flow

1. The client sends a request.
2. Flask validates the input.
3. The provider is selected.
4. The selected integration performs inference.
5. The API formats the response.
6. The result is returned as JSON.

## 9. Best Practices

### Prompt Design

- Use task-specific instructions.
- Define output expectations.
- Avoid unnecessarily large prompts.
- Validate generated content.

### Cost Optimization

- Choose suitable models.
- Set token limits.
- Monitor usage and response times.
- Avoid repeated unnecessary requests.

### Security

- Protect API credentials.
- Use environment variables.
- Validate user input.
- Restrict CORS origins.
- Apply authentication for production APIs.
- Avoid exposing internal errors or secrets.

### Performance

- Reuse loaded model pipelines.
- Use batch processing where appropriate.
- Configure request timeouts.
- Monitor model latency.
- Use suitable hardware for local inference.

### Responsible AI

- Review generated outputs.
- Monitor hallucinations.
- Evaluate bias.
- Protect user privacy.
- Respect data licensing.
- Maintain human oversight for important decisions.

## 10. Running the Day 23 Application

### Install core dependencies

python -m pip install -r requirements.txt

### Install Hugging Face dependencies

python -m pip install -r requirements-huggingface.txt

### Configure OpenAI

Set the OPENAI_API_KEY environment variable.

### Configure Ollama

Install Ollama and download a local model.

ollama pull llama3.2

### Start the API

python -m ai.content_generation_api

The default development API address is:

http://127.0.0.1:5001

### Verify health

GET /health

### List models

GET /models

## 11. Day 23 Deliverables

- OpenAI integration.
- Hugging Face integration.
- Ollama integration.
- Unified content generation API.
- Web AI integration.
- Chat completion with conversation history.
- Automated tests.
- Generative AI documentation.