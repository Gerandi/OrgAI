from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pymongo import MongoClient
import redis

from app.config.settings import settings

# SQLAlchemy setup for structured data
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# MongoDB setup for unstructured data
mongo_client = MongoClient(settings.MONGO_URL)
mongo_db = mongo_client[settings.MONGO_DB]

# Redis setup for caching and pub/sub
redis_client = redis.from_url(settings.REDIS_URL)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# MongoDB collections
organization_collection = mongo_db["organizations"]
communication_collection = mongo_db["communications"]
research_collection = mongo_db["research"]
simulation_collection = mongo_db["simulations"]