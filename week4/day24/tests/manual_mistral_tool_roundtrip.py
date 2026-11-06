
"""Manual Mistral raw-mode tool-calling round-trip verification."""

import importlib.util
import json
import re
import sys
from pathlib import Path

import requests


MODEL = "mistral:latest"
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"


def load_calculator_tool():
    """Load the actual Day 24 calculator using its exact file path."""

    tools_path = (
        Path(__file__).resolve().parents[1]
        / "ai"
        / "agents"
        / "tools.py"
    )

    if not tools_path.is_file():
        raise FileNotFoundError(
            f"Day 24 tools file not found: {tools_path}"
        )

    spec = importlib.util.spec_from_file_location(
        "day24_tools_for_manual_smoke_test",
        tools_path,
    )

    if spec is None or spec.loader is None:
        raise ImportError("Could not load the Day 24 tools module.")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)

    return module.calculator


def generate(prompt, num_predict=128):
    """Send one raw-mode completion request to the local Ollama API."""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": prompt,
            "raw": True,
            "stream": False,
            "keep_alive": "30s",
            "options": {
                "temperature": 0,
                "num_ctx": 2048,
                "num_predict": num_predict,
            },
        },
        timeout=(15, 240),
    )

    response.raise_for_status()
    return response.json().get("response", "")


def parse_tool_calls(output):
    """Parse a Mistral tool-call JSON array."""

    raw = output.strip()

    if raw.startswith("[TOOL_CALLS]"):
        raw = raw[len("[TOOL_CALLS]"):].strip()

    try:
        calls, _ = json.JSONDecoder().raw_decode(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Could not parse Mistral tool-call JSON: {raw!r}"
        ) from exc

    if not isinstance(calls, list) or not calls:
        raise RuntimeError(
            "Mistral did not return a non-empty tool-call list."
        )

    return calls


def extract_calculator_result(result_text):
    """Extract the numeric result from the calculator's formatted output."""

    match = re.search(
        r"Calculation result:\s*(-?\d+(?:\.\d+)?)\s*$",
        result_text.strip(),
    )

    if not match:
        raise RuntimeError(
            f"Unexpected calculator output format: {result_text!r}"
        )

    return match.group(1)


def main():
    calculator = load_calculator_tool()
    print("[PASS] Loaded the actual Day 24 calculator tool.")

    tool_schema = {
        "type": "function",
        "function": {
            "name": "calculator",
            "description": "Calculate a mathematical expression.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Arithmetic expression to calculate.",
                    }
                },
                "required": ["expression"],
            },
        },
    }

    tool_definitions = json.dumps([tool_schema])

    question = (
        "You must use the calculator tool. "
        "Do not calculate the answer yourself. "
        "Calculate 27 multiplied by 19 using the calculator."
    )

    # Step 1: Ask Mistral to select the calculator tool.
    first_prompt = (
        "[AVAILABLE_TOOLS] "
        + tool_definitions
        + "[/AVAILABLE_TOOLS]"
        + "[INST] "
        + question
        + " [/INST]"
    )

    first_output = generate(first_prompt)

    print("\n========== MODEL TOOL-CALL RESPONSE ==========")
    print(first_output)

    calls = parse_tool_calls(first_output)

    calculator_calls = [
        call
        for call in calls
        if call.get("name") == "calculator"
    ]

    if not calculator_calls:
        raise RuntimeError(
            "Mistral did not select the calculator tool."
        )

    selected_call = calculator_calls[0]
    arguments = selected_call.get("arguments", {})

    if isinstance(arguments, str):
        arguments = json.loads(arguments)

    expression = arguments.get("expression")

    if not isinstance(expression, str) or not expression.strip():
        raise RuntimeError(
            f"Invalid calculator arguments: {arguments!r}"
        )

    if re.sub(r"\s+", "", expression) != "27*19":
        raise RuntimeError(
            f"Unexpected expression selected by Mistral: {expression!r}"
        )

    print("\n[PASS] Structured calculator call parsed.")
    print("Tool:", selected_call["name"])
    print("Arguments:", arguments)

    # Step 2: Execute the actual registered LangChain calculator.
    actual_result = calculator.invoke(
        {"expression": expression}
    )

    result_text = str(actual_result).strip()
    numeric_result = extract_calculator_result(result_text)

    print("\n========== ACTUAL TOOL EXECUTION ==========")
    print("Calculator output:", result_text)
    print("Numeric result:", numeric_result)

    if numeric_result != "513":
        raise RuntimeError(
            f"Calculator returned {numeric_result!r}; expected '513'."
        )

    print("[PASS] Actual calculator execution returned 513.")

    # Step 3: Return the actual tool output to Mistral.
    executed_call = {
        "name": selected_call["name"],
        "arguments": arguments,
    }

    second_prompt = (
        "[AVAILABLE_TOOLS] "
        + tool_definitions
        + "[/AVAILABLE_TOOLS]"
        + "[INST] "
        + question
        + " [/INST]"
        + "[TOOL_CALLS] "
        + json.dumps([executed_call])
        + "</s>"
        + "[TOOL_RESULTS] "
        + json.dumps({"content": result_text})
        + "[/TOOL_RESULTS]"
    )

    # Step 4: Ask Mistral to produce the final response.
    final_output = generate(second_prompt)

    print("\n========== MODEL FINAL RESPONSE ==========")
    print(final_output)

    if not re.search(r"\b513\b", final_output):
        raise RuntimeError(
            "Final response did not include the actual result 513."
        )

    if re.search(r"\b519\b", final_output):
        raise RuntimeError(
            "Final response contains the incorrect result 519."
        )

    print("\n========== ROUND-TRIP VERIFICATION ==========")
    print("[PASS] Mistral selected the calculator.")
    print("[PASS] The registered calculator tool executed.")
    print("[PASS] The actual calculator result was 513.")
    print("[PASS] The tool result was returned to Mistral.")
    print("[PASS] The final response used the correct result.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("\n[FAIL]", repr(exc))
        raise SystemExit(1)
    finally:
        try:
            requests.post(
                OLLAMA_URL,
                json={
                    "model": MODEL,
                    "prompt": "Done.",
                    "raw": True,
                    "stream": False,
                    "keep_alive": "0",
                    "options": {
                        "num_ctx": 2048,
                        "num_predict": 1,
                    },
                },
                timeout=(10, 180),
            )
            print("\nMistral unload requested.")
        except requests.RequestException as exc:
            print("\nUnload warning:", repr(exc))
