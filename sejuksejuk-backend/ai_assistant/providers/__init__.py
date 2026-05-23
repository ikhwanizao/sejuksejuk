"""AI provider factory.

All provider logic lives here. Set AI_PROVIDER in .env to one of:
  openai | claude | gemini | mock (default)
"""
from typing import Any, List, Optional

from django.conf import settings
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from django.core.exceptions import ImproperlyConfigured

_MOCK_ANSWER = (
    "I found the following information based on your query. "
    "Please note this is a mock response — configure AI_PROVIDER in .env to use a real model."
)


class MockChatModel(BaseChatModel):
    """Deterministic mock model for testing and development. Calls no external APIs."""

    @property
    def _llm_type(self) -> str:
        return "mock"

    def bind_tools(self, tools: Any, **kwargs: Any) -> "MockChatModel":
        # Mock ignores tool schemas — always returns a plain text answer.
        return self

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        return ChatResult(generations=[ChatGeneration(message=AIMessage(content=_MOCK_ANSWER))])


def get_provider() -> BaseChatModel:
    provider_name = getattr(settings, "AI_PROVIDER", "mock").lower()

    if provider_name == "openai":
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as exc:
            raise ImportError("Install langchain-openai: pip install langchain-openai") from exc
        return ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY)

    if provider_name == "claude":
        try:
            from langchain_anthropic import ChatAnthropic
        except ImportError as exc:
            raise ImportError("Install langchain-anthropic: pip install langchain-anthropic") from exc
        return ChatAnthropic(model="claude-3-5-haiku-20241022", api_key=settings.CLAUDE_API_KEY)

    if provider_name == "gemini":
        api_key = getattr(settings, "GEMINI_API_KEY", None)
        if not api_key:
            raise ImproperlyConfigured("GEMINI_API_KEY is missing from your environment variables.")
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)
        except ImportError:
            raise ImproperlyConfigured("Dependencies missing. Run: pip install langchain-google-genai")

    return MockChatModel()
