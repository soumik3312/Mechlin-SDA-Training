"""Multi-turn conversation agent with persistent short- and long-term memory."""

from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timezone
from typing import Any, Optional

from langchain_core.tools import tool

from .langchain_agent import LangChainAgent


class ConversationAgent(LangChainAgent):
    """Conversation-aware agent with SQLite history and persistent context."""

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        max_memory_length: int = 10,
        **kwargs: Any,
    ) -> None:
        # The key parameter is retained for compatibility with the assignment.
        # This implementation uses local Ollama and never transmits the key.
        del openai_api_key

        if max_memory_length < 1:
            raise ValueError("max_memory_length must be at least 1.")

        super().__init__(
            database_filename="conversation_agent.sqlite3",
            **kwargs,
        )

        self.max_memory_length = max_memory_length

        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS conversation_turns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id TEXT NOT NULL,
                user_message TEXT NOT NULL,
                agent_response TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_conversation_turns_thread
            ON conversation_turns(thread_id, id);

            CREATE TABLE IF NOT EXISTS conversation_context (
                thread_id TEXT NOT NULL,
                context_key TEXT NOT NULL,
                context_value TEXT NOT NULL,
                PRIMARY KEY(thread_id, context_key)
            );

            CREATE TABLE IF NOT EXISTS agent_reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id TEXT NOT NULL,
                reminder TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        self.connection.commit()

        self.conversation_tools = self._initialize_tools()

        for item in self.conversation_tools:
            self.available_tools[item.name] = item

        self.tools = list(self.available_tools.values())
        self._build_agent()

    def _initialize_tools(self):
        """Create conversation-specific tools."""

        @tool
        def context_manager(command: str) -> str:
            """Read or update saved conversation context.

            Commands: summary, get:key, or set:key=value.
            """
            command = command.strip()

            if command.lower() == "summary":
                return self.get_conversation_summary()

            if command.lower().startswith("get:"):
                key = command[4:].strip()
                value = self.get_context(key)
                return json.dumps(value, ensure_ascii=False)

            if command.lower().startswith("set:") and "=" in command:
                key_value = command[4:]
                key, value = key_value.split("=", 1)
                self.set_context(key.strip(), value.strip())
                return f"Context value saved: {key.strip()}"

            return "Use summary, get:key, or set:key=value."

        @tool
        def emotion_analyzer(text: str) -> str:
            """Estimate the emotional tone using simple keyword matching."""

            lowered = text.lower()

            categories = {
                "positive": {
                    "happy", "great", "good", "excited", "excellent",
                    "love", "wonderful", "thankful",
                },
                "negative": {
                    "sad", "angry", "upset", "bad", "hate", "worried",
                    "frustrated", "disappointed",
                },
            }

            scores = {
                name: sum(
                    len(re.findall(rf"\b{re.escape(word)}\b", lowered))
                    for word in words
                )
                for name, words in categories.items()
            }

            if scores["positive"] > scores["negative"]:
                emotion = "positive"
            elif scores["negative"] > scores["positive"]:
                emotion = "negative"
            else:
                emotion = "neutral"

            return json.dumps(
                {"emotion": emotion, "scores": scores},
                ensure_ascii=False,
            )

        @tool
        def topic_tracker(text: str) -> str:
            """Identify broad topics mentioned in a conversation."""

            categories = {
                "technology": (
                    "python", "programming", "software", "ai", "computer",
                    "developer", "code",
                ),
                "work": (
                    "job", "office", "project", "career", "work", "meeting",
                ),
                "personal": (
                    "family", "friend", "personal", "relationship",
                ),
                "travel": (
                    "travel", "trip", "flight", "hotel", "holiday",
                ),
                "education": (
                    "study", "college", "exam", "course", "learning",
                ),
            }

            lowered = text.lower()

            found = [
                topic
                for topic, words in categories.items()
                if any(re.search(rf"\b{re.escape(word)}\b", lowered) for word in words)
            ]

            if found:
                old_topics = self.get_context("topics", [])
                combined = sorted(set(old_topics) | set(found))
                self.set_context("topics", combined)

            return json.dumps(
                {"topics": found},
                ensure_ascii=False,
            )

        @tool
        def reminder_setter(reminder: str) -> str:
            """Save a reminder or follow-up item in persistent local storage."""

            if not reminder.strip():
                return "Reminder cannot be empty."

            self.connection.execute(
                """
                INSERT INTO agent_reminders(thread_id, reminder, created_at)
                VALUES (?, ?, ?)
                """,
                (
                    "default",
                    reminder.strip()[:1000],
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            self.connection.commit()

            return "Reminder saved successfully."

        return [
            context_manager,
            emotion_analyzer,
            topic_tracker,
            reminder_setter,
        ]

    def _update_context(
        self,
        thread_id: str,
        user_message: str,
        agent_response: str,
    ) -> None:
        """Persist conversation metadata and a lightweight topic summary."""

        current_count = self.get_context("message_count", 0, thread_id)
        topics = set(self.get_context("topics", [], thread_id))

        topic_words = {
            "technology": ("python", "software", "programming", "ai", "code"),
            "work": ("job", "office", "project", "career"),
            "personal": ("family", "friend", "relationship"),
            "travel": ("travel", "flight", "hotel", "trip"),
            "education": ("college", "study", "exam", "course"),
        }

        lowered = user_message.lower()

        for category, words in topic_words.items():
            if any(
                re.search(rf"\b{re.escape(word)}\b", lowered)
                for word in words
            ):
                topics.add(category)

        self.set_context(
            "message_count",
            current_count + 1,
            thread_id,
        )
        self.set_context("topics", sorted(topics), thread_id)
        self.set_context("last_input", user_message, thread_id)
        self.set_context("last_response", agent_response, thread_id)

        self.connection.execute(
            """
            INSERT INTO conversation_turns(
                thread_id, user_message, agent_response, created_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                thread_id,
                user_message,
                agent_response,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        self.connection.commit()

    def chat(self, message: str, thread_id: str = "default") -> str:
        """Chat while retaining the selected conversation's context."""

        if not isinstance(message, str) or not message.strip():
            raise ValueError("Message must be a non-empty string.")

        if len(message) > 10_000:
            raise ValueError("Message exceeds the 10,000-character limit.")

        self._thread_config(thread_id)

        summary = self.get_conversation_summary(thread_id)

        if summary != "No conversation history available.":
            augmented_message = (
                "Relevant saved conversation context:\n"
                f"{summary}\n\n"
                f"New user message:\n{message.strip()}"
            )
        else:
            augmented_message = message.strip()

        response = super().chat(augmented_message, thread_id)
        self._update_context(thread_id, message.strip(), response)

        return response

    def get_conversation_history(
        self,
        thread_id: str = "default",
    ) -> list[dict[str, Any]]:
        """Return the most recent configured number of conversation turns."""

        rows = self.connection.execute(
            """
            SELECT user_message, agent_response, created_at
            FROM conversation_turns
            WHERE thread_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (thread_id, self.max_memory_length),
        ).fetchall()

        return [
            {
                "user": row[0],
                "agent": row[1],
                "timestamp": row[2],
                "agentType": "conversation",
            }
            for row in reversed(rows)
        ]

    def get_conversation_summary(
        self,
        thread_id: str = "default",
    ) -> str:
        """Build a concise summary from persisted conversation metadata."""

        count = self.get_context("message_count", 0, thread_id)
        topics = self.get_context("topics", [], thread_id)
        last_input = self.get_context("last_input", "", thread_id)

        if not count:
            return "No conversation history available."

        return (
            f"Conversation turns: {count}. "
            f"Topics: {', '.join(topics) if topics else 'not classified'}. "
            f"Latest user message: {last_input}"
        )

    def get_context(
        self,
        key: str,
        default: Any = None,
        thread_id: str = "default",
    ) -> Any:
        """Retrieve a persistent context value."""

        row = self.connection.execute(
            """
            SELECT context_value
            FROM conversation_context
            WHERE thread_id = ? AND context_key = ?
            """,
            (thread_id, key),
        ).fetchone()

        if row is None:
            return default

        try:
            return json.loads(row[0])
        except json.JSONDecodeError:
            return row[0]

    def set_context(
        self,
        key: str,
        value: Any,
        thread_id: str = "default",
    ) -> None:
        """Persist a context value for the selected conversation."""

        if not key or len(key) > 100:
            raise ValueError("Context key must contain 1–100 characters.")

        encoded = json.dumps(value, ensure_ascii=False)

        self.connection.execute(
            """
            INSERT INTO conversation_context(
                thread_id, context_key, context_value
            )
            VALUES (?, ?, ?)
            ON CONFLICT(thread_id, context_key)
            DO UPDATE SET context_value = excluded.context_value
            """,
            (thread_id, key, encoded),
        )
        self.connection.commit()

    def get_memory(self, thread_id: str = "default") -> dict[str, Any]:
        """Return short-term history and persistent long-term context."""

        return {
            "thread_id": thread_id,
            "chat_history": self.get_conversation_history(thread_id),
            "conversation_summary": self.get_conversation_summary(thread_id),
            "memory_variables": {
                "max_memory_length": self.max_memory_length,
                "persistent": True,
                "context": {
                    "message_count": self.get_context(
                        "message_count", 0, thread_id
                    ),
                    "topics": self.get_context("topics", [], thread_id),
                },
            },
        }

    def clear_memory(self, thread_id: str = "default") -> None:
        """Clear conversation checkpoints, history, context, and reminders."""

        self._thread_config(thread_id)
        self.checkpointer.delete_thread(thread_id)

        for table in (
            "conversation_turns",
            "conversation_context",
            "agent_reminders",
        ):
            self.connection.execute(
                f"DELETE FROM {table} WHERE thread_id = ?",
                (thread_id,),
            )

        self.connection.commit()