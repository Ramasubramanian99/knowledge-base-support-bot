import { IconButton, InputAdornment, TextField, Toolbar } from "@mui/material";
import { AttachFile, Send } from "@mui/icons-material";

export default function QueryBox() {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 mb-[5%] w-4/5">
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
          slotProps={{
            input: {
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton
                    aria-label="Attach file"
                    edge="start"
                    sx={{ color: "grey.400", "&:hover": { color: "common.white" } }}
                  >
                    <AttachFile />
                  </IconButton>
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
          }}
        >
          <Send fontSize="small" />
        </IconButton>
      </Toolbar>
    </div>
  )
}
