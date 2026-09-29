

from io import BytesIO

from docx import Document as DocxDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from app import db
from app.config import settings
from app.gemini import embed
from app.supabase_client import get_supabase

PDF = "application/pdf"
DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.chunk_size, chunk_overlap=settings.chunk_overlap
)


def extract_pages(storage_path: str, content_type: str) -> list[tuple[int | None, str]]:
    """(page number, text) pairs. DOCX has no pages, so it comes back as one."""
    data = get_supabase().storage.from_(settings.storage_bucket).download(storage_path)
    if content_type == PDF:
        return [
            (i + 1, page.extract_text() or "")
            for i, page in enumerate(PdfReader(BytesIO(data)).pages)
        ]
    if content_type == DOCX:
        paragraphs = DocxDocument(BytesIO(data)).paragraphs
        return [(None, "\n".join(paragraph.text for paragraph in paragraphs))]
    raise ValueError(f"Unsupported content type: {content_type}")


def ingest_document(doc: dict) -> int:
    """Replace the document's chunks with freshly embedded ones. Returns the count."""
    chunks = [
        (page, chunk)
        for page, text in extract_pages(doc["storage_path"], doc["content_type"])
        for chunk in splitter.split_text(text)
        if chunk.strip()
    ]
    if not chunks:
        # Usually a scanned PDF with no text layer.
        raise ValueError("No extractable text")

    vectors = embed([chunk for _, chunk in chunks], "RETRIEVAL_DOCUMENT")
    db.replace_document_chunks(
        doc["id"],
        [
            {"chunk_index": i, "page": page, "content": chunk, "embedding": vector}
            for i, ((page, chunk), vector) in enumerate(zip(chunks, vectors))
        ],
    )
    return len(chunks)
