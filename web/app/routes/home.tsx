import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "RAG base customer service bot" },
    { name: "description", content: "A customer service bot that uses RAG to gather context for queries" },
  ];
}

export default function Home() {
  return( 
    <h1>This is a test</h1>
  );
}
