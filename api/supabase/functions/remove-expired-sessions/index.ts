// Deletes sessions past their expires_at, together with everything they
// uploaded: the files under <session_id>/ in storage and their document rows.
// The shared default documents are only linked to sessions, never owned by
// one, so they stay. Meant to be called every few minutes by pg_cron (see
// migrations/004_schedule_remove_expired_sessions.sql).
//
// POST /functions/v1/remove-expired-sessions            -> delete
// POST /functions/v1/remove-expired-sessions?dry_run=1  -> report only

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const BUCKET = Deno.env.get("STORAGE_BUCKET") ?? "RAG_files";
// Sessions handled per run. A backlog drains over the next few runs instead
// of risking the function's time limit.
const BATCH_SIZE = 100;
const PAGE_SIZE = 1000;

// Secret-key only: this deletes data, so it is not callable from the browser.
export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    const dryRun = new URL(req.url).searchParams.has("dry_run");
    const now = new Date().toISOString();
    const db = ctx.supabaseAdmin;
    const bucket = db.storage.from(BUCKET);

    // Uploads sit directly in the session's folder, e.g. <session_id>/<doc_id>.pdf.
    async function listSessionFiles(sessionId: string): Promise<string[]> {
      const paths: string[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await bucket.list(sessionId, { limit: PAGE_SIZE, offset });
        if (error) throw error;
        for (const item of data) {
          if (item.id !== null) paths.push(`${sessionId}/${item.name}`); // skip folders
        }
        if (data.length < PAGE_SIZE) return paths;
      }
    }

    try {
      const { data: sessions, error } = await db
        .from("sessions")
        .select("id")
        .lt("expires_at", now)
        .order("expires_at")
        .limit(BATCH_SIZE);
      if (error) throw error;

      const report = [];
      for (const { id } of sessions) {
        const files = await listSessionFiles(id);
        if (dryRun) {
          report.push({ session_id: id, files });
          continue;
        }

        // Storage first: if it fails, the rows survive and the next run retries.
        for (let i = 0; i < files.length; i += PAGE_SIZE) {
          const { error } = await bucket.remove(files.slice(i, i + PAGE_SIZE));
          if (error) throw error;
        }

        // Same ownership rule as the API's is_session_upload: the path prefix.
        const { data: docs, error: docsError } = await db
          .from("documents")
          .delete()
          .like("storage_path", `${id}/%`)
          .eq("is_default", false)
          .select("id");
        if (docsError) throw docsError;

        // session_documents links, defaults included, cascade with the session.
        const { error: sessionError } = await db.from("sessions").delete().eq("id", id);
        if (sessionError) throw sessionError;

        report.push({ session_id: id, deleted_files: files.length, deleted_documents: docs.length });
      }

      return Response.json({
        dry_run: dryRun,
        cutoff: now,
        expired_sessions: sessions.length,
        more_remaining: sessions.length === BATCH_SIZE,
        sessions: report,
      });
    } catch (err) {
      console.error("remove-expired-sessions failed", err);
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ error: message }, { status: 500 });
    }
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request with a secret key:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/remove-expired-sessions?dry_run=1' \
    --header 'apikey: <secret key>'

*/
