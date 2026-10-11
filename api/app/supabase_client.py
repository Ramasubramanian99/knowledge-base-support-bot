import threading

from supabase import create_client, Client
from app.config import settings

# One client per thread. Sync endpoints run on FastAPI's threadpool, and a
# shared client's HTTP/2 connection breaks under concurrent use (seen as
# httpx.ReadError / WinError 10035).
_local = threading.local()


def get_supabase() -> Client:
    client = getattr(_local, "client", None)
    if client is None:
        client = _local.client = create_client(settings.supabase_url, settings.supabase_key)
    return client
