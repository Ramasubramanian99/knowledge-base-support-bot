from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str  # anon key for client-facing, service_role for server-trusted ops

    class Config:
        env_file = ".env"

settings = Settings()