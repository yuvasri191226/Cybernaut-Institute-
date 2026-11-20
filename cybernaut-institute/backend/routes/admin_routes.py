"""
admin_routes.py - Administrator Panel Endpoints
==============================================
Cybernaut Institute of Technology - Announcement System Backend

Endpoints (Admin Access Only):
- GET    /api/admin/announcements: Retrieve all announcements (including unverified)
- POST   /api/admin/announcements: Create new announcement
- PUT    /api/admin/announcements/<id>: Update existing announcement
- DELETE /api/admin/announcements/<id>: Delete announcement
- POST   /api/admin/announcements/<id>/verify: Approve or reject announcement
- GET    /api/admin/statistics: Dashboard metric statistics
- GET    /api/admin/scraping-logs: Web scraper execution logs
"""

import hashlib
from urllib.parse import urlparse
from datetime import datetime, date
from flask import Blueprint, request, jsonify, g
from db import query_db, execute_db
from utils.auth_middleware import admin_required
from utils.ai_service import AIService
from routes.announcement_routes import _build_announcement_dict, _format_datetime

admin_bp = Blueprint("admin_bp", __name__)


def _compute_hash(title: str, description: str) -> str:
    """Generate SHA-256 hash for content uniqueness."""
    payload = f"{title.strip()}{description.strip()}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


@admin_bp.route("/api/admin/announcements", methods=["GET"])
@admin_required
def get_all_admin_announcements():
    """
    Retrieve all announcements across all verification statuses for the admin panel.
    """
    rows = query_db(
        "SELECT * FROM announcements ORDER BY published_date DESC, id DESC"
    ) or []

    admin_user_id = g.current_user["user_id"]
    announcements = [_build_announcement_dict(r, admin_user_id) for r in rows]
    return jsonify(announcements), 200


