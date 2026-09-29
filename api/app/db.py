from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

from app.config import settings
from app.supabase_client import get_supabase


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_session() -> str:
    supabase = get_supabase()
    expires_at = _now() + timedelta(hours=settings.session_ttl_hours)

    created = (
        supabase.table("sessions")
        .insert({"expires_at": expires_at.isoformat()})
        .execute()
    )
    session_id = created.data[0]["id"]

    defaults = (
        supabase.table("documents").select("id").eq("is_default", True).execute()
    )
    if defaults.data:
        supabase.table("session_documents").insert(
            [
                {"session_id": session_id, "document_id": doc["id"]}
                for doc in defaults.data
            ]
        ).execute()

    return session_id


def session_is_active(session_id: str) -> bool:
    supabase = get_supabase()
    result = (
        supabase.table("sessions")
        .select("id")
        .eq("id", session_id)
        .gt("expires_at", _now().isoformat())
        .execute()
    )
    return bool(result.data)


def list_session_documents(session_id: str) -> list[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("session_documents")
        .select("documents(id, storage_path, original_name, content_type, is_default, status)")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    return [row["documents"] for row in result.data if row.get("documents")]


def unlink_document(session_id: str, document_id: UUID) -> bool:
    supabase = get_supabase()
    result = (
        supabase.table("session_documents")
        .delete()
        .eq("session_id", session_id)
        .eq("document_id", str(document_id))
        .execute()
    )
    return bool(result.data)


def count_session_uploads(session_id: str) -> int:
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("id", count="exact")
        .like("storage_path", f"{session_id}/%")
        .execute()
    )
    return result.count or 0


def is_session_upload(session_id: str, doc: dict) -> bool:
    """True for files this session uploaded, as opposed to shared defaults."""
    return doc["storage_path"].startswith(f"{session_id}/")


def create_pending_document(session_id: str, filename: str, content_type: str, size: int) -> dict:
   
    supabase = get_supabase()
    doc_id = uuid4()
    # Never trust the client's filename in the path.
    suffix = Path(filename).suffix.lower()
    storage_path = f"{session_id}/{doc_id}{suffix}"

    supabase.table("documents").insert(
        {
            "id": str(doc_id),
            "storage_path": storage_path,
            "original_name": filename,
            "content_type": content_type,
            "size_bytes": size,
            "is_default": False,
            "status": "awaiting_upload",
        }
    ).execute()

    supabase.table("session_documents").insert(
        {"session_id": session_id, "document_id": str(doc_id)}
    ).execute()

    return {"doc_id": doc_id, "storage_path": storage_path}


def get_session_document(session_id: str, document_id: UUID) -> dict | None:
    """Fetch a document only if it is linked to this session."""
    supabase = get_supabase()
    result = (
        supabase.table("session_documents")
        .select("documents(id, storage_path, original_name, content_type, is_default, status)")
        .eq("session_id", session_id)
        .eq("document_id", str(document_id))
        .execute()
    )
    if not result.data:
        return None
    return result.data[0].get("documents")


def set_document_status(document_id: UUID, status: str) -> None:
    supabase = get_supabase()
    supabase.table("documents").update({"status": status}).eq(
        "id", str(document_id)
    ).execute()


def delete_document_row(document_id: UUID) -> None:
    supabase = get_supabase()
    supabase.table("documents").delete().eq("id", str(document_id)).execute()


def list_default_documents() -> list[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("id, storage_path, original_name, content_type")
        .eq("is_default", True)
        .execute()
    )
    return result.data


def replace_document_chunks(document_id: UUID | str, rows: list[dict]) -> None:
    supabase = get_supabase()
    supabase.table("document_chunks").delete().eq("document_id", str(document_id)).execute()
    supabase.table("document_chunks").insert(
        [{**row, "document_id": str(document_id)} for row in rows]
    ).execute()


def match_chunks(query_embedding: list[float], document_ids: list[str], k: int) -> list[dict]:
    supabase = get_supabase()
    result = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "doc_ids": document_ids,
            "match_count": k,
        },
    ).execute()
    return result.data
