"""
AI runner: LangGraph ReAct agent with tool-calling support.

Handles persistent memory states automatically using standard LangGraph threads.
"""
import logging
from langchain_core.messages import HumanMessage
from langgraph.errors import GraphRecursionError
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

logger = logging.getLogger(__name__)

from .providers import get_provider
from .tools import TOOLS

MAX_TOOL_ITERATIONS = 5

SYSTEM_PROMPT = (
    "You are Sejuk, a friendly AI assistant for Sejuk Sejuk Service, "
    "an air-conditioner service company. "
    "You can chat naturally about anything, but your specialty is helping managers and admins "
    "with operational questions — jobs, technicians, service records, and performance. "
    "When a question needs live data, use your tools to fetch it accurately. "
    "Never fabricate numbers or statistics. "
    "Keep responses concise and conversational."
)

# 1. Instantiate provider and compile the agent ONCE globally to prevent re-compilation limits
llm = get_provider()
memory = MemorySaver()
agent = create_react_agent(llm, tools=TOOLS, prompt=SYSTEM_PROMPT, checkpointer=memory)

def run_query(question: str, conversation_id: int) -> dict:
    """
    Run a user query through the compiled ReAct agent utilizing persistent state checkpoints.
    
    Args:
        question: The user's natural language string.
        conversation_id: The primary key of the database Conversation model to scope memory.
    """
    # 2. Scope the thread state explicitly using the conversation database ID
    config = {
        "configurable": {"thread_id": str(conversation_id)},
        "recursion_limit": MAX_TOOL_ITERATIONS * 2 + 2,
    }

    try:
        # We only pass the newest question. LangGraph automatically fetches the matching
        # history including structural ToolMessages seamlessly from its memory checkpointer.
        result = agent.invoke(
            {"messages": [HumanMessage(content=question)]},
            config=config
        )
    except GraphRecursionError:
        return {
            "answer": "I reached my tool call limit before finding an answer. Try rephrasing your question.",
            "tool_calls": [],
        }
    except Exception as exc:
        exc_str = str(exc)
        # Catch genuine rate limits vs structure validation crashes
        if any(token in exc_str for token in ["429", "RESOURCE_EXHAUSTED", "quota"]):
            return {
                "answer": "The AI service is currently rate-limited. Please wait a moment and try again.",
                "tool_calls": [],
            }
        logger.exception("AI agent execution breakdown: %s", exc)
        return {
            "answer": "An unexpected error occurred while compiling your data parameters. Please try again.",
            "tool_calls": [],
        }

    messages = result["messages"]

    # 3. Parse tool execution contexts cleanly for your frontend Sources output
    all_tool_calls: list[dict] = []
    from langchain_core.messages import AIMessage, ToolMessage
    
    for msg in messages:
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for tc in msg.tool_calls:
                all_tool_calls.append(
                    {
                        "tool": tc["name"],
                        "arguments": tc.get("args", {}),
                        "result": None,
                        "_call_id": tc["id"],
                    }
                )
        elif isinstance(msg, ToolMessage):
            for tc in all_tool_calls:
                if tc.get("_call_id") == msg.tool_call_id:
                    tc["result"] = msg.content
                    break

    for tc in all_tool_calls:
        tc.pop("_call_id", None)

    # 4. Extract final textual answer cleanly
    final_answer = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and not msg.tool_calls:
            content = msg.content
            if isinstance(content, list):
                # Gemini can return content as a list of part dicts: [{type, text, extras}, ...]
                final_answer = "".join(
                    part.get("text", "") if isinstance(part, dict) else str(part)
                    for part in content
                )
            elif isinstance(content, str):
                final_answer = content
            else:
                final_answer = str(content) if content else ""
            break

    if not final_answer:
        final_answer = "I was unable to assemble a definitive answer to that query."

    return {
        "answer": final_answer,
        "tool_calls": all_tool_calls,
    }