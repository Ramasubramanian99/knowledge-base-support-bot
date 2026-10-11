import { useCallback, useEffect, useState } from "react";
import { api } from "~/lib/api";

export type SessionDoc = {
  id: string;
  name: string;
  is_default: boolean;
  status: string;
};

// Mirrors ALLOWED, MAX_BYTES and MAX_UPLOADS in api/main.py.
const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export const ACCEPTED_EXTENSIONS = Object.keys(CONTENT_TYPES).join(",");
const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOADS = 5;

// Browsers often report "" for .docx when Office isn't installed, so go by
// the extension rather than trusting file.type.
function contentTypeFor(file: File): string | undefined {
  const dot = file.name.lastIndexOf(".");
  return dot === -1 ? undefined : CONTENT_TYPES[file.name.slice(dot).toLowerCase()];
}

type DocsResponse = { documents: SessionDoc[] };

const fetchDocs = (): Promise<DocsResponse> =>
  api("/session/documents").then((response) => response.json());

// The first call has no cookie, so it creates the session. StrictMode runs the
// mount effect twice in dev, and two cookie-less calls would create two
// sessions and swap the cookie mid-upload. Mounts in the same tick share one.
let firstFetch: Promise<DocsResponse> | null = null;
function fetchDocsOnMount(): Promise<DocsResponse> {
  firstFetch ??= fetchDocs().finally(() => {
    firstFetch = null;
  });
  return firstFetch;
}

/**
 * The session's document list, served by the API. The session itself is
 * created server-side on the first call and lives in an HttpOnly cookie.
 */
export function useSessionDocs() {
  const [docs, setDocs] = useState<SessionDoc[]>([]);
  // Names of files currently on their way to storage, shown as busy chips.
  const [uploading, setUploading] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (onMount = false) => {
    try {
      const data = await (onMount ? fetchDocsOnMount() : fetchDocs());
      setDocs(data.documents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(true);
  }, [refresh]);

  const removeDoc = useCallback(async (id: string) => {
    const previous = docs;
    setDocs((current) => current.filter((doc) => doc.id !== id)); // optimistic
    try {
      await api(`/session/documents/${id}`, { method: "DELETE" });
    } catch (err) {
      setDocs(previous); // put the chip back if the server refused
      setError(err instanceof Error ? err.message : "Could not remove document");
    }
  }, [docs]);

  // Defaults are shared and don't count; in-flight uploads do.
  const uploadCount = docs.filter((doc) => !doc.is_default).length + uploading.length;
  const atLimit = uploadCount >= MAX_UPLOADS;
  // Wait for the first load: it sets the session cookie the upload calls rely on.
  const canUpload = !loading && !atLimit;

  const openDoc = useCallback(async (id: string) => {
    // Open the tab now, while we're still inside the click: browsers block
    // window.open once an await has run. Point it at the file when it arrives.
    const tab = window.open("", "_blank");
    try {
      setError(null);
      const response = await api(`/session/documents/${id}/url`);
      const { url } = await response.json();
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : "Could not open document");
    }
  }, []);

  const uploadDoc = useCallback(async (file: File) => {
    setError(null);
    if (!canUpload) {
      if (atLimit) setError(`You can upload up to ${MAX_UPLOADS} files per session`);
      return;
    }
    const contentType = contentTypeFor(file);
    if (!contentType) {
      setError("Only PDF and DOCX files are supported");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Files must be under ${MAX_BYTES / 1024 / 1024}MB`);
      return;
    }

    setUploading((current) => [...current, file.name]);
    let docId: string | null = null;
    try {
      const initResponse = await api("/uploads/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          content_type: contentType,
          size: file.size,
        }),
      });
      const { doc_id, signed_url } = await initResponse.json();
      docId = doc_id;

      // Straight to storage, so the file never passes through the API.
      const upload = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!upload.ok) throw new Error(`Upload failed: ${upload.status}`);

      await api(`/uploads/${doc_id}/complete`, { method: "POST" });
    } catch (err) {
      // Don't leave a reserved-but-empty document linked to the session.
      if (docId) {
        await api(`/session/documents/${docId}`, { method: "DELETE" }).catch(() => {});
      }
      setError(err instanceof Error ? err.message : "Could not upload document");
    } finally {
      setUploading((current) => {
        const index = current.indexOf(file.name);
        return current.filter((_, i) => i !== index);
      });
      await refresh();
    }
  }, [atLimit, canUpload, refresh]);

  return { docs, uploading, loading, error, canUpload, atLimit, openDoc, removeDoc, uploadDoc };
}
