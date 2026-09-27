import Header from "~/components/header";
import type { Route } from "./+types/home";
import QueryBox from "~/components/queryBox";
import IntroModal from "~/components/introModal";
import ChatWindow from "~/components/chatWindow";
import { useChat } from "~/lib/chat";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "RAG base customer service bot" },
    { name: "description", content: "A customer service bot that uses RAG to gather context for queries" },
  ];
}

export default function Home() {
  const { messages, sending, send } = useChat();

  // Full-height column: messages scroll between the header and the query box.
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <IntroModal />
      <ChatWindow messages={messages} />
      <QueryBox onSend={send} sending={sending} />
    </div>
  );
}
