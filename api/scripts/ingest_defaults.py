"""
Chunk and embed the shared default documents. They are seeded as "ready"
without going through /uploads/{id}/complete, so run this once after applying
migrations/005_document_chunks.sql. Safe to re-run: chunks are replaced.

    uv run python -m scripts.ingest_defaults
"""

from app import db
from app.ingest import ingest_document


def main() -> None:
    for doc in db.list_default_documents():
        count = ingest_document(doc)
        print(f"{doc['original_name']}: {count} chunks")


if __name__ == "__main__":
    main()
