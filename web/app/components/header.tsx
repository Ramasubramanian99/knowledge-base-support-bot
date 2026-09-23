import { AppBar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import { Info } from "@mui/icons-material";
import { Link } from "react-router"

export default function Header() {
  return (
    <Box sx={{ flexGrow: 1 }}>

      <AppBar position="static">
        <Toolbar >
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link to="/">Customer service bot</Link>
          </Typography>
          <IconButton color="secondary" sx={{
            "&:hover": {
              bgcolor: "primary.main",
              color: "secondary.dark"
            }
          }}>
            <Link to="/help">
              <Info />
            </Link>
          </IconButton>
        </Toolbar>
      </AppBar>
    </Box>
  )
}