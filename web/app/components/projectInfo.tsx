import { Alert, Box, Typography } from "@mui/material";

export const GITHUB_URL = "https://github.com/Ramasubramanian99/knowledge-base-support-bot";
// TODO: replace with your LinkedIn profile URL
export const LINKEDIN_URL = "https://www.linkedin.com/in/your-profile";

/**
 * Shared copy for the intro modal and the help page. Each piece is exported
 * separately so both places can keep their own headings and spacing.
 */

export function ProjectDescription() {
  return (
    <Typography variant="body1" sx={{ color: "grey.300", mb: 2 }}>
      This bot answers questions using Retrieval-Augmented Generation (RAG) and Gemini 3.6 Flash model. It searches the
      documents you give it, pulls out the most relevant context from your data and  so
      answers stay grounded in your own knowledge base rather than the model's general training. This project serves as a demostration of
      RAG's most practical usecase which is providing relavent context without the need to re-train the model. For more information of RAG or
      the project check the github link below.
    </Typography>
  );
}

export function UsageSteps() {
  return (
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
  );
}

export function PrivacyWarning() {
  return (
    <Alert severity="warning" variant="outlined" sx={{ mt: 3, color: "warning.light" }}>
      Please do not upload any private, confidential or personal files. This is a prototype,
      uploaded documents are not encrypted and their contents are sent to a language model for
      processing.
    </Alert>
  );
}
