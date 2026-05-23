import json
from django.conf import settings
from .base import BaseAIProvider

SYSTEM_PROMPT = (
    "You are an operations assistant for Sejuk Sejuk Service, an air-conditioner service company. "
    "Answer questions about jobs, technicians, and service records using only the provided tools. "
    "Never guess or fabricate data — always call a tool to retrieve facts. "
    "Be concise and professional."
)


class ClaudeProvider(BaseAIProvider):
    MODEL = "claude-3-5-haiku-20241022"

    def __init__(self):
        try:
            import anthropic
        except ImportError as exc:
            raise ImportError("Install anthropic: pip install anthropic") from exc
        self._client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> dict:
        # Convert OpenAI-style tool schema to Anthropic format
        anthropic_tools = []
        if tools:
            for t in tools:
                fn = t["function"]
                anthropic_tools.append({
                    "name": fn["name"],
                    "description": fn.get("description", ""),
                    "input_schema": fn.get("parameters", {"type": "object", "properties": {}}),
                })

        kwargs = {
            "model": self.MODEL,
            "max_tokens": 1024,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": m["role"], "content": m["content"] or ""} for m in messages],
        }
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        response = self._client.messages.create(**kwargs)
        tool_calls = []
        text_content = None

        for block in response.content:
            if block.type == "text":
                text_content = block.text
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "name": block.name,
                    "arguments": json.dumps(block.input),
                })

        finish = "tool_calls" if tool_calls else "stop"
        return {"content": text_content, "tool_calls": tool_calls, "finish_reason": finish}
