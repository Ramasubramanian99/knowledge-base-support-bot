import { useCallback, useState } from "react";
import { api } from "~/lib/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  // Assistant replies start pending and fill in when /query answers.
  pending?: boolean;
  error?: boolean;
};

/** Chat history for this page. Lives in memory; a reload starts fresh. */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const updateMessage = (id: string, patch: Partial<ChatMessage>) =>
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );

  const send = useCallback(async (text: string) => {
    const query = text.trim();
    if (!query) return;

    const replyId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: query },
      { id: replyId, role: "assistant", text: "", pending: true },
    ]);
    setSending(true);

    try {
      const response = await api("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { answer } = await response.json();
      updateMessage(replyId, {
        pending: false,
        text: answer || "I couldn't find an answer to that in your documents.",
      });
    } catch (err) {
      updateMessage(replyId, {
        pending: false,
        error: true,
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSending(false);
    }
  }, []);

  return { messages, sending, send };
}
