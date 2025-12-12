import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { chatApi } from "../api/chat";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  meta?: { used_llm?: boolean; model?: string | null };
};

function classFor(role: ChatMessage["role"]) {
  if (role === "user") {
    return "ml-auto bg-black text-white";
  }
  return "mr-auto border border-black/10 bg-white text-gray-900";
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setError(null);
    setInput("");
    setIsSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const resp = await chatApi.send({ message: text });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: resp.response,
          meta: { used_llm: resp.used_llm, model: resp.model },
        },
      ]);
    } catch (err: any) {
      setError(err?.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Chat</h1>
        <p className="mt-1 text-sm text-black/60">
          Ask DataBug AI about incidents, bugs, correlations, and predictions. The
          assistant is grounded in your latest platform data.
        </p>
      </div>

      <div className="surface-solid p-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-black/60">
              Try: "Explain the likely root cause of the latest incident."
            </div>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${classFor(m.role)}`}
            >
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              {m.role === "assistant" && m.meta?.used_llm === false && (
                <div className="mt-1 text-xs opacity-70">
                  Fallback response (LLM unavailable)
                </div>
              )}
              {m.role === "assistant" && m.meta?.used_llm && m.meta?.model && (
                <div className="mt-1 text-xs opacity-70">Model: {m.meta.model}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <form onSubmit={onSubmit} className="surface-solid p-4">
        <div className="flex flex-col gap-3">
          <textarea
            className="min-h-[84px] w-full resize-y rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-black/50">
              Endpoint: <span className="font-mono">/api/chat</span>{" "}
              <span className="badge ml-2">Auto-context</span>
            </div>
            <button type="submit" disabled={!canSend} className="btn-primary">
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

