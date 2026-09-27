from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str  # anon key for client-facing, service_role for server-trusted ops
    gemini_api_key: str
    gemini_model: str = "gemini-3.6-flash"

    # Storage bucket holding both the default docs and session uploads.
    storage_bucket: str = "RAG_files"

    # How long an anonymous session lives.
    session_ttl_hours: int = 1
    session_cookie_name: str = "session_id"
    # Cross-site cookies (Vercel frontend -> separate API host) need
    # SameSite=None and Secure. Keep lax/false for local http development.
    cookie_samesite: str = "lax"
    cookie_secure: bool = False

    # Comma-separated list of origins allowed to send credentialed requests.
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"

settings = Settings()
