import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"

    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000", # React frontend
        "http://127.0.0.1:3000", # React frontend (alternative URL)
    ]

    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./orgai.db")
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "orgai")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Application settings
    MODEL_STORAGE_PATH: str = os.getenv("MODEL_STORAGE_PATH", os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "model_storage")))
    DEFAULT_SIMULATION_STEPS: int = 24

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()