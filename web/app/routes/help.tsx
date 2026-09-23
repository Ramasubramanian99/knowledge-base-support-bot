import Header from "~/components/header";
import type { Route } from "./+types/home";
import { Box, Button, Divider, Paper, Typography } from "@mui/material";
import { GitHub, LinkedIn } from "@mui/icons-material";

const GITHUB_URL = "https://github.com/Ramasubramanian99/knowledge-base-support-bot";
// TODO: replace with your LinkedIn profile URL
const LINKEDIN_URL = "https://www.linkedin.com/in/your-profile";

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
      <Paper
        elevation={0}
        sx={{
          width: "80%",
          mx: "auto",
          my: 4,
          p: 4,
          borderRadius: 2,
          bgcolor: "grey.900",
          color: "common.white",
        }}
      >
        <Typography variant="h5" gutterBottom>About this project</Typography>
        <Typography variant="body1" sx={{ color: "grey.300", mb: 2 }}>
          This is a customer service bot built on Retrieval-Augmented Generation (RAG). Instead of
          relying only on what a language model already knows, the bot searches the documents you
          provide, pulls out the most relevant passages, and uses them as context to answer your
          question. This keeps answers grounded in your own knowledge base.
        </Typography>
        <Typography variant="body1" sx={{ color: "grey.300", mb: 2 }}>
          The frontend is built with React Router and Material UI, the backend is a FastAPI service,
          and documents and embeddings are stored in Supabase.
        </Typography>

        <Divider sx={{ my: 3, borderColor: "grey.700" }} />

        <Typography variant="h5" gutterBottom>How to use it</Typography>
        <Box component="ol" sx={{ pl: 3, color: "grey.300", "& li": { mb: 1 } }}>
          <li>
            <Typography variant="body1">
              Click the paperclip icon inside the question box to attach the documents you want the
              bot to use as its knowledge base.
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              Type your question about the documents into the question box.
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              Press the send button. The bot will find the relevant parts of your documents and
              answer using them as context.
            </Typography>
          </li>
        </Box>

        <Divider sx={{ my: 3, borderColor: "grey.700" }} />

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<GitHub />}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              bgcolor: "#24292f",
              "&:hover": { bgcolor: "#000" },
            }}
          >
            GitHub
          </Button>
          <Button
            variant="contained"
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<LinkedIn />}
            sx={{
              borderRadius: 999,
              textTransform: "none",
              bgcolor: "#0a66c2",
              "&:hover": { bgcolor: "#004182" },
            }}
          >
            LinkedIn
          </Button>
        </Box>
      </Paper>
    </>
  );
}
