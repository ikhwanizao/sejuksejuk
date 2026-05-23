from abc import ABC, abstractmethod
from typing import Any


class BaseAIProvider(ABC):
    """
    Abstraction for AI chat providers.
    All providers must implement `chat()`.
    """

    @abstractmethod
    def chat(self, messages: list[dict], tools: list[dict] | None = None) -> dict:
        """
        Send messages to the AI model and return a response dict with keys:
          - content (str | None): assistant text reply
          - tool_calls (list[dict]): list of {id, name, arguments} dicts, may be empty
          - finish_reason (str): e.g. "stop", "tool_calls"
        """
        raise NotImplementedError
