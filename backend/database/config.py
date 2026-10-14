"""
Database configuration — reads from environment variables / .env file.
Move all secrets here; never hardcode credentials in application code.
"""
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "pyronav_db")
DB_USER = os.getenv("DB_USER", "pyronav_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "secure_password")
DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "20"))

DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
