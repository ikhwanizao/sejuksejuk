from django.conf import settings
from .base import BaseAIProvider


def get_provider() -> BaseAIProvider:
    provider_name = getattr(settings, "AI_PROVIDER", "mock").lower()
    if provider_name == "openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider()
    if provider_name == "gemini":
        from .gemini_provider import GeminiProvider
        return GeminiProvider()
    if provider_name == "claude":
        from .claude_provider import ClaudeProvider
        return ClaudeProvider()
    from .mock_provider import MockAIProvider
    return MockAIProvider()
