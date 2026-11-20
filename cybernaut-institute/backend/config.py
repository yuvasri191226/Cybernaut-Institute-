"""
config.py - Environment & Application Configuration
===================================================
Cybernaut Institute of Technology - Announcement System Backend
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file from backend directory or parent directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    # Check parent directory
    parent_env = os.path.join(os.path.dirname(BASE_DIR), ".env")
    if os.path.exists(parent_env):
        load_dotenv(parent_env)
    else:
        load_dotenv()


class Config:
    """Application configuration loaded from environment variables."""

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "cybernaut-cit-secret-key-2026-production-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=JWT_EXPIRATION_HOURS)

    # Database Configuration (MySQL 8.0+)
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "college_announcements_db")
    DB_CHARSET = os.getenv("DB_CHARSET", "utf8mb4")

    # PyMySQL Connection Parameters
    @classmethod
    def get_db_config(cls):
        return {
            "host": cls.DB_HOST,
            "port": cls.DB_PORT,
            "user": cls.DB_USER,
            "password": cls.DB_PASSWORD,
            "database": cls.DB_NAME,
            "charset": cls.DB_CHARSET,
            "autocommit": True,
        }

    # AI Integration Keys (Optional - fallbacks provided if not set)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

    # Server Settings
    PORT = int(os.getenv("PORT", "5000"))
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
