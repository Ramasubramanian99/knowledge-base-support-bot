import Header from "~/components/header";
import type { Route } from "./+types/home";
import { Box, Button, Divider, Paper, Typography } from "@mui/material";
import { GitHub, LinkedIn } from "@mui/icons-material";
import {
  GITHUB_URL,
  LINKEDIN_URL,
  PrivacyWarning,
  ProjectDescription,
  UsageSteps,
} from "~/components/projectInfo";

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
        <ProjectDescription />

        <Divider sx={{ my: 3, borderColor: "grey.700" }} />

        <Typography variant="h5" gutterBottom>How to use it</Typography>
        <UsageSteps />

        <PrivacyWarning />

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
