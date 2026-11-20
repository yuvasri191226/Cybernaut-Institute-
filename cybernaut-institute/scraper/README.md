# Scraper (Member 4 - Mourisikaa)

Scrapes permitted official notice pages -> JSON -> MySQL (`announcements`, `attachments`, `scraping_logs`).

## Setup
    cd cybernaut-institute/scraper
    pip install -r requirements.txt
    cp .env.example .env        # fill DB password
    # edit sources.json: real URL, "enabled": true, and CSS selectors if needed

## Run
    python run_scraper.py --dry-run   # no DB, writes output/scraped_*.json
    python run_scraper.py             # full run
    python run_scraper.py --schedule  # every SCRAPE_INTERVAL_MINUTES

## Rules implemented
- robots.txt checked before every fetch; blocked/unreachable = skipped and logged as Failed.
- Dates: NULL unless explicitly on the page (dd/mm/yyyy convention). Invalid dates ignored.
- Duplicate check by `source_url`; change check by SHA-256 `content_hash`.
- Updates use plain UPDATE; trigger `trg_before_announcement_update` writes version history.
- Document links (pdf/doc/xls/ppt) -> `attachments`, `extraction_status='Pending'`.
- Every run writes one `scraping_logs` row per source (also on failure).
- No frontend, Flask, schema or PDF-extraction files touched.
