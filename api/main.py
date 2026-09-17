from fastapi import FastAPI, Depends
from supabase import Client
from app.supabase_client import get_supabase


app = FastAPI()

@app.get("/")
def get_home():
    return {"Hello from api!"}

@app.get('/table')
def get_database(supabase: Client= Depends(get_supabase)):
    result = supabase.table("Test").select("*").execute()
    return result.data