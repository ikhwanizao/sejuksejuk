import { useState, useRef, useEffect } from "react";
import { Send, Bot, RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { useAiQuery } from "@/api/ai";
import type { AiMessage, AiToolCall } from "@/types/api";
import { cn } from "@/lib/utils";

function SourcesChips({ sources }: { sources: AiToolCall[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
        />
        {sources.length} tool{sources.length > 1 ? "s" : ""} used
      </button>
      {open && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sources.map((s, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-mono">
              {s.tool}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-0.5 shrink-0">
          <Bot className="size-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm",
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {!isUser && message.sources && (
          <SourcesChips sources={message.sources} />
        )}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 shrink-0">
        <Bot className="size-4 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <span className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | undefined>();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const mutation = useAiQuery();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mutation.isPending]);

  function handleReset() {
    setMessages([]);
    setConversationId(undefined);
    mutation.reset();
  }

  function handleSubmit() {
    const question = input.trim();
    if (!question || mutation.isPending) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    mutation.mutate(
      { question, conversation_id: conversationId },
      {
        onSuccess: (data) => {
          setConversationId(data.conversation_id);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.answer,
              sources: data.sources,
            },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, I encountered an error. Please try again.",
            },
          ]);
        },
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about jobs, technicians, and service records."
        action={
          messages.length > 0 ? (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="size-3.5 mr-1.5" />
              New chat
            </Button>
          ) : undefined
        }
      />

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground select-none">
            <Bot className="size-10 opacity-25" />
            <div>
              <p className="font-medium text-sm">Ask me anything</p>
              <p className="text-xs mt-1 max-w-xs">
                e.g. "How many jobs were completed this week?" or "Who are the
                top technicians this month?"
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {mutation.isPending && <ThinkingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="pt-4 border-t mt-4">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            className="resize-none min-h-10 max-h-32"
            rows={1}
            disabled={mutation.isPending}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || mutation.isPending}
            size="icon"
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
