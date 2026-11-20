"""
MySQL operations for the scraper. Matches database/schema.sql exactly.
Tables used: announcements, attachments, scraping_logs.
"""
from urllib.parse import urlparse

import pymysql
from pymysql.cursors import DictCursor

import config


def connect():
    return pymysql.connect(cursorclass=DictCursor, **config.DB_CONFIG)


def upsert_announcement(cur, item):
    """
    Returns (announcement_id, result): 'new' | 'updated' | 'unchanged'.
    Duplicate check: source_url. Change check: SHA-256 content_hash.
    On change we only run UPDATE; trigger trg_before_announcement_update archives the
    old version. We NEVER insert into announcement_versions.
    """
    cur.execute("SELECT id, content_hash FROM announcements WHERE source_url=%s LIMIT 1",
                (item["source_url"],))
    row = cur.fetchone()
    # schema: description is NOT NULL, so an empty string means "none on the page"
    description = item["description"] or ""

    if row is None:
        cols = ["title", "description", "source_website", "source_url",
                "content_hash", "published_date", "verification_status"]
        vals = [item["title"], description,
                urlparse(item["source_url"]).netloc[:255] or "unknown",
                item["source_url"], item["content_hash"],
                item["published_date"],            # None -> NULL (never guessed)
                "Needs Review"]
        if item["department"]:                      # else schema default 'All Departments'
            cols.append("department")
            vals.append(item["department"])
        sql = f"INSERT INTO announcements ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))})"
        cur.execute(sql, vals)
        return cur.lastrowid, "new"

    if row["content_hash"] != item["content_hash"]:
        cur.execute(
            """UPDATE announcements
               SET title=%s, description=%s, content_hash=%s,
                   published_date=COALESCE(%s, published_date)
               WHERE id=%s""",
            (item["title"], description, item["content_hash"],
             item["published_date"], row["id"]))
        return row["id"], "updated"

    return row["id"], "unchanged"


def save_attachments(cur, announcement_id, attachments):
    """Store document links with extraction_status='Pending' (for Member 7).
    attachments.file_url is UNIQUE in the schema, so we check by file_url only."""
    for att in attachments:
        cur.execute("SELECT attachment_id FROM attachments WHERE file_url=%s", (att["file_url"],))
        if cur.fetchone():
            continue
        cur.execute(
            """INSERT INTO attachments
               (announcement_id, file_name, file_url, file_type, extraction_status)
               VALUES (%s,%s,%s,%s,'Pending')""",
            (announcement_id, att["file_name"], att["file_url"], att["file_type"]))


def log_run(conn, source, status, started, ended, discovered, new, updated, failed, error=None):
    """Write one scraping_logs row (own commit so failures are still recorded)."""
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO scraping_logs
               (source_name, scrape_started_at, scrape_ended_at, status,
                discovered_count, new_count, updated_count, failed_count, error_message)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (source["name"][:255], started, ended, status,
             discovered, new, updated, failed, str(error)[:2000] if error else None))
    conn.commit()