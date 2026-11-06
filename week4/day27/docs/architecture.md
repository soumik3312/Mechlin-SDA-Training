# TaskPilot AI — System Architecture

## 1. Overview

TaskPilot AI is a full-stack task management application with AI-assisted
productivity features.

The Day 27 application consists of:

- React and TypeScript web frontend.
- Node.js and Express REST API.
- JWT-based authentication.
- JSON-file persistence for the capstone demonstration.
- Socket.IO task events.
- AI integration through the existing Day 24–26 local services.
- Docker and Kubernetes deployment configuration.
- GitHub Actions build, test, validation and image-publishing workflow.

## 2. Logical architecture

```mermaid
flowchart TD
    Browser[Browser / React UI]

    subgraph Day27[Day 27 Capstone]
        Nginx[Nginx reverse proxy]
        Web[React frontend]
        API[Express API]
        Socket[Socket.IO]
        Store[(Persistent JSON store)]

        Browser --> Nginx
        Nginx --> Web
        Nginx -->|/api| API
        Nginx -->|/socket.io| Socket
        API --> Store
        API --- Socket
    end

    subgraph AI[Existing local AI stack]
        Gateway[Day 26 Mobile AI Gateway]
        WebAI[Day 25 AI Web Service]
        Agents[Day 24 AI Agents]
        Ollama[Ollama]
        Model[Mistral latest]

        API --> Gateway
        Gateway --> WebAI
        WebAI --> Agents
        Agents --> Ollama
        Ollama --> Model
    end