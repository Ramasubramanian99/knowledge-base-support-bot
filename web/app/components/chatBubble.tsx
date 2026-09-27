import { Box, CircularProgress, Paper } from "@mui/material";
import type { ChatMessage } from "~/lib/chat";

export default function ChatBubble({ message }: { message: ChatMessage }) {
  const fromUser = message.role === "user";

  return (
    <Box sx={{ display: "flex", justifyContent: fromUser ? "flex-end" : "flex-start" }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: "75%",
          px: 2,
          py: 1.5,
          borderRadius: 3,
          // Flatten the corner nearest the speaker's side.
          ...(fromUser ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }),
          bgcolor: fromUser ? "primary.main" : "grey.900",
          color: message.error ? "error.light" : fromUser ? "common.white" : "grey.300",
          // Keep the user's line breaks from the multiline input.
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {message.pending ? (
          <CircularProgress size={16} color="inherit" aria-label="Waiting for answer" />
        ) : (
          message.text
        )}
      </Paper>
    </Box>
  );
}
