"""
Entry point.
  python run_scraper.py --dry-run      scrape + save JSON only (no MySQL needed)
  python run_scraper.py                scrape + save JSON + store in MySQL + log
  python run_scraper.py --schedule     repeat every SCRAPE_INTERVAL_MINUTES
"""
import argparse
import json
import os
import time
from datetime import datetime

import config
import scraper_engine as engine


def load_sources():
    with open(config.SOURCES_FILE, encoding="utf-8") as f:
        return [s for s in json.load(f) if s.get("enabled")]


def save_json(all_items):
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    path = os.path.join(config.OUTPUT_DIR, f"scraped_{datetime.now():%Y%m%d_%H%M%S}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)
    return path


def run_once(dry_run=False):
    sources = load_sources()
    if not sources:
        print("No enabled sources. Edit sources.json and set \"enabled\": true.")
        return
    conn = None
    if not dry_run:
        import db_handler
        conn = db_handler.connect()
    all_items = []

    for i, src in enumerate(sources):
        if i:
            time.sleep(config.REQUEST_DELAY)
        started = datetime.now()
        found = new = updated = failed = 0
        status, error = config.STATUS_SUCCESS, None
        try:
            items = engine.scrape_source(src)
            found = len(items)
            all_items.extend(items)
            if conn:
                for it in items:
                    try:
                        with conn.cursor() as cur:
                            aid, result = db_handler.upsert_announcement(cur, it)
                            db_handler.save_attachments(cur, aid, it["attachments"])
                        conn.commit()
                        new += result == "new"
                        updated += result == "updated"
                    except Exception as e:  # one bad item must not stop the run
                        conn.rollback()
                        failed += 1
                        error = f"{it['title'][:80]}: {e}"
                        print(f"[ITEM ERROR] {error}")
                if failed:
                    status = config.STATUS_PARTIAL if failed < found else config.STATUS_FAILED
        except Exception as e:  # network error, robots block...
            status, error = config.STATUS_FAILED, e
            print(f"[ERROR] {src['name']}: {e}")
        print(f"[{status}] {src['name']}: found={found} new={new} updated={updated} failed={failed}")
        if conn:
            db_handler.log_run(conn, src, status, started, datetime.now(),
                               found, new, updated, failed, error)

    print("JSON saved:", save_json(all_items))
    if conn:
        conn.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--schedule", action="store_true")
    args = ap.parse_args()
    if args.schedule:
        from apscheduler.schedulers.blocking import BlockingScheduler
        run_once(args.dry_run)
        sched = BlockingScheduler()
        sched.add_job(run_once, "interval", minutes=config.INTERVAL_MINUTES, args=[args.dry_run])
        print(f"Scheduler running every {config.INTERVAL_MINUTES} min. Ctrl+C to stop.")
        sched.start()
    else:
        run_once(args.dry_run)