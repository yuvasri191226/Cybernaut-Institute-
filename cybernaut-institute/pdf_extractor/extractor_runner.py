"""
Main Extraction Runner for PDF Text Extraction Pipeline (Member 7).
Coordinates safe downloading, text parsing, database status updates,
and prints structured console output.
"""
import os
import sys
import argparse
from typing import Dict, Any, List

try:
    from . import config
    from . import db_handler
    from . import downloader
    from . import pdf_parser
except ImportError:
    import config
    import db_handler
    import downloader
    import pdf_parser


def validate_attachment_id(raw_id: Any) -> Optional[int]:
    """
    Safely validates that attachment_id is a valid integer or string of digits.

    Accepts:
        - int (excluding bool)
        - string of digits (e.g. "5", " 5 ")

    Rejects:
        - None
        - "" (empty string)
        - "abc", "12abc"
        - floats (e.g. 5.5)
        - booleans (True, False)

    Returns:
        int: The parsed integer ID if valid.
        None: If the attachment ID is invalid.
    """
    if raw_id is None:
        return None
    if isinstance(raw_id, bool):
        return None
    if isinstance(raw_id, int):
        return raw_id
    if isinstance(raw_id, str):
        cleaned = raw_id.strip()
        if cleaned.isdigit():
            return int(cleaned)
        return None
    return None


def process_single_attachment(
    attachment: Dict[str, Any],
    connection: Any = None,
    offline_mode: bool = False
) -> Dict[str, Any]:
    """
    Processes a single attachment record:
    1. Validates attachment_id safely.
    2. Downloads or resolves local PDF file safely.
    3. Extracts and cleans text using pdf_parser.
    4. Updates database status (if not in offline mode).
    5. Cleans up any downloaded temporary files.
    Returns processing outcome summary dict.
    """
    raw_id = attachment.get("attachment_id")
    valid_id = validate_attachment_id(raw_id)
    file_name = attachment.get("file_name", "unknown.pdf")
    file_url = attachment.get("file_url", "")

    if valid_id is None:
        print(f"WARNING: Invalid attachment_id '{raw_id}' in record. Skipping record.")
        return {
            "attachment_id": raw_id,
            "file_name": file_name,
            "extraction_label": "FAILED",
            "pages": 0,
            "status": config.STATUS_FAILED,
            "error": f"Invalid attachment_id: '{raw_id}'",
        }

    temp_path: str = ""
    is_temp: bool = False

    try:
        # Step 1: Download or locate PDF
        temp_path, is_temp = downloader.download_or_get_pdf(file_url)

        # Step 2: Extract text
        result = pdf_parser.extract_pdf_text(temp_path)

        # Step 3: Determine outcome
        status = result.status
        if status == config.STATUS_COMPLETED:
            extraction_label = "SUCCESS"
        elif status == config.STATUS_NO_TEXT:
            extraction_label = "NO TEXT"
        else:
            extraction_label = "FAILED"

        # Step 4: Update database if connection available
        if connection is not None and not offline_mode:
            db_handler.update_attachment_status(
                connection=connection,
                attachment_id=valid_id,
                status=status,
                extracted_text=result.text if status == config.STATUS_COMPLETED else None,
            )

        return {
            "attachment_id": valid_id,
            "file_name": file_name,
            "extraction_label": extraction_label,
            "pages": result.page_count,
            "status": status,
            "error": result.error_message,
        }

    except Exception as e:
        # Download or unexpected processing failure
        if connection is not None and not offline_mode:
            try:
                db_handler.update_attachment_status(
                    connection=connection,
                    attachment_id=valid_id,
                    status=config.STATUS_FAILED,
                    extracted_text=None,
                )
            except Exception:
                pass

        return {
            "attachment_id": valid_id,
            "file_name": file_name,
            "extraction_label": "FAILED",
            "pages": 0,
            "status": config.STATUS_FAILED,
            "error": str(e),
        }

    finally:
        # Always remove temporary files
        if is_temp and temp_path:
            downloader.cleanup_temp_file(temp_path)


