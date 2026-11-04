
"""LangChain agent using Mistral raw-mode tool calling and SQLite memory."""

from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
from pathlib import Path
from typing import Any, ClassVar, Optional, Sequence
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# Enable strict checkpoint deserialization before importing LangGraph.
os.environ.setdefault("LANGGRAPH_STRICT_MSGPACK", "true")

from langchain.agents import create_agent
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.runnables import Runnable
from langchain_core.utils.function_calling import convert_to_openai_tool
from langgraph.checkpoint.sqlite import SqliteSaver

from .tools import build_general_tools


DEFAULT_STORAGE = Path(
    os.getenv(
        "DAY24_STORAGE_DIR",
        r"D:\Mechlin-SDA-Training\AI-Storage\Day24",
    )
)


class MistralRawChatModel(BaseChatModel):
    """LangChain-compatible chat model using Ollama's Mistral raw protocol."""

    model: str = "mistral:latest"
    base_url: str = "http://127.0.0.1:11434"
    temperature: float = 0.2
    num_ctx: int = 2048
    num_predict: int = 192
    keep_alive: str = "30s"
    request_timeout: float = 240.0

    @property
    def _llm_type(self) -> str:
        return "ollama-mistral-raw"

    @property
    def _identifying_params(self) -> dict[str, Any]:
        return {
            "model": self.model,
            "base_url": self.base_url,
            "temperature": self.temperature,
            "num_ctx": self.num_ctx,
            "num_predict": self.num_predict,
        }

    # Each registered tool is shown to Mistral only when its intent
    # is relevant to the latest user message.
    TOOL_INTENTS: ClassVar[dict[str, tuple[str, ...]]] = {
        "calculator": (
            "calculator",
            "calculate",
            "calculation",
            "compute",
            "arithmetic",
            "multiply",
            "multiplication",
            "multiplied by",
            "divide",
            "divided by",
            "division",
            "subtract",
            "subtraction",
            "addition",
            "sum",
            "product",
            "square root",
            "percentage",
            "percent",
            "plus",
            "minus",
        ),
        "web_search": (
            "web search",
            "search the web",
            "search online",
            "look up online",
            "internet",
            "latest",
            "current news",
            "recent news",
            "recent developments",
            "news",
            "find sources",
            "online sources",
        ),
        "file_operations": (
            "file",
            "files",
            "folder",
            "folders",
            "directory",
            "directories",
            "workspace",
            "read file",
            "write file",
            "create file",
            "delete file",
            "list files",
            "open file",
            "save file",
        ),
        "database_query": (
            "database",
            "sqlite",
            "sql",
            "agent_notes",
            "database query",
            "query the database",
            "database records",
            "database table",
        ),
        "custom_tool": (
            "custom tool",
            "custom_tool",
        ),
        "context_manager": (
            "context manager",
            "conversation context",
            "context summary",
            "summarize this conversation",
            "conversation summary",
            "clear memory",
            "clear conversation memory",
            "show conversation memory",
        ),
        "emotion_analyzer": (
            "emotion",
            "emotional",
            "sentiment",
            "mood",
            "tone of this message",
        ),
        "topic_tracker": (
            "topic tracker",
            "track topics",
            "identify topics",
            "current topics",
            "topics in this conversation",
        ),
        "reminder_setter": (
            "remind me",
            "reminder",
            "set a reminder",
            "follow-up",
            "follow up",
            "follow-up task",
        ),
    }

    @staticmethod
    def _content_to_text(content: Any) -> str:
        """Convert LangChain message content into plain text."""

        if isinstance(content, str):
            return content

        if isinstance(content, list):
            parts = []

            for item in content:
                if isinstance(item, dict) and "text" in item:
                    parts.append(str(item["text"]))
                else:
                    parts.append(str(item))

            return "\n".join(parts)

        return str(content)

    @staticmethod
    def _latest_user_text(messages: list[BaseMessage]) -> str:
        """Return the latest user message for tool-intent routing."""

        for message in reversed(messages):
            if isinstance(message, HumanMessage):
                return MistralRawChatModel._content_to_text(
                    message.content
                ).lower()

        return ""

    @staticmethod
    def _contains_phrase(text: str, phrase: str) -> bool:
        """Match a phrase without accidentally matching inside other words."""

        if " " in phrase:
            return phrase in text

        return re.search(
            rf"(?<!\w){re.escape(phrase)}(?!\w)",
            text,
        ) is not None

    @classmethod
    def _filter_relevant_tools(
        cls,
        messages: list[BaseMessage],
        tools: Sequence[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Give Mistral only the tools relevant to the current request."""

        if not tools:
            return []

        query = cls._latest_user_text(messages)

        if not query:
            return []

        selected = []

        # Explicit mathematical expressions also indicate calculator intent.
        has_math_expression = re.search(
            r"\b\d+(?:\.\d+)?\s*"
            r"(?:\+|-|\*|/|\^|%|×|÷)\s*"
            r"\d+(?:\.\d+)?\b",
            query,
        ) is not None

        # Natural-language multiplication/division with numbers.
        has_math_words = re.search(
            r"\b\d+(?:\.\d+)?\s+"
            r"(?:times|multiplied by|divided by|plus|minus)\s+"
            r"\d+(?:\.\d+)?\b",
            query,
        ) is not None

        for schema in tools:
            function = schema.get("function", {})

            if not isinstance(function, dict):
                continue

            name = function.get("name")

            if not isinstance(name, str):
                continue

            normalized_name = name.lower().replace("_", " ")

            # Explicitly mentioning a tool always makes it relevant.
            explicitly_requested = (
                cls._contains_phrase(query, normalized_name)
                or name.lower() in query
            )

            keywords = cls.TOOL_INTENTS.get(name, ())

            keyword_match = any(
                cls._contains_phrase(query, keyword)
                for keyword in keywords
            )

            math_match = (
                name == "calculator"
                and (has_math_expression or has_math_words)
            )

            if explicitly_requested or keyword_match or math_match:
                selected.append(schema)

        return selected

    def bind_tools(
        self,
        tools: Sequence[Any],
        *,
        tool_choice: Any = None,
        **kwargs: Any,
    ) -> Runnable:
        """Convert LangChain tools to Mistral-compatible function schemas."""

        formatted_tools = [
            convert_to_openai_tool(item)
            for item in tools
        ]

        # Relevant schemas are selected in _generate for each user request.
        return self.bind(
            tools=formatted_tools,
            **kwargs,
        )

    @staticmethod
    def _format_tool_call(
        call: dict[str, Any],
    ) -> dict[str, Any]:
        """Convert a LangChain tool call to Mistral raw JSON structure."""

        name = call.get("name")
        arguments = call.get("args", {})

        if isinstance(arguments, str):
            arguments = json.loads(arguments)

        if not isinstance(name, str) or not name:
            raise ValueError("A tool call must contain a valid name.")

        if not isinstance(arguments, dict):
            raise ValueError(
                f"Tool arguments for {name!r} must be a JSON object."
            )

        return {
            "name": name,
            "arguments": arguments,
        }

    def _serialize_messages(
        self,
        messages: list[BaseMessage],
        tools: Sequence[dict[str, Any]],
    ) -> str:
        """Serialize the LangChain conversation into Mistral raw format."""

        system_parts = [
            self._content_to_text(message.content).strip()
            for message in messages
            if isinstance(message, SystemMessage)
        ]

        system_prompt = "\n\n".join(
            part for part in system_parts if part
        )

        prompt = ""

        if tools:
            prompt += (
                "[AVAILABLE_TOOLS] "
                + json.dumps(
                    list(tools),
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
                + "[/AVAILABLE_TOOLS]"
            )

        first_user_message = True

        for message in messages:

            if isinstance(message, SystemMessage):
                continue

            if isinstance(message, HumanMessage):
                user_content = self._content_to_text(
                    message.content
                ).strip()

                prompt += "[INST] "

                if first_user_message and system_prompt:
                    prompt += system_prompt + "\n\n"

                prompt += user_content + " [/INST]"
                first_user_message = False

                continue

            if isinstance(message, AIMessage):
                tool_calls = (
                    getattr(message, "tool_calls", None) or []
                )

                if tool_calls:
                    mistral_calls = [
                        self._format_tool_call(call)
                        for call in tool_calls
                    ]

                    prompt += (
                        "[TOOL_CALLS] "
                        + json.dumps(
                            mistral_calls,
                            ensure_ascii=False,
                            separators=(",", ":"),
                        )
                        + "</s>"
                    )

                else:
                    assistant_content = self._content_to_text(
                        message.content
                    ).strip()

                    if assistant_content:
                        prompt += " " + assistant_content + "</s>"

                continue

            if isinstance(message, ToolMessage):
                tool_result = self._content_to_text(
                    message.content
                )

                prompt += (
                    "[TOOL_RESULTS] "
                    + json.dumps(
                        {"content": tool_result},
                        ensure_ascii=False,
                    )
                    + "[/TOOL_RESULTS]"
                )

        if not prompt:
            raise ValueError(
                "Cannot create a Mistral prompt from empty messages."
            )

        return prompt

    @staticmethod
    def _available_tool_names(
        tools: Sequence[dict[str, Any]],
    ) -> set[str]:
        """Return the names of tools available for this model request."""

        names: set[str] = set()

        for schema in tools:
            function = schema.get("function", {})

            if isinstance(function, dict):
                name = function.get("name")

                if isinstance(name, str):
                    names.add(name)

        return names

    def _parse_response(
        self,
        output: str,
        tools: Sequence[dict[str, Any]],
    ) -> AIMessage:
        """Convert Mistral output into a LangChain AIMessage."""

        response_text = output.strip()

        if not response_text:
            raise RuntimeError(
                "Ollama returned an empty model response."
            )

        has_tool_marker = response_text.startswith("[TOOL_CALLS]")

        if has_tool_marker:
            candidate = response_text[
                len("[TOOL_CALLS]"):
            ].strip()
        else:
            candidate = response_text

        if has_tool_marker or candidate.startswith("["):
            try:
                parsed, _ = json.JSONDecoder().raw_decode(candidate)

            except json.JSONDecodeError:
                if has_tool_marker:
                    raise RuntimeError(
                        "Mistral returned an invalid structured tool call."
                    )

                parsed = None

            if isinstance(parsed, list) and parsed:
                valid_tool_calls = all(
                    isinstance(item, dict)
                    and isinstance(item.get("name"), str)
                    and isinstance(item.get("arguments"), dict)
                    for item in parsed
                )

                if valid_tool_calls:
                    available_names = self._available_tool_names(tools)

                    converted_calls = []

                    for item in parsed:
                        name = item["name"]

                        if name not in available_names:
                            raise RuntimeError(
                                "Mistral requested a tool that was not "
                                f"provided for this request: {name}"
                            )

                        converted_calls.append(
                            {
                                "name": name,
                                "args": item["arguments"],
                                "id": uuid.uuid4().hex,
                                "type": "tool_call",
                            }
                        )

                    # Do not expose model-generated claims as tool results.
                    # LangGraph must execute the structured calls.
                    return AIMessage(
                        content="",
                        tool_calls=converted_calls,
                    )

                if has_tool_marker:
                    raise RuntimeError(
                        "Mistral returned an invalid tool-call structure."
                    )

        return AIMessage(content=response_text)

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Generate a response through Ollama's raw completion endpoint."""

        all_tools = kwargs.pop("tools", None) or []

        # Key fix: do not overwhelm Mistral with unrelated tools.
        relevant_tools = self._filter_relevant_tools(
            messages=messages,
            tools=all_tools,
        )

        prompt = self._serialize_messages(
            messages=messages,
            tools=relevant_tools,
        )

        options: dict[str, Any] = {
            "temperature": self.temperature,
            "num_ctx": self.num_ctx,
            "num_predict": self.num_predict,
        }

        if stop:
            options["stop"] = stop

        payload = {
            "model": self.model,
            "prompt": prompt,
            "raw": True,
            "stream": False,
            "keep_alive": self.keep_alive,
            "options": options,
        }

        url = self.base_url.rstrip("/") + "/api/generate"

        request = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(
                request,
                timeout=self.request_timeout,
            ) as response:
                result = json.loads(
                    response.read().decode("utf-8")
                )

        except HTTPError as exc:
            error_body = exc.read().decode(
                "utf-8",
                errors="replace",
            )

            raise RuntimeError(
                f"Ollama HTTP error {exc.code}: {error_body}"
            ) from exc

        except URLError as exc:
            raise ConnectionError(
                f"Could not connect to Ollama at {url}: {exc.reason}"
            ) from exc

        except TimeoutError as exc:
            raise TimeoutError(
                f"Ollama request timed out after "
                f"{self.request_timeout} seconds."
            ) from exc

        output = result.get("response")

        if not isinstance(output, str):
            raise RuntimeError(
                f"Ollama returned an invalid response: {result!r}"
            )

        ai_message = self._parse_response(
            output=output,
            tools=relevant_tools,
        )

        return ChatResult(
            generations=[
                ChatGeneration(message=ai_message)
            ],
            llm_output={
                "model": self.model,
                "raw_mode": True,
                "candidate_tool_count": len(relevant_tools),
            },
        )


class LangChainAgent:
    """A local Ollama-backed agent with tools and persistent thread memory."""

    SYSTEM_PROMPT = """
You are a helpful AI agent with access to registered tools.

Tool-use rules:
- For arithmetic, use the calculator tool.
- For file requests, use file_operations only for the dedicated agent workspace.
- For database requests, use database_query only for read-only queries.
- For current information, use web_search honestly. It is a placeholder unless a search provider has been configured.
- Use conversation tools only when they are relevant to the user's request.
- When a relevant tool is available, emit a structured tool call instead of
  pretending to execute the operation yourself.
- Never claim that a tool was used unless its execution result is present
  in the conversation.
- Never execute arbitrary code or invent tool results.
- Keep responses clear and concise.
"""

    def __init__(
        self,
        model_name: str = "mistral:latest",
        base_url: str = "http://127.0.0.1:11434",
        storage_dir: Optional[Path | str] = None,
        database_filename: str = "langchain_agent.sqlite3",
        llm: Any = None,
    ) -> None:
        self.storage_dir = Path(
            storage_dir or DEFAULT_STORAGE
        ).resolve()

        self.storage_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.database_path = (
            self.storage_dir / database_filename
        )

        self.connection = sqlite3.connect(
            str(self.database_path),
            check_same_thread=False,
        )

        self.checkpointer = SqliteSaver(self.connection)
        self.checkpointer.setup()

        self.llm = llm or MistralRawChatModel(
            model=model_name,
            base_url=base_url,
            temperature=0.2,
            num_ctx=2048,
            num_predict=192,
            keep_alive="30s",
        )

        self.available_tools = build_general_tools(
            self.storage_dir
        )

        self.tools = list(
            self.available_tools.values()
        )

        self._build_agent()

    def _build_agent(self) -> None:
        """Compile the LangChain agent with its current tool set."""

        self.agent = create_agent(
            model=self.llm,
            tools=self.tools,
            system_prompt=self.SYSTEM_PROMPT,
            checkpointer=self.checkpointer,
            name="day24_langchain_agent",
        )

    @staticmethod
    def _thread_config(
        thread_id: str,
    ) -> dict[str, dict[str, str]]:
        if not isinstance(thread_id, str) or not thread_id.strip():
            raise ValueError(
                "thread_id must be a non-empty string."
            )

        if len(thread_id) > 128:
            raise ValueError(
                "thread_id must not exceed 128 characters."
            )

        return {
            "configurable": {
                "thread_id": thread_id.strip()
            }
        }

    @staticmethod
    def _content_to_text(content: Any) -> str:
        if isinstance(content, str):
            return content

        if isinstance(content, list):
            parts = []

            for item in content:
                if isinstance(item, dict) and "text" in item:
                    parts.append(str(item["text"]))
                else:
                    parts.append(str(item))

            return "\n".join(parts)

        return str(content)

    def chat(
        self,
        message: str,
        thread_id: str = "default",
    ) -> str:
        """Send a message and continue the selected conversation thread."""

        if not isinstance(message, str) or not message.strip():
            raise ValueError(
                "Message must be a non-empty string."
            )

        if len(message) > 10_000:
            raise ValueError(
                "Message exceeds the 10,000-character limit."
            )

        config = self._thread_config(thread_id)

        result = self.agent.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": message.strip(),
                    }
                ]
            },
            config=config,
        )

        messages = result.get("messages", [])

        if not messages:
            raise RuntimeError(
                "Agent returned no messages."
            )

        return self._content_to_text(
            messages[-1].content
        )

    def get_memory(
        self,
        thread_id: str = "default",
    ) -> dict[str, Any]:
        """Return the stored messages and memory metadata."""

        snapshot = self.agent.get_state(
            self._thread_config(thread_id)
        )

        values = snapshot.values if snapshot else {}
        messages = values.get("messages", [])

        history = [
            {
                "type": message.__class__.__name__,
                "content": self._content_to_text(
                    message.content
                ),
                "name": getattr(message, "name", None),
            }
            for message in messages
        ]

        return {
            "thread_id": thread_id,
            "chat_history": history,
            "memory_variables": {
                "message_count": len(history),
                "persistent": True,
            },
        }

    def clear_memory(
        self,
        thread_id: str = "default",
    ) -> None:
        """Delete all checkpoints associated with the selected thread."""

        self._thread_config(thread_id)
        self.checkpointer.delete_thread(thread_id)

    def list_tools(self) -> list[str]:
        """List the currently enabled tools."""

        return sorted(
            item.name for item in self.tools
        )

    def add_tool_by_name(self, name: str) -> bool:
        """Enable a pre-registered safe tool without executing user code."""

        if name not in self.available_tools:
            raise ValueError(
                f"Unknown registered tool: {name}"
            )

        if any(item.name == name for item in self.tools):
            return False

        self.tools.append(
            self.available_tools[name]
        )

        self._build_agent()
        return True

    def remove_tool_by_name(self, name: str) -> bool:
        """Remove an enabled tool by its registered name."""

        updated = [
            item for item in self.tools
            if item.name != name
        ]

        if len(updated) == len(self.tools):
            return False

        self.tools = updated
        self._build_agent()
        return True

    def close(self) -> None:
        """Close the SQLite connection."""

        self.connection.close()
