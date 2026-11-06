# SDA Training Capstone Project — Final Demo Script

## 1. Introduction (2 minutes)

Good morning/afternoon everyone.

Today I am presenting my SDA Training Capstone Project, TaskPilot AI, an AI-powered task management platform.

The objective of this project is to bring together the technologies and practical skills developed during the four-week training program:

- Frontend and backend development
- REST API development
- AI/ML and LLM integration
- Mobile application development
- Docker and Kubernetes
- CI/CD and software testing

I will demonstrate the application, explain its architecture and discuss the key learning outcomes.

## 2. Project Architecture (3 minutes)

Explain the actual TaskPilot architecture.

### Frontend
- React and TypeScript
- Vite production build
- Responsive user interface
- Nginx reverse proxy

### Backend
- Node.js and Express
- REST API endpoints
- JWT-based authentication
- Socket.IO real-time communication
- JSON-based persistent storage

### AI Architecture

The AI request flow is:

TaskPilot Backend
→ Day 26 Mobile AI Gateway
→ Day 25 AI Web Service
→ Day 24 AI Agents
→ Ollama
→ Mistral model

The local gateway allows the application to use the existing AI services.

### Infrastructure
- Docker and Docker Compose
- Named Docker volume for persistent application data
- Kubernetes manifests
- Kustomize configuration
- GitHub Actions CI/CD

## 3. Frontend Demonstration (6 minutes)

Open:

http://localhost:8080

Demonstrate:

1. Registration and login.
2. Dashboard loading.
3. Task creation.
4. Task priority selection.
5. Task status updates.
6. Task deletion.
7. Dashboard analytics.
8. Real-time task updates.

Explain how the frontend communicates with the backend through the REST API.

## 4. Backend Demonstration (3 minutes)

Explain the backend structure.

Highlight:

- Express application and server.
- Authentication middleware.
- Registration and login endpoints.
- Protected task routes.
- AI routes.
- Analytics route.
- Input validation and error handling.
- JSON persistence layer.

Explain how each authenticated user's tasks are isolated.

## 5. Mobile Development Showcase (3 minutes)

Present the mobile development work completed during the training:

- React Native development from Day 19.
- Flutter development from Day 20.
- Mobile AI integration from Day 26.

Explain the mobile AI gateway and how it exposes mobile-friendly AI endpoints.

Important: Present these as mobile training projects and integration work. Do not claim that the TaskPilot web frontend itself contains fully integrated React Native and Flutter applications.

## 6. AI Integration Demonstration (6 minutes)

Demonstrate the three working TaskPilot AI features.

### AI Chat
Send a message through the application.

Explain:
- Authenticated API request.
- Persistent conversation thread identifier.
- Local AI gateway.
- Ollama and Mistral response.

### Content Generation
Generate a short article or another supported content type.

Explain the topic, tone, length and keyword options.

### Recommendations
Generate recommendations using a sample user profile.

Explain the recommendation endpoint and catalogue tag-matching approach.

## 7. DevOps Demonstration (4 minutes)

Show the Docker containers:

    docker ps

Explain:

- Frontend and backend Docker images.
- Docker Compose configuration.
- Container health checks.
- Nginx reverse proxy.
- Persistent Docker volume.
- Kubernetes manifests and Kustomize.
- GitHub Actions workflow.

Explain that Kubernetes manifests were validated and rendered locally. Do not claim a live Kubernetes deployment unless one has actually been performed.

## 8. Performance and Security (3 minutes)

Discuss verified implementation details.

### Security
- JWT authentication.
- Protected API routes.
- Per-user task ownership.
- Input validation.
- API rate limiting.
- Helmet security middleware.
- Environment-based secret configuration.

### Testing
- Twelve backend regression tests passed.
- AI chat integration passed.
- Content generation integration passed.
- Recommendation integration passed.
- Docker task CRUD tests passed.
- Persistence after backend restart passed.
- Kubernetes manifest rendering passed.
- GitHub Actions checks passed.

Do not present unmeasured performance figures as actual benchmark results.

## 9. Conclusion (3 minutes)

Summarize the project:

TaskPilot AI demonstrates how frontend development, backend services, AI integration and DevOps practices can work together in one application.

The training program also provided hands-on experience with mobile development, AI agents, containerization, deployment, testing and technical documentation.

Thank the instructors, mentors and team for their guidance and support.

## 10. Q&A (10 minutes)

Be prepared to explain:

- Why React and TypeScript were selected.
- How JWT authentication works.
- How tasks are persisted.
- How Socket.IO provides real-time updates.
- How the AI gateway communicates with local services.
- Why Docker volumes are important.
- How Kubernetes manifests are organized.
- How the CI/CD workflow validates changes.

## Pre-Demo Checklist

- [ ] Keep the existing four AI server terminals running.
- [ ] Confirm the TaskPilot browser is accessible.
- [ ] Keep the existing Docker containers running.
- [ ] Prepare a test account.
- [ ] Prepare sample task descriptions.
- [ ] Prepare one AI chat prompt.
- [ ] Prepare one content-generation example.
- [ ] Prepare one recommendation example.
- [ ] Keep presentation slides available.
- [ ] Prepare screenshots as a backup.

## Backup Plan

If a live service becomes unavailable:

1. Explain the intended architecture.
2. Show previously captured successful responses.
3. Use the source code and documentation to explain implementation.
4. Continue the presentation without restarting services unnecessarily.

## Final Reminder

Focus on the work actually implemented, explain technical decisions clearly, and distinguish verified results from future enhancements.