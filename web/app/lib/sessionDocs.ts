import { useCallback, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type SessionDoc = {
  id: string;
  name: string;
  is_default: boolean;
  status: string;
};

// credentials: "include" so the session cookie travels with every call.
async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", ...init });
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${response.status}`);
  }
  return response;
}

/**
 * The session's document list, served by the API. The session itself is
 * created server-side on the first call and lives in an HttpOnly cookie.
 */
export function useSessionDocs() {
  const [docs, setDocs] = useState<SessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await api("/session/documents");
      const data = await response.json();
      setDocs(data.documents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
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

  const uploadDoc = useCallback(async (file: File) => {
    try {
      setError(null);
      const initResponse = await api("/uploads/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          size: file.size,
        }),
      });
      const { doc_id, signed_url } = await initResponse.json();

      // Straight to storage, so the file never passes through the API.
      const upload = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!upload.ok) throw new Error(`Upload failed: ${upload.status}`);

      await api(`/uploads/${doc_id}/complete`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload document");
    }
  }, [refresh]);

  return { docs, loading, error, removeDoc, uploadDoc };
}
