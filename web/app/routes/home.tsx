import Header from "~/components/header";
import type { Route } from "./+types/home";
import QueryBox from "~/components/queryBox";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "RAG base customer service bot" },
    { name: "description", content: "A customer service bot that uses RAG to gather context for queries" },
  ];
}

export default function Home() {
  return (
    <>
      <Header />
      <QueryBox />
    </>
  );
}
