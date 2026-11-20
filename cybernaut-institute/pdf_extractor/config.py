"""
Central configuration module for the PDF Text Extraction Pipeline (Member 7).
Loads settings from .env and validates pipeline parameters.
"""
import os
from typing import Dict, Any
from dotenv import load_dotenv

# Base directory for the pdf_extractor module
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Look for .env in pdf_extractor/, project root, or parent dirs
_env_path = os.path.join(BASE_DIR, ".env")
if not os.path.exists(_env_path):
    _alt_env = os.path.join(os.path.dirname(BASE_DIR), ".env")
    if os.path.exists(_alt_env):
        _env_path = _alt_env

load_dotenv(_env_path)


def _get_int_env(key: str, default: int) -> int:
    val = os.getenv(key)
    if val is None or not val.strip():
        return default
    try:
        return int(val)
    except ValueError:
        raise ValueError(f"Invalid integer configuration for '{key}': '{val}'")


def _get_float_env(key: str, default: float) -> float:
    val = os.getenv(key)
    if val is None or not val.strip():
        return default
    try:
        return float(val)
    except ValueError:
        raise ValueError(f"Invalid numeric configuration for '{key}': '{val}'")


# Database Configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = _get_int_env("DB_PORT", 3306)
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "college_announcements_db")

DB_CONFIG: Dict[str, Any] = {
    "host": DB_HOST,
    "port": DB_PORT,
    "user": DB_USER,
    "password": DB_PASSWORD,
    "database": DB_NAME,
    "charset": "utf8mb4",
    "autocommit": False,
}

# Download & Extraction Settings
DOWNLOAD_TIMEOUT = _get_int_env("DOWNLOAD_TIMEOUT", 30)
if DOWNLOAD_TIMEOUT <= 0:
    raise ValueError(f"DOWNLOAD_TIMEOUT must be positive, got {DOWNLOAD_TIMEOUT}")

MAX_FILE_SIZE_MB = _get_float_env("MAX_FILE_SIZE_MB", 25.0)
if MAX_FILE_SIZE_MB <= 0:
    raise ValueError(f"MAX_FILE_SIZE_MB must be positive, got {MAX_FILE_SIZE_MB}")

MAX_FILE_SIZE_BYTES = int(MAX_FILE_SIZE_MB * 1024 * 1024)

# Temporary directory for streaming downloads
_temp_dir_name = os.getenv("TEMP_DIR", "temp")
if os.path.isabs(_temp_dir_name):
    TEMP_DIR = _temp_dir_name
else:
    TEMP_DIR = os.path.join(BASE_DIR, _temp_dir_name)

os.makedirs(TEMP_DIR, exist_ok=True)

# Sample PDFs directory
SAMPLE_PDFS_DIR = os.path.join(BASE_DIR, "sample_pdfs")

# SSRF Protection flag for testing environments (defaults to False for production)
ALLOW_PRIVATE_IPS = os.getenv("ALLOW_PRIVATE_IPS", "false").lower() in ("true", "1", "yes")

# Valid extraction statuses matching database/schema.sql ENUM exactly
STATUS_PENDING = "Pending"
STATUS_COMPLETED = "Completed"
STATUS_FAILED = "Failed"
STATUS_NO_TEXT = "No Text"

VALID_STATUSES = {
    STATUS_PENDING,
    STATUS_COMPLETED,
    STATUS_FAILED,
    STATUS_NO_TEXT,
}


def validate_config() -> bool:
    """Validates configuration parameters and raises ValueError if invalid."""
    if not (1 <= DB_PORT <= 65535):
        raise ValueError(f"Database port out of valid range (1-65535): {DB_PORT}")
    if DOWNLOAD_TIMEOUT <= 0:
        raise ValueError(f"Download timeout must be > 0: {DOWNLOAD_TIMEOUT}")
    if MAX_FILE_SIZE_MB <= 0:
        raise ValueError(f"Max file size must be > 0: {MAX_FILE_SIZE_MB}")
    return True
