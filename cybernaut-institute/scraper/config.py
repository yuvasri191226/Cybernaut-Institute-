"""Central settings for the scraper (Member 4). Values come from .env."""
import os
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_CONFIG = dict(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "college_announcements_db"),
    charset="utf8mb4",
    autocommit=False,
)

USER_AGENT = os.getenv("SCRAPER_USER_AGENT", "CybernautAnnouncementBot/1.0 (student project)")
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "20"))
REQUEST_DELAY = float(os.getenv("REQUEST_DELAY_SECONDS", "2"))
INTERVAL_MINUTES = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "30"))

SOURCES_FILE = os.path.join(BASE_DIR, "sources.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

# scraping_logs.status values. VERIFY against schema.sql and change if different.
STATUS_SUCCESS = "Success"
STATUS_FAILED = "Failed"
STATUS_PARTIAL = "Partial"
