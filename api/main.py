from fastapi import FastAPI, Depends  # type: ignore[reportMissingImports]
from fastapi.response import JSONResponse  # type: ignore[reportMissingImports]
from fastapi.encoders import jsonable_encoder # type: ignore[reportMissingImports]
from typing import Any
from app.models import RagFile, DocQuery
from app.supabase_client import get_supabase


app = FastAPI()

@app.get("/")
def get_home():
    return {"Hello from api!"}

@app.get('/table')
def get_database(supabase: Any = Depends(get_supabase)):
    result = supabase.table("Test").select("*").execute()
    return result.data

@app.post('/upload')
def upload_files(file_rag: RagFile):
    if file_rag.name:
        return {"status": 200, "message": "File uploaded"}
    else:
        return {"status": 400, "message": "File not uploaded"}

@app.post('/query')
def query_from_chat(query: DocQuery):
    if query.session_id:
        answer=""
        return JSONResponse(status=200, content=jsonable_encoder(answer))