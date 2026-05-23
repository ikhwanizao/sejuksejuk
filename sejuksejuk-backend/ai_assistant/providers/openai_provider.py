import json
from django.conf import settings
from .base import BaseAIProvider


class OpenAIProvider(BaseAIProvider):
    MODEL = "gpt-4o-mini"

    def __init__(self):
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise ImportError("Install openai: pip install openai") from exc
        self._client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> dict:
        kwargs = {"model": self.MODEL, "messages": messages}
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        response = self._client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        msg = choice.message
        tool_calls = []
        if msg.tool_calls:
            for tc in msg.tool_calls:
                tool_calls.append({
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                })
        return {
            "content": msg.content,
            "tool_calls": tool_calls,
            "finish_reason": choice.finish_reason,
        }
