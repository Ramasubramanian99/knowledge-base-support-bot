import { useRef, useState } from "react";
import { Alert, Box, Chip, CircularProgress, IconButton, InputAdornment, TextField, Toolbar, Tooltip } from "@mui/material";
import { AttachFile, ErrorOutlined, Send } from "@mui/icons-material";
import { ACCEPTED_EXTENSIONS, MAX_UPLOADS, useSessionDocs } from "~/lib/sessionDocs";

const chipSx = {
  bgcolor: "grey.900",
  color: "grey.300",
  "&.MuiChip-clickable:hover": { bgcolor: "grey.800" },
  "& .MuiChip-icon": { color: "grey.500" },
  "& .MuiChip-deleteIcon": {
    color: "grey.500",
    "&:hover": { color: "common.white" },
  },
};

// Once the file is in storage the chip looks settled. "pending" (queued for
// ingestion) isn't shown as busy.
function statusIcon(status: string) {
  if (status === "failed") return <ErrorOutlined fontSize="small" />;
  if (status === "awaiting_upload") return <CircularProgress size={14} color="inherit" />;
  return undefined;
}

type QueryBoxProps = {
  onSend: (text: string) => void;
  sending: boolean;
};

export default function QueryBox({ onSend, sending }: QueryBoxProps) {
  const { docs, uploading, error, canUpload, openDoc, removeDoc, uploadDoc } = useSessionDocs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const canSend = query.trim().length > 0 && !sending;

  const submit = () => {
    if (!canSend) return;
    onSend(query);
    setQuery("");
  };

  // Enter sends; Shift+Enter keeps the newline for multi-line questions.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const handleFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadDoc(file);
    // Reset so picking the same file twice still fires a change event.
    event.target.value = "";
  };

  return (
    <div className="mx-auto mb-[5%] w-4/5 shrink-0">
      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
        {docs.map((doc) => (
          <Chip
            key={doc.id}
            label={doc.name}
            icon={statusIcon(doc.status)}
            title={doc.status === "failed" || doc.status === "awaiting_upload" ? doc.status : `Open ${doc.name}`}
            // Nothing is in storage yet while a file is still awaiting upload.
            onClick={doc.status === "awaiting_upload" ? undefined : () => openDoc(doc.id)}
            onDelete={() => removeDoc(doc.id)}
            sx={chipSx}
          />
        ))}
        {uploading.map((name, index) => (
          <Chip
            key={`uploading-${index}`}
            label={name}
            icon={<CircularProgress size={14} color="inherit" />}
            title="Uploading"
            sx={{ ...chipSx, opacity: 0.6 }}
          />
        ))}
      </Box>
      <Toolbar
        disableGutters
        className="gap-4"
        sx={{ bgcolor: "transparent", backgroundImage: "none", boxShadow: "none" }}
      >
        <TextField
          id="query"
          multiline
          label="Ask a question about the documents"
          variant="filled"
          maxRows={4}
          fullWidth
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{
            input: {
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <Tooltip
                    title={canUpload ? "Attach a PDF or DOCX" : `Upload limit reached (${MAX_UPLOADS} per session). Remove one to add another.`}
                  >
                    {/* Span keeps the tooltip working while the button is disabled. */}
                    <span>
                      <IconButton
                        aria-label="Attach file"
                        edge="start"
                        disabled={!canUpload}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                          color: "grey.400",
                          "&:hover": { color: "common.white" },
                          "&.Mui-disabled": { color: "grey.700" },
                        }}
                      >
                        <AttachFile />
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiFilledInput-root": {
              borderRadius: 2,
              border: "1px solid transparent",
              bgcolor: "grey.900",
              color: "common.white",
              "&:hover, &.Mui-focused": { bgcolor: "grey.900" },
            },
            "& .MuiInputLabel-root, & .MuiInputLabel-root.Mui-focused": {
              color: "grey.400",
            },
          }}
        />
        <IconButton
          aria-label="Send"
          onClick={submit}
          disabled={!canSend}
          sx={{
            bgcolor: "secondary.main",
            color: "common.white",
            borderRadius: "50%",
            // Fixed square so the glyph sits dead centre in the circle.
            width: 40,
            height: 40,
            p: 0,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // Track the last line of text as the field grows to 4 rows.
            alignSelf: "flex-end",
            mb: 1,
            "&:hover": { bgcolor: "secondary.dark" },
            "&.Mui-disabled": { bgcolor: "grey.800", color: "grey.600" },
          }}
        >
          <Send fontSize="small" />
        </IconButton>
      </Toolbar>
      <input
        type="file"
        hidden
        ref={fileInputRef}
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileChosen}
      />
    </div>
  )
}
