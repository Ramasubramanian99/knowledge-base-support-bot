from pathlib import Path
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app.config import settings
from app.models import DocQuery, DocumentOut, InitUpload, InitUploadOut, SessionDocuments
from app.session import get_session
from app.supabase_client import get_supabase

ALLOWED = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_BYTES = 10 * 1024 * 1024

app = FastAPI()

# Credentialed requests need explicit origins; "*" is rejected by browsers here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def get_home():
    return {"Hello from api!"}


@app.get("/session/documents", response_model=SessionDocuments)
def get_session_documents(session_id: str = Depends(get_session)):
    """
    Documents visible to this session. Creates the session and attaches the
    four default documents when the caller has no active one.
    """
    docs = db.list_session_documents(session_id)
    return SessionDocuments(
        session_id=UUID(session_id),
        documents=[
            DocumentOut(
                id=doc["id"],
                name=doc["original_name"],
                is_default=doc["is_default"],
                status=doc["status"],
            )
            for doc in docs
        ],
    )


@app.delete("/session/documents/{document_id}", status_code=204)
def remove_session_document(document_id: UUID, session_id: str = Depends(get_session)):
    """
    Detach a document from this session. Only the relationship goes: shared
    default documents stay in storage for every other session.
    """
    if not db.unlink_document(session_id, document_id):
        raise HTTPException(404, "Document not linked to this session")
    return None


@app.post("/uploads/init", response_model=InitUploadOut)
def init_upload(req: InitUpload, session_id: str = Depends(get_session)):
    """
    Reserve a row and hand back a signed URL so the browser uploads straight
    to storage, keeping large files out of this process.
    """
    if req.content_type not in ALLOWED:
        raise HTTPException(415, "Unsupported file type")
    if req.size > MAX_BYTES:
        raise HTTPException(413, f"Max {MAX_BYTES // 1024 // 1024}MB")

    reserved = db.create_pending_document(
        session_id, req.filename, req.content_type, req.size
    )
    storage_path = reserved["storage_path"]

    signed = (
        get_supabase()
        .storage.from_(settings.storage_bucket)
        .create_signed_upload_url(storage_path)
    )

    return InitUploadOut(
        doc_id=reserved["doc_id"],
        path=storage_path,
        signed_url=signed["signed_url"],
        token=signed["token"],
    )


@app.post("/uploads/{doc_id}/complete")
def complete_upload(doc_id: UUID, session_id: str = Depends(get_session)):
    """Confirm the object really landed in storage before marking it usable."""
    doc = db.get_session_document(session_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    storage = get_supabase().storage.from_(settings.storage_bucket)
    stored_name = Path(doc["storage_path"]).name
    files = storage.list(path=session_id)
    match = next((f for f in files if f["name"] == stored_name), None)

    if not match:
        raise HTTPException(400, "Upload not found in storage")

    size = (match.get("metadata") or {}).get("size", 0)
    if size > MAX_BYTES:
        storage.remove([doc["storage_path"]])
        db.delete_document_row(doc_id)
        raise HTTPException(413, "File too large")

    # TODO: enqueue chunking + embedding here; "pending" until that exists.
    db.set_document_status(doc_id, "pending")
    return {"status": "pending"}


@app.post("/query")
def query_from_chat(query: DocQuery, session_id: str = Depends(get_session)):
    # TODO: retrieve context from this session's documents, then call Gemini.
    docs = db.list_session_documents(session_id)
    return {"answer": "", "documents_in_scope": len(docs)}
