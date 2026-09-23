import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

const COOKIE_NAME = "intro_seen";
const COOKIE_MAX_AGE_SECONDS = 30 * 60; // half an hour

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
          This bot answers questions using Retrieval-Augmented Generation (RAG). It searches the
          documents you give it, pulls out the most relevant passages, and uses them as context, so
          answers stay grounded in your own knowledge base rather than the model's general training.
        </Typography>
        <Box component="ol" sx={{ pl: 3, color: "grey.300", "& li": { mb: 1 } }}>
          <li>
            <Typography variant="body1">
              Attach your documents with the paperclip icon in the question box.
            </Typography>
          </li>
          <li>
            <Typography variant="body1">Type a question about those documents.</Typography>
          </li>
          <li>
            <Typography variant="body1">
              Press send, and the bot answers using the matching passages.
            </Typography>
          </li>
        </Box>
        <Typography variant="body2" sx={{ color: "grey.500", mt: 2 }}>
          This note stays hidden for the next 30 minutes. You can always find it again on the Help
          page.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          variant="contained"
          color="secondary"
          sx={{ borderRadius: 999, textTransform: "none" }}
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
