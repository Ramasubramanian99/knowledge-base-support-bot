from pydantic import BaseModel


class RagFile(BaseModel):
    name: str
    file_rag: bytes

class DocQuery(BaseModel):
    session_id: str
    query: str
