from pathlib import Path
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app.answer import answer_question
from app.config import settings
from app.ingest import ingest_document
from app.models import (
    DocQuery,
    DocumentOut,
    DocumentUrl,
    InitUpload,
    InitUploadOut,
    QueryAnswer,
    SessionDocuments,
)
from app.session import get_session
from app.supabase_client import get_supabase

ALLOWED = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_BYTES = 10 * 1024 * 1024
MAX_UPLOADS = 5  # per session, on top of the shared defaults
# Long enough to open the file, short enough that a leaked link goes stale.
VIEW_URL_TTL_SECONDS = 300

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

@app.get("/session/documents/{document_id}/url", response_model=DocumentUrl)
def get_document_url(document_id: UUID, session_id: str = Depends(get_session)):
    """Short-lived signed link so the browser can open a document it can see."""
    doc = db.get_session_document(session_id, document_id)
    if not doc:
        raise HTTPException(404, "Document not linked to this session")
    if doc["status"] == "awaiting_upload":
        raise HTTPException(409, "Document has not finished uploading")

    signed = (
        get_supabase()
        .storage.from_(settings.storage_bucket)
        .create_signed_url(doc["storage_path"], VIEW_URL_TTL_SECONDS)
    )
    if not signed.get("signedURL"):
        raise HTTPException(404, "File not found in storage")
    return DocumentUrl(url=signed["signedURL"])


@app.delete("/session/documents/{document_id}", status_code=204)
def remove_session_document(document_id: UUID, session_id: str = Depends(get_session)):
    """
    Remove a document from this session. The session's own uploads are deleted
    outright, which frees an upload slot. Shared defaults are only detached, so
    they stay in storage for every other session.
    """
    doc = db.get_session_document(session_id, document_id)
    if not doc:
        raise HTTPException(404, "Document not linked to this session")

    if db.is_session_upload(session_id, doc):
        get_supabase().storage.from_(settings.storage_bucket).remove([doc["storage_path"]])
        db.delete_document_row(document_id)  # cascades to session_documents
    else:
        db.unlink_document(session_id, document_id)
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
    if db.count_session_uploads(session_id) >= MAX_UPLOADS:
        raise HTTPException(409, f"Upload limit reached ({MAX_UPLOADS} files per session)")

    reserved = db.create_pending_document(
        session_id, req.filename, req.content_type, req.size
    )
    print(reserved)
    storage_path = reserved["storage_path"]
    print(storage_path)
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

    # Chunk and embed before answering, so the doc is queryable once this returns.
    db.set_document_status(doc_id, "pending")
    try:
        chunk_count = ingest_document(doc)
    except Exception as err:
        print(f"ingest failed for {doc_id}: {err!r}")
        db.set_document_status(doc_id, "failed")
        raise HTTPException(422, "Could not read this document")

    db.set_document_status(doc_id, "ready")
    return {"status": "ready", "chunks": chunk_count}


@app.post("/query", response_model=QueryAnswer)
def query_from_chat(query: DocQuery, session_id: str = Depends(get_session)):
    """Answer from the session's documents. Only fully ingested files are searched."""
    question = query.query.strip()
    if not question:
        raise HTTPException(422, "Question is empty")

    docs = [
        doc
        for doc in db.list_session_documents(session_id)
        if doc["status"] == "ready"
    ]
    if not docs:
        raise HTTPException(409, "Add a document before asking a question")

    try:
        answer = answer_question(question, docs)
    except Exception as err:
        print(f"query failed: {err!r}")
        raise HTTPException(502, "Could not get an answer right now, please try again")
    return QueryAnswer(answer=answer, documents_in_scope=len(docs))
