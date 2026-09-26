import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import ChatBubble from "~/components/chatBubble";
import type { ChatMessage } from "~/lib/chat";

export default function ChatWindow({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the conversation: new messages and filled-in replies scroll into view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", py: 2 }}>
      <Box sx={{ width: "80%", mx: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        <div ref={endRef} />
      </Box>
    </Box>
  );
}
