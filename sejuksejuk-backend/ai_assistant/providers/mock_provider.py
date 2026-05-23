import json
from .base import BaseAIProvider

_MOCK_RESPONSES = {
    "default": (
        "I found the following information based on your query. "
        "Please note this is a mock response — configure AI_PROVIDER in .env to use a real model."
    )
}


class MockAIProvider(BaseAIProvider):
    """
    Deterministic mock provider for testing and development.
    Calls no external APIs; returns canned responses.
    """

    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> dict:
        last_user = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )

        # Simulate a tool call for queries that look like data requests
        if tools and any(
            kw in last_user.lower()
            for kw in ("how many", "list", "which", "completed", "jobs", "technician")
        ):
            # Trigger the first available tool with mock args
            tool = tools[0]
            return {
                "content": None,
                "tool_calls": [
                    {
                        "id": "mock_call_1",
                        "name": tool["function"]["name"],
                        "arguments": json.dumps({"period": "week"}),
                    }
                ],
                "finish_reason": "tool_calls",
            }

        return {
            "content": _MOCK_RESPONSES["default"],
            "tool_calls": [],
            "finish_reason": "stop",
        }