@admin_bp.route("/api/admin/announcements", methods=["POST"])
@admin_required
def create_announcement():
    """
    Create a new announcement from the admin dashboard.
    """
    data = request.get_json(silent=True) or {}

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    category = data.get("category", "General").strip().capitalize()
    department = data.get("department", "All Departments").strip()
    target_year = data.get("target_year", "All Years").strip()
    source_url = (data.get("source_url") or "").strip()
    document_link = (data.get("document_link") or "").strip()
    is_important = bool(data.get("is_important", False))
    raw_date = data.get("published_date") or data.get("date")

    if not title:
        return jsonify({"error": "Bad Request", "message": "Title is required."}), 400
    if not description:
        return jsonify({"error": "Bad Request", "message": "Description is required."}), 400

    # Ensure source_url uniqueness or fallback
    if not source_url:
        source_url = f"https://cit.edu.in/announcements/admin-post-{int(datetime.now().timestamp())}"

    source_website = urlparse(source_url).netloc or "CIT Administration"
    content_hash = _compute_hash(title, description)

    published_date = raw_date if raw_date else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Allowed categories in schema: 'Examination','Events','Academic','Placement','General','Other'
    valid_categories = {"Examination", "Events", "Academic", "Placement", "General", "Other"}
    if category not in valid_categories:
        # Match case-insensitively
        matched = next((c for c in valid_categories if c.lower() == category.lower()), "General")
        category = matched

    new_id = execute_db(
        """INSERT INTO announcements
           (title, description, category, department, target_year,
            announcement_type, published_date, is_important,
            source_website, source_url, content_hash, verification_status)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (title, description, category, department, target_year,
         "Circular", published_date, is_important,
         source_website, source_url, content_hash, "Needs Review")
    )

    # Attach document link if supplied
    if document_link:
        file_name = document_link.split("/")[-1] or "attachment.pdf"
        execute_db(
            """INSERT INTO attachments (announcement_id, file_name, file_url, file_type, extraction_status)
               VALUES (%s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE file_name = VALUES(file_name)""",
            (new_id, file_name, document_link, "PDF", "Completed")
        )

    # Automatically generate initial AI summary
    try:
        summary_result = AIService.summarize(title, description)
        execute_db(
            """INSERT INTO ai_insights (announcement_id, english_summary, ai_confidence_score)
               VALUES (%s, %s, %s)""",
            (new_id, summary_result["summary"], 95.0)
        )
    except Exception:
        pass

    created_row = query_db("SELECT * FROM announcements WHERE id = %s", (new_id,), one=True)
    formatted = _build_announcement_dict(created_row, g.current_user["user_id"])

    return jsonify({
        "message": "Announcement created successfully.",
        "id": new_id,
        "announcement": formatted
    }), 201


@admin_bp.route("/api/admin/announcements/<int:announcement_id>", methods=["PUT"])
@admin_required
def update_announcement(announcement_id):
    """
    Update an existing announcement.
    Note: Database trigger `trg_before_announcement_update` automatically captures
    historical changes in `announcement_versions`.
    """
    existing = query_db(
        "SELECT * FROM announcements WHERE id = %s",
        (announcement_id,),
        one=True
    )
    if not existing:
        return jsonify({"error": "Not Found", "message": "Announcement not found."}), 404

    data = request.get_json(silent=True) or {}

    title = data.get("title", existing["title"]).strip()
    description = data.get("description", existing["description"]).strip()
    category = data.get("category", existing["category"]).strip().capitalize()
    department = data.get("department", existing["department"]).strip()
    target_year = data.get("target_year", existing["target_year"]).strip()
    is_important = data.get("is_important", existing["is_important"])
    raw_date = data.get("published_date") or data.get("date") or existing["published_date"]
    source_url = data.get("source_url") or existing["source_url"]
    document_link = (data.get("document_link") or "").strip()

    valid_categories = {"Examination", "Events", "Academic", "Placement", "General", "Other"}
    if category not in valid_categories:
        matched = next((c for c in valid_categories if c.lower() == category.lower()), existing["category"])
        category = matched

    content_hash = _compute_hash(title, description)

    execute_db(
        """UPDATE announcements
           SET title = %s, description = %s, category = %s,
               department = %s, target_year = %s, is_important = %s,
               published_date = %s, source_url = %s, content_hash = %s
           WHERE id = %s""",
        (title, description, category, department, target_year,
         bool(is_important), raw_date, source_url, content_hash, announcement_id)
    )

    if document_link:
        file_name = document_link.split("/")[-1] or "attachment.pdf"
        execute_db(
            """INSERT INTO attachments (announcement_id, file_name, file_url, file_type, extraction_status)
               VALUES (%s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE file_name = VALUES(file_name)""",
            (announcement_id, file_name, document_link, "PDF", "Completed")
        )

    updated_row = query_db("SELECT * FROM announcements WHERE id = %s", (announcement_id,), one=True)
    formatted = _build_announcement_dict(updated_row, g.current_user["user_id"])

    return jsonify({
        "message": "Announcement updated successfully.",
        "id": announcement_id,
        "announcement": formatted
    }), 200


@admin_bp.route("/api/admin/announcements/<int:announcement_id>", methods=["DELETE"])
@admin_required
def delete_announcement(announcement_id):
    """
    Permanently delete an announcement.
    """
    existing = query_db("SELECT id FROM announcements WHERE id = %s", (announcement_id,), one=True)
    if not existing:
        return jsonify({"error": "Not Found", "message": "Announcement not found."}), 404

    execute_db("DELETE FROM announcements WHERE id = %s", (announcement_id,))
    return jsonify({
        "message": "Announcement permanently deleted.",
        "id": announcement_id,
        "success": True
    }), 200


@admin_bp.route("/api/admin/announcements/<int:announcement_id>/verify", methods=["POST"])
@admin_required
def verify_announcement(announcement_id):
    """
    Verify, reject, or mark announcement for review.
    Body: {"status": "verified" | "rejected" | "needs review", "note": "..."}
    """
    existing = query_db("SELECT * FROM announcements WHERE id = %s", (announcement_id,), one=True)
    if not existing:
        return jsonify({"error": "Not Found", "message": "Announcement not found."}), 404

    data = request.get_json(silent=True) or {}
    raw_status = (data.get("status") or "").strip().lower()
    note = (data.get("note") or "").strip()

    status_map = {
        "verified": "Verified",
        "rejected": "Rejected",
        "needs review": "Needs Review",
        "pending": "Needs Review",
        "review": "Needs Review"
    }

    normalized_status = status_map.get(raw_status, "Needs Review")
    admin_id = g.current_user["user_id"]

    execute_db(
        """UPDATE announcements
           SET verification_status = %s,
               verified_by = %s,
               verified_at = NOW(),
               verification_note = %s
           WHERE id = %s""",
        (normalized_status, admin_id, note or None, announcement_id)
    )

    # If newly verified, generate student notifications
    if normalized_status == "Verified" and existing["verification_status"] != "Verified":
        try:
            active_students = query_db(
                "SELECT user_id FROM users WHERE role = 'student' AND is_active = TRUE"
            ) or []
            for student in active_students:
                execute_db(
                    """INSERT INTO notifications
                       (user_id, announcement_id, title, message, notification_type, is_read)
                       VALUES (%s, %s, %s, %s, %s, FALSE)""",
                    (student["user_id"], announcement_id,
                     f"New Announcement: {existing['title'][:80]}",
                     existing["title"],
                     "New Announcement")
                )
        except Exception:
            pass

    return jsonify({
        "message": f"Announcement verification status set to {normalized_status}.",
        "announcement_id": announcement_id,
        "verification_status": normalized_status
    }), 200

# ── NEW: Trigger PDF extraction pipeline for an announcement ────────────────
@admin_bp.route("/api/announcements/<int:announcement_id>/extract-pdf", methods=["POST"])
@login_required
def trigger_pdf_extraction(announcement_id):
    """Trigger the PDF text extraction pipeline for an announcement's document_link."""
    from db import get_connection
    from pdf_extractor import config, db_handler

    conn = get_connection()
    try:
        # Fetch pending attachments for this announcement
        attachments = db_handler.fetch_pending_attachments(connection=conn, limit=100)
        ann_attachments = [a for a in attachments if a.get("announcement_id") == announcement_id]

        if not ann_attachments:
            return jsonify({
                "error": "No pending attachments found for this announcement.",
                "announcement_id": announcement_id
            }), 404

        # Process the first pending attachment through the extraction pipeline
        attachment = ann_attachments[0]
        raw_id = attachment.get("attachment_id")
        # Validate attachment_id safely
        if raw_id is None:
            return jsonify({"error": "Invalid attachment_id in record.", "announcement_id": announcement_id}), 400
        try:
            valid_id = int(raw_id)
        except (ValueError, TypeError):
            return jsonify({"error": f"Invalid attachment_id: '{raw_id}'.", "announcement_id": announcement_id}), 400

        # Run extraction via the pipeline's single-attachment processor
        from pdf_extractor.extractor_runner import process_single_attachment
        result = process_single_attachment(
            attachment,
            connection=conn,
            offline_mode=False
        )

        status = result.get("status", config.STATUS_FAILED)
        return jsonify({
            "announcement_id": announcement_id,
            "attachment_id": valid_id,
            "file_name": attachment.get("file_name"),
            "extraction_status": status,
            "error": result.get("error"),
            "success": status in [config.STATUS_COMPLETED, config.STATUS_NO_TEXT]
        })

    except Exception as e:
        conn.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@admin_bp.route("/api/admin/statistics", methods=["GET"])
@admin_required
def get_admin_statistics():
    """
    Returns aggregated metrics for the admin dashboard.
    Uses the schema view `vw_admin_dashboard_stats` and supplements with live counts.
    """
    stats_row = query_db(
        "SELECT * FROM vw_admin_dashboard_stats LIMIT 1",
        one=True
    ) or {}

    total = int(stats_row.get("total_announcements") or 0)
    verified = int(stats_row.get("verified_announcements") or 0)
    pending = int(stats_row.get("pending_announcements") or 0)
    rejected = int(stats_row.get("rejected_announcements") or 0)
    important = int(stats_row.get("important_announcements") or 0)
    students = int(stats_row.get("total_registered_students") or 0)
    total_scraping_runs = int(stats_row.get("total_scraping_runs") or 0)
    last_scrape = _format_datetime(stats_row.get("last_successful_scrape"))

    return jsonify({
        "total": total,
        "verified": verified,
        "review": pending,
        "needs_review": pending,
        "rejected": rejected,
        "important": important,
        "students": students,
        "total_scraping_runs": total_scraping_runs,
        "last_successful_scrape": last_scrape,
    }), 200


@admin_bp.route("/api/admin/scraping-logs", methods=["GET"])
@admin_required
def get_scraping_logs():
    """
    Retrieve scraping logs. Supports both schema fields and frontend aliases.
    """
    logs = query_db(
        """SELECT log_id, source_name, scrape_started_at, scrape_ended_at,
                  status, discovered_count, new_count, updated_count,
                  failed_count, error_message
           FROM scraping_logs
           ORDER BY scrape_started_at DESC, log_id DESC
           LIMIT 50"""
    ) or []

    result = []
    for log in logs:
        started = _format_datetime(log.get("scrape_started_at"))
        ended = _format_datetime(log.get("scrape_ended_at"))
        last_time = ended or started

        result.append({
            "id": log["log_id"],
            "log_id": log["log_id"],
            "source_name": log["source_name"],
            "status": log["status"],
            "scrape_started_at": started,
            "scrape_ended_at": ended,
            "last_run": last_time,
            "timestamp": last_time,
            "discovered": log["discovered_count"],
            "discovered_count": log["discovered_count"],
            "new": log["new_count"],
            "new_count": log["new_count"],
            "updated": log["updated_count"],
            "updated_count": log["updated_count"],
            "failed": log["failed_count"],
            "failed_count": log["failed_count"],
            "error_message": log.get("error_message")
        })

    return jsonify(result), 200
