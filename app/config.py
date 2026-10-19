# config.py — Configuración central con soporte LLM dinámico
from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    # App
    APP_NAME: str = "agente_react_rag"
    VERSION: str = "1.0.0"
    ENV: str = "development"

    # DB
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/react_rag"
    REDIS_URL: str = "redis://localhost:6379/0"

    # --- LLM (ahora dinámico) ---
    # Fallback por .env si no hay config en DB
    LLM_PROVIDER: str = "openai"  # openai | anthropic | gemini | groq | ollama | custom
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_BASE_URL: Optional[str] = None
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2048

    # Keys fallback (si no se usa tabla llm_configs)
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # Seguridad
    SECRET_KEY: str = "change-me-in-production"
    ENCRYPTION_KEY: str = "32bytes-key-for-aes-256-gcm-!!!!"  # usar Fernet / AES-GCM real

    # RAG
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIM: int = 1536
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 120

    class Config:
        # Ruta estable independientemente del directorio desde el que se ejecute uvicorn.
        env_file = str(Path(__file__).resolve().parents[1] / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()

# Helper para resolver config activa:
# 1. Buscar en DB llm_configs donde is_active=True
# 2. Si no hay, usar fallback de .env
def get_llm_runtime_config(db_session=None):
    if db_session:
        try:
            from app.db.models_llm import LLMConfig
            from app.core.crypto import decrypt  # implementar con cryptography.fernet
            active = db_session.query(LLMConfig).filter(LLMConfig.is_active==True).first()
            if active:
                return {
                    "provider": active.provider,
                    "model": active.model,
                    "api_key": decrypt(active.api_key_encrypted),
                    "base_url": active.base_url,
                    "temperature": active.temperature,
                    "max_tokens": active.max_tokens,
                }
        except Exception:
            pass
    # fallback .env
    key_map = {
        "openai": settings.OPENAI_API_KEY,
        "anthropic": settings.ANTHROPIC_API_KEY,
        "gemini": settings.GEMINI_API_KEY,
        "groq": settings.GROQ_API_KEY,
    }
    return {
        "provider": settings.LLM_PROVIDER,
        "model": settings.LLM_MODEL,
        "api_key": key_map.get(settings.LLM_PROVIDER),
        "base_url": settings.LLM_BASE_URL,
        "temperature": settings.LLM_TEMPERATURE,
        "max_tokens": settings.LLM_MAX_TOKENS,
    }