def run_pipeline(limit: int = 0, offline: bool = False) -> Dict[str, int]:
    """
    Executes the PDF text extraction pipeline.
    Prints formatted console logs and processing summary.
    """
    print("=" * 40)
    print("COLLEGE ANNOUNCEMENT PDF EXTRACTOR")
    print("=" * 40)
    print()

    stats = {
        "total": 0,
        "completed": 0,
        "no_text": 0,
        "failed": 0,
    }

    if offline:
        conn = None
        print("Database connection: SKIPPED (offline mode)")
        print()
        print("Running in OFFLINE mode (using sample PDFs without MySQL)...")
        print()
        sample_files = [
            ("1", "sample_1_english_announcement.pdf"),
            ("2", "sample_2_tamil_announcement.pdf"),
            ("3", "sample_3_scanned_notice.pdf"),
            ("4", "sample_corrupted.pdf"),
        ]
        pending_items = []
        for s_id, s_name in sample_files:
            s_path = os.path.join(config.SAMPLE_PDFS_DIR, s_name)
            if os.path.exists(s_path):
                pending_items.append({
                    "attachment_id": s_id,
                    "file_name": s_name,
                    "file_url": s_path,
                    "file_type": "PDF",
                })

        print(f"Pending PDF attachments found: {len(pending_items)}")
        print()

        for item in pending_items:
            stats["total"] += 1
            print(f"Processing attachment ID: {item.get('attachment_id')}")
            print(f"File: {item.get('file_name', 'unknown.pdf')}")

            outcome = process_single_attachment(item, connection=None, offline_mode=True)

            print(f"Extraction: {outcome['extraction_label']}")
            print(f"Pages: {outcome['pages']}")
            print(f"Status: {outcome['status']}")
            print()

            if outcome["status"] == config.STATUS_COMPLETED:
                stats["completed"] += 1
            elif outcome["status"] == config.STATUS_NO_TEXT:
                stats["no_text"] += 1
            else:
                stats["failed"] += 1

    else:
        conn = None
        try:
            conn = db_handler.get_connection()
            print("Database connection: SUCCESS")
            print()
        except Exception as e:
            print("Database connection: FAILED")
            print(f"Error: {e}")
            print()
            print("Tip: Check database credentials in .env or run with --offline to test without MySQL.")
            print("=" * 40)
            return stats

        try:
            pending_items = db_handler.fetch_pending_attachments(
                connection=conn,
                limit=limit if limit > 0 else None
            )

            print(f"Pending PDF attachments found: {len(pending_items)}")
            print()

            processed_ids = set()

            for item in pending_items:
                raw_id = item.get("attachment_id")
                valid_id = validate_attachment_id(raw_id)
                if valid_id is not None:
                    if valid_id in processed_ids:
                        continue
                    processed_ids.add(valid_id)

                stats["total"] += 1
                print(f"Processing attachment ID: {raw_id}")
                print(f"File: {item.get('file_name', 'unknown.pdf')}")

                outcome = process_single_attachment(item, connection=conn, offline_mode=False)

                print(f"Extraction: {outcome['extraction_label']}")
                print(f"Pages: {outcome['pages']}")
                print(f"Status: {outcome['status']}")
                print()

                if outcome["status"] == config.STATUS_COMPLETED:
                    stats["completed"] += 1
                elif outcome["status"] == config.STATUS_NO_TEXT:
                    stats["no_text"] += 1
                else:
                    stats["failed"] += 1

        finally:
            if conn is not None:
                conn.close()

    # Print Final Summary
    print("=" * 40)
    print("PROCESSING SUMMARY")
    print("=" * 40)
    print()
    print(f"Total processed: {stats['total']}")
    print(f"Completed: {stats['completed']}")
    print(f"No Text: {stats['no_text']}")
    print(f"Failed: {stats['failed']}")
    print()
    print("=" * 40)

    return stats


def main():
    parser = argparse.ArgumentParser(description="College Announcement PDF Text Extraction Pipeline")
    parser.add_argument("--offline", action="store_true", help="Run offline against sample PDFs without MySQL")
    parser.add_argument("--limit", type=int, default=0, help="Limit the number of records to process")
    args = parser.parse_args()

    run_pipeline(limit=args.limit, offline=args.offline)


if __name__ == "__main__":
    main()
