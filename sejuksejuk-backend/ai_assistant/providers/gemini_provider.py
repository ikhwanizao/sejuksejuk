import json
from django.conf import settings
from .base import BaseAIProvider

SYSTEM_PROMPT = (
    "You are an operations assistant for Sejuk Sejuk Service, an air-conditioner service company. "
    "Answer questions about jobs, technicians, and service records using only the provided tools. "
    "Never guess or fabricate data — always call a tool to retrieve facts. "
    "Be concise and professional."
)


class GeminiProvider(BaseAIProvider):
    MODEL = "gemini-2.0-flash"

    def __init__(self):
        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise ImportError("Install google-generativeai: pip install google-generativeai") from exc
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._genai = genai

    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> dict:
        # Convert OpenAI-style messages to Gemini format
        history = []
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            history.append({"role": role, "parts": [m["content"] or ""]})

        model_kwargs = {"model_name": self.MODEL, "system_instruction": SYSTEM_PROMPT}
        model = self._genai.GenerativeModel(**model_kwargs)
        chat = model.start_chat(history=history[:-1])
        last = history[-1]["parts"][0] if history else ""
        response = chat.send_message(last)
        return {
            "content": response.text,
            "tool_calls": [],
            "finish_reason": "stop",
        }
