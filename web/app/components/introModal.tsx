import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { GitHub } from "@mui/icons-material";
import { GITHUB_URL, PrivacyWarning, ProjectDescription, UsageSteps } from "./projectInfo";

const COOKIE_NAME = "intro_seen";
const COOKIE_MAX_AGE_SECONDS = 30; // TODO: set to half a minute for debugging. change to half an hr

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
        <ProjectDescription />
        <UsageSteps />
        <PrivacyWarning />
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
