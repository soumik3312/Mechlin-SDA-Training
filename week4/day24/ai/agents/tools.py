
"""Safe tools for the Day 24 LangChain agents."""

from __future__ import annotations

import ast
import json
import math
import operator
import re
import sqlite3
from pathlib import Path
from typing import Literal, Optional

from langchain_core.callbacks import (
    AsyncCallbackManagerForToolRun,
    CallbackManagerForToolRun,
)
from langchain_core.tools import BaseTool, tool


class CustomTool(BaseTool):
    """A safe custom demonstration tool."""

    name: str = "custom_tool"
    description: str = (
        "Return a processed result for a general-purpose text query."
    )

    def _run(
        self,
        query: str,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        del run_manager
        return f"Custom tool result for: {query.strip()}"

    async def _arun(
        self,
        query: str,
        run_manager: Optional[AsyncCallbackManagerForToolRun] = None,
    ) -> str:
        del run_manager
        return self._run(query)


def _evaluate_expression(expression: str) -> int | float:
    """Evaluate a restricted mathematical expression without eval()."""

    if not expression or len(expression) > 200:
        raise ValueError("Expression must contain 1–200 characters.")

    tree = ast.parse(expression, mode="eval")

    if len(list(ast.walk(tree))) > 40:
        raise ValueError("Expression is too complex.")

    binary_operations = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
    }

    unary_operations = {
        ast.UAdd: operator.pos,
        ast.USub: operator.neg,
    }

    def calculate(node: ast.AST) -> int | float:
        if isinstance(node, ast.Expression):
            return calculate(node.body)

        if isinstance(node, ast.Constant):
            if isinstance(node.value, bool) or not isinstance(
                node.value, (int, float)
            ):
                raise ValueError("Only numeric constants are allowed.")
            return node.value

        if isinstance(node, ast.BinOp):
            operation = binary_operations.get(type(node.op))

            if operation is None:
                raise ValueError("Unsupported mathematical operator.")

            left = calculate(node.left)
            right = calculate(node.right)

            if isinstance(node.op, ast.Pow) and abs(right) > 10:
                raise ValueError("Exponent magnitude must not exceed 10.")

            result = operation(left, right)

            if abs(result) > 1e100:
                raise ValueError("Result exceeds the permitted size.")

            if isinstance(result, float) and not math.isfinite(result):
                raise ValueError("Result must be finite.")

            return result

        if isinstance(node, ast.UnaryOp):
            operation = unary_operations.get(type(node.op))

            if operation is None:
                raise ValueError("Unsupported unary operator.")

            return operation(calculate(node.operand))

        raise ValueError("Expression contains an unsupported operation.")

    return calculate(tree)


@tool
def calculator(expression: str) -> str:
    """Safely calculate arithmetic expressions using numbers and operators."""

    try:
        return f"Calculation result: {_evaluate_expression(expression)}"
    except (ValueError, SyntaxError, ArithmeticError, OverflowError) as exc:
        return f"Calculation error: {exc}"


@tool
def web_search(query: str) -> str:
    """Provide a clearly identified web-search integration placeholder."""

    if not query.strip():
        return "Please provide a search query."

    return (
        "Web search is not configured. "
        "This tool is ready for integration with a trusted search provider. "
        f"Requested query: {query.strip()}"
    )


def create_file_operations_tool(storage_dir: Path):
    """Create a file tool restricted to the Day 24 agent workspace."""

    workspace = (storage_dir / "agent_files").resolve()
    workspace.mkdir(parents=True, exist_ok=True)

    @tool
    def file_operations(
        operation: Literal["list", "read", "write"],
        filename: str = "",
        content: str = "",
    ) -> str:
        """List, read, or write text files inside the dedicated agent workspace."""

        if operation == "list":
            files = sorted(
                item.name
                for item in workspace.iterdir()
                if item.is_file()
            )
            return json.dumps(files)

        if (
            not filename
            or filename in {".", ".."}
            or Path(filename).name != filename
            or "/" in filename
            or "\\" in filename
        ):
            return "File operation error: use a simple filename only."

        target = (workspace / filename).resolve()

        if target.parent != workspace:
            return "File operation error: path is outside the workspace."

        if operation == "read":
            if not target.is_file():
                return f"File not found: {filename}"
            return target.read_text(encoding="utf-8")

        if operation == "write":
            if len(content) > 100_000:
                return "File operation error: content exceeds 100 KB."

            target.write_text(content, encoding="utf-8")
            return f"File written successfully: {filename}"

        return "Unsupported file operation."

    return file_operations


def create_database_query_tool(storage_dir: Path):
    """Create a read-only SQLite query tool restricted to agent_notes."""

    database_path = storage_dir / "agent_data.sqlite3"
    database_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS agent_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                note TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

    @tool
    def database_query(query: str) -> str:
        """Run a read-only SELECT query against the agent_notes table."""

        statement = query.strip().rstrip(";").strip()

        if not re.match(r"^SELECT\b", statement, re.IGNORECASE):
            return "Database error: only SELECT statements are permitted."

        if ";" in statement:
            return "Database error: multiple SQL statements are not permitted."

        if not re.search(
            r"\bFROM\s+agent_notes\b",
            statement,
            re.IGNORECASE,
        ):
            return "Database error: queries must read from agent_notes."

        if re.search(
            r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|ATTACH|DETACH|PRAGMA)\b",
            statement,
            re.IGNORECASE,
        ):
            return "Database error: prohibited SQL operation."

        if not re.search(r"\bLIMIT\b", statement, re.IGNORECASE):
            statement += " LIMIT 50"

        uri = f"{database_path.as_uri()}?mode=ro"

        try:
            with sqlite3.connect(uri, uri=True) as connection:
                rows = connection.execute(statement).fetchall()

            return json.dumps(rows, ensure_ascii=False)

        except sqlite3.Error as exc:
            return f"Database query error: {exc}"

    return database_query


def build_general_tools(storage_dir: Path) -> dict[str, BaseTool]:
    """Build the complete safe general-purpose tool registry."""

    storage_dir.mkdir(parents=True, exist_ok=True)

    tools: list[BaseTool] = [
        calculator,
        web_search,
        create_file_operations_tool(storage_dir),
        create_database_query_tool(storage_dir),
        CustomTool(),
    ]

    return {item.name: item for item in tools}