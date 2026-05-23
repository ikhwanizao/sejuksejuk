"""
AI runner: multi-turn conversation loop with tool-call support.

Safety limits:
  - MAX_TOOL_ITERATIONS: prevents infinite tool-call loops.
  - Only tools in the TOOL_REGISTRY allowlist may be invoked.
"""
import json
from .providers import get_provider
from .tools import TOOLS, execute_tool

MAX_TOOL_ITERATIONS = 5

SYSTEM_PROMPT = (
    "You are an operations assistant for Sejuk Sejuk Service, "
    "an air-conditioner service company. "
    "Answer questions about jobs, technicians, and service records "
    "using ONLY the provided tools to retrieve data. "
    "Never fabricate figures. "
    "When you have the data, give a clear, concise answer."
)


def run_query(question: str, history: list[dict] | None = None) -> dict:
    """
    Run a single user question through the AI with tool-call loop.

    Args:
        question: The user's natural-language query.
        history:  Previous messages for multi-turn context (list of {role, content}).

    Returns:
        {
            answer (str): Final text response.
            tool_calls (list): Records of each tool invoked and its result.
            messages (list): Full updated message list (for storing in Conversation).
        }
    """
    provider = get_provider()
    messages = list(history or [])
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + [
        m for m in messages if m.get("role") != "system"
    ]
    messages.append({"role": "user", "content": question})

    all_tool_calls = []
    iterations = 0

    while iterations < MAX_TOOL_ITERATIONS:
        response = provider.chat(messages, tools=TOOLS)
        finish = response.get("finish_reason", "stop")

        if finish == "tool_calls" and response.get("tool_calls"):
            # Append assistant message with tool_calls
            messages.append({
                "role": "assistant",
                "content": response.get("content"),
                "tool_calls": response["tool_calls"],
            })
            # Execute each tool and append results
            for tc in response["tool_calls"]:
                result_json = execute_tool(tc["name"], tc.get("arguments", "{}"))
                all_tool_calls.append({
                    "tool": tc["name"],
                    "arguments": tc.get("arguments"),
                    "result": result_json,
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id", ""),
                    "name": tc["name"],
                    "content": result_json,
                })
            iterations += 1
        else:
            # Final answer reached
            answer = response.get("content") or "I was unable to find an answer to that query."
            messages.append({"role": "assistant", "content": answer})
            return {
                "answer": answer,
                "tool_calls": all_tool_calls,
                "messages": messages,
            }

    # Iteration cap hit — ask model to summarise
    messages.append({
        "role": "user",
        "content": "Please summarise what you found so far in a short answer.",
    })
    final = provider.chat(messages)
    answer = final.get("content") or "Maximum tool iterations reached."
    messages.append({"role": "assistant", "content": answer})
    return {"answer": answer, "tool_calls": all_tool_calls, "messages": messages}
