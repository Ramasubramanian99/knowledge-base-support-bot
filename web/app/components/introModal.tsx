import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { GitHub } from "@mui/icons-material";
const COOKIE_NAME = "intro_seen";
const COOKIE_MAX_AGE_SECONDS = 30; // TODO: set to half a minute for debugging. change to half an hr

const GITHUB_URL = "https://github.com/Ramasubramanian99/knowledge-base-support-bot";

function hasSeenIntro() {
  return document.cookie
    .split("; ")
    .some((entry) => entry.startsWith(`${COOKIE_NAME}=`));
}

function markIntroSeen() {
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export default function IntroModal() {
  const [open, setOpen] = useState(false);

  // Runs only on the client, so the server and the first render agree.
  useEffect(() => {
    if (!hasSeenIntro()) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    markIntroSeen();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 2, bgcolor: "grey.900", color: "common.white" },
        },
      }}
    >
      <DialogTitle>Welcome to the customer service bot</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ color: "grey.300", mb: 2 }}>
          This bot answers questions using Retrieval-Augmented Generation (RAG) and Gemini 3.6 Flash model. It searches the
          documents you give it, pulls out the most relevant context from your data and  so
          answers stay grounded in your own knowledge base rather than the model's general training. This project serves as a demostration of
          RAG's most practical usecase which is providing relavent context without the need to re-train the model. For more information of RAG or
          the project check the github link below.
        </Typography>
        <Box component="ol" sx={{ pl: 3, color: "grey.300", "& li": { mb: 1 } }}>
          <li>
            <Typography variant="body1">
              <b>Step 1: </b>Use the sample document or attach your documents with the paperclip icon in the question box.
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500", mt: 2 }}>

              Note : The app is a prototype and runs on free tier of vercel and supabase. So, please make sure the documents you are uploading
              are small (2-3 document, 2-10 Mb and less than 50 pages each) for it to vectorize quickly.
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              <b>Step 2: </b>The backend vectorizes the document and stores in supabase, the sample documents are already vectorized.Now you can type a question about those documents.</Typography>
          </li>
          <li>
            <Typography variant="body1">
              <b>Step 3: </b>The backend retrives relavent context from documents and passes it on to the Gemini-3.6 Flash LLM to answer your query.
            </Typography>
          </li>
        </Box>
        <Typography variant="body2" sx={{ color: "grey.500", mt: 2 }}>
          Note: This note stays hidden for the next 30 minutes. You can visit the help page (top right icon) to review.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
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
          onClick={handleClose}
          variant="contained"
          color="primary"
          sx={{ borderRadius: 999, textTransform: "none" }}
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
