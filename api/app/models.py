from uuid import UUID
from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: UUID
    name: str
    is_default: bool
    status: str


class SessionDocuments(BaseModel):
    session_id: UUID
    documents: list[DocumentOut]


class InitUpload(BaseModel):
    filename: str
    content_type: str
    size: int


class InitUploadOut(BaseModel):
    doc_id: UUID
    path: str
    signed_url: str
    token: str


class DocumentUrl(BaseModel):
    url: str


class DocQuery(BaseModel):
    query: str
