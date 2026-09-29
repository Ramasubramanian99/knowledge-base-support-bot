import { AppBar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import { Info } from "@mui/icons-material";
import { Link } from "react-router"

export default function Header() {
  return (
    // Fixed height: the page is a flex column and the chat window takes the rest.
    <Box sx={{ flexShrink: 0 }}>

      <AppBar position="static">
        <Toolbar >
          <Typography
            variant="h6"
            component={Link}
            to="/"
            aria-label="Go to home page"
            sx={{ color: "inherit", textDecoration: "none", cursor: "pointer" }}
          >
            Customer service bot
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            component={Link}
            to="/help"
            aria-label="Help"
            color="secondary"
            sx={{
              "&:hover": {
                bgcolor: "primary.main",
                color: "secondary.dark"
              }
            }}
          >
            <Info />
          </IconButton>
        </Toolbar>
      </AppBar>
    </Box>
  )
}
