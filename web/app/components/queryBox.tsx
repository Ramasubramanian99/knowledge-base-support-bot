import { IconButton, TextField, Toolbar } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { Send } from "@mui/icons-material";

export default function QueryBox() {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 mb-[5%] w-4/5">
      <Toolbar
        disableGutters
        className="gap-4"
        sx={{ bgcolor: "transparent", backgroundImage: "none", boxShadow: "none" }}
      >
        <IconButton
          sx={{
            bgcolor: "primary.main",
            color: "common.white",
            // borderRadius: "50%",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          <AddIcon />
        </IconButton>
        <TextField
          id="query"
          multiline
          label="Ask a question about the documents"
          variant="filled"
          maxRows={4}
          fullWidth
          slotProps={{ input: { disableUnderline: true } }}
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
          sx={{
            bgcolor: "secondary.main",
            color: "common.white",
            borderRadius: "50%",
            "&:hover": { bgcolor: "secondary.dark" },
          }}
        >
          <Send fontSize="small" />
        </IconButton>
      </Toolbar>
    </div>
  )
}
