import os
from pathlib import Path
from pydantic import BaseModel

import sys
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


class Settings(BaseModel):
    PROJECT_NAME: str = "HomeCore"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "homecore-default-secret-key-change-in-prod-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # SQLite Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'homecore.db'}")
    
    # Demo Simulator
    ENABLE_DEMO_SIMULATOR: bool = os.getenv("ENABLE_DEMO_SIMULATOR", "true").lower() in ("true", "1")

settings = Settings()
