// Deletes uploaded files once they are 30 minutes old, along with their
// document rows. The four shared sample_* documents at the bucket root are
// never touched. Meant to be called every few minutes by pg_cron (see
// migrations/002_schedule_remove_session_files.sql).
//
// POST /functions/v1/remove-session-files            -> delete
// POST /functions/v1/remove-session-files?dry_run=1  -> report only

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const BUCKET = Deno.env.get("STORAGE_BUCKET") ?? "RAG_files";
const MAX_AGE_MS = Number(Deno.env.get("REMOVE_AFTER_MINUTES") ?? 30) * 60 * 1000;
const PAGE_SIZE = 1000;

// Shared defaults every session starts with, plus the placeholder Storage
// keeps in empty folders.
function isProtected(path: string): boolean {
  return path.startsWith("sample_") || path.endsWith(".emptyFolderPlaceholder");
}

type StoredFile = { path: string; createdAt: string | null };

// Secret-key only: this deletes data, so it is not callable from the browser.
export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    const dryRun = new URL(req.url).searchParams.has("dry_run");
    const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
    const bucket = ctx.supabaseAdmin.storage.from(BUCKET);

    // Uploads live under <session_id>/, so walk folders as well as the root.
    async function listFiles(prefix = ""): Promise<StoredFile[]> {
      const files: StoredFile[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await bucket.list(prefix, { limit: PAGE_SIZE, offset });
        if (error) throw error;
        for (const item of data) {
          const path = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id === null) files.push(...await listFiles(path)); // a folder
          else files.push({ path, createdAt: item.created_at });
        }
        if (data.length < PAGE_SIZE) return files;
      }
    }

    try {
      const expired = (await listFiles())
        // No timestamp means we can't tell its age, so leave it alone.
        .filter((file) => !isProtected(file.path) && file.createdAt !== null && file.createdAt < cutoff)
        .map((file) => file.path);

      if (dryRun) {
        return Response.json({ dry_run: true, cutoff, files: expired });
      }

      for (let i = 0; i < expired.length; i += PAGE_SIZE) {
        const { error } = await bucket.remove(expired.slice(i, i + PAGE_SIZE));
        if (error) throw error;
      }

      // Rows go by age too, which also clears uploads that were reserved but
      // never finished. session_documents links cascade with them.
      const { data: rows, error } = await ctx.supabaseAdmin
        .from("documents")
        .delete()
        .eq("is_default", false)
        .lt("created_at", cutoff)
        .select("id");
      if (error) throw error;

      return Response.json({
        cutoff,
        deleted_files: expired.length,
        deleted_documents: rows.length,
      });
    } catch (err) {
      console.error("remove-session-files failed", err);
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ error: message }, { status: 500 });
    }
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request with a secret key:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/remove-session-files?dry_run=1' \
    --header 'apikey: <secret key>'

*/
