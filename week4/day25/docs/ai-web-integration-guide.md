# AI Web Integration Guide

## 1. Overview

Day 25 integrates the Day 24 local AI agent system into a browser-based application.

The web application provides four main features:

- **AI Chatbot:** Multi-turn conversation with persistent server-side memory.
- **AI Content Generator:** Generate articles, blog posts, social media content, emails, and product descriptions.
- **AI Recommendations:** Rank learning resources using user-interest and catalogue-tag matching.
- **AI Analytics:** Display application request counts and recommendation feedback statistics.

The application uses a local Ollama/Mistral model. It does not require an OpenAI API key or a paid inference service.

## 2. Architecture

```text
Browser
  |
  | HTML, CSS and JavaScript
  |
  +-- AIChatbot
  +-- AIContentGenerator
  +-- AIRecommendations
  +-- AIAnalytics
  |
  | HTTP / JSON
  |
Flask Web Service (port 5002)
  |
  +-- Chat and memory endpoints
  +-- Content generation endpoint
  +-- Recommendation endpoints
  +-- Analytics endpoint
  |
  +-- Day 24 ConversationAgent
  +-- Day 24 LangChainAgent
  |
  +-- Local Ollama / Mistral
  |
  +-- SQLite analytics and feedback database