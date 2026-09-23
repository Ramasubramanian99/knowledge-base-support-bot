import Header from "~/components/header";
import type { Route } from "./+types/home";
import { Divider, Paper, Typography } from "@mui/material";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Help | RAG base customer service bot" },
    { name: "description", content: "A customer service bot that uses RAG to gather context for queries" },
  ];
}

export default function Help() {
  return (
    <>
      <Header />
      <Paper>
        <Typography variant="h6">This is a test</Typography>
        <Divider />
        <Typography variant="body1">This is a test to check and see if I am ok</Typography>
      </Paper>
    </>
  );
}
