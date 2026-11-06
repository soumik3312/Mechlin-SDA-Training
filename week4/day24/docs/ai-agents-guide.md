# AI Agents Guide

## 1. Agent Architecture

An AI agent combines a language model with tools, memory, reasoning,
and decision-making capabilities.

The Day 24 implementation uses:

- LangChain for agent orchestration.
- LangGraph for state management and tool execution.
- Ollama for local language-model inference.
- Mistral 7B for agent responses and tool selection.
- SQLite for persistent checkpoints and conversation data.
- Flask for REST API integration.

## 2. Agent Components

### Language Model

The local Mistral model interprets user requests, chooses tools,
and produces responses.

### Tools

The implementation provides:

- Calculator: restricted arithmetic evaluation.
- Web Search: integration placeholder for a search provider.
- File Operations: list, read, and write within an isolated workspace.
- Database Query: read-only queries against the agent_notes table.
- Custom Tool: demonstration of a custom LangChain tool.

### Tool Safety

The calculator uses an AST allowlist instead of Python eval().

File operations cannot access paths outside the dedicated workspace.

Database queries are restricted to read-only SELECT statements.

Dynamic tool registration accepts only predefined registered tools.
Client-submitted code is never executed.

## 3. Memory Systems

### Short-Term Memory

The ConversationAgent provides a bounded recent conversation history
using the max_memory_length setting.

### Long-Term Memory

LangGraph checkpoints persist message history by thread ID.

Additional conversation context, topics, and reminders are stored in SQLite.

Each conversation can be isolated using a unique thread_id.

### Clearing Memory

The memory/clear endpoint removes the selected conversation's
checkpoint and associated conversation records.

## 4. Multi-Turn Conversations

A client supplies the same thread_id for each message in a conversation.

The agent retrieves the existing checkpoint and continues the
conversation with its saved messages.

Different thread IDs maintain separate conversation states.

## 5. Tool Integration

Tools are registered using LangChain's tool interface.

The agent can request a tool, receive its result, and continue
reasoning with the tool output.

The API supports:

- Listing enabled tools.
- Adding a predefined registered tool.
- Removing an enabled tool.

Arbitrary code execution is not supported.

## 6. REST API

The Flask API exposes:

| Endpoint | Method | Purpose |
|---|---|---|
| /health | GET | API health |
| /chat | POST | Chat with an agent |
| /memory | GET | Retrieve memory |
| /memory/clear | POST | Clear a thread |
| /tools | GET | List enabled tools |
| /tools/add | POST | Add a registered tool |
| /tools/remove | POST | Remove an enabled tool |

Supported agent types are `langchain` and `conversation`.

## 7. Web Integration

WebAIAgentIntegration provides:

- Agent chat.
- Conversation history.
- Thread IDs.
- Memory retrieval and clearing.
- Tool management.
- Health checks.

## 8. Mobile Integration

MobileAIAgentIntegration provides the same API operations for
React Native applications.

AsyncStorage stores local conversation history and supports
restoring it between application launches.

## 9. Error Handling

The system validates incoming messages, agent types, thread IDs,
tool names, database queries, and file paths.

API errors return meaningful HTTP status codes.

## 10. Performance and Resource Management

The local Mistral model uses a 2,048-token context setting to
reduce GPU memory usage.

Ollama handles model execution locally.

SQLite checkpoints persist agent state without requiring a
hosted memory service.

## 11. Running the Application

Activate the Day 24 virtual environment and configure the
DAY24_STORAGE_DIR environment variable.

Start the API from the repository root:

`python -m week4.day24.ai.agents.agent_api`

The local API listens on:

`http://127.0.0.1:5002`

## 12. Testing

Run the Day 24 test suite:

`python -m pytest week4/day24/tests -v`

The tests cover calculator safety, file access, database restrictions,
Flask routes, memory endpoints, and tool registration.