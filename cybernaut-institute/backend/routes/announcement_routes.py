"""
announcement_routes.py - Public & Student Announcement Endpoints
================================================================
Cybernaut Institute of Technology - Announcement System Backend

Endpoints:
- GET    /api/announcements: Public/student feed with filtering, search, sorting
- GET    /api/announcements/<id>: Single announcement details
- GET    /api/announcements/<id>/versions: Historical revision versions
- GET    /api/announcements/<id>/attachments: Attachment files
- GET    /api/announcements/<id>/summary: AI-generated summary
- GET    /api/announcements/<id>/translate: Translation (Tamil/English)
- POST   /api/announcements/<id>/read: Mark announcement as read
- DELETE /api/announcements/<id>/read: Mark announcement as unread
"""

from datetime import datetime, date
from flask import Blueprint, request, jsonify, g
from db import query_db, execute_db
from utils.auth_middleware import optional_login, login_required
from utils.ai_service import AIService

announcement_bp = Blueprint("announcement_bp", __name__)


def _format_datetime(val):
    """Format datetime or date object into string."""
    if isinstance(val, (datetime, date)):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    return val


def _build_announcement_dict(row, user_id=None):
    """Format database announcement row into frontend-compatible payload."""
    ann_id = row["id"]

    # Attachments
    attachments_rows = query_db(
        """SELECT attachment_id, file_name, file_url, file_type, extraction_status
           FROM attachments WHERE announcement_id = %s""",
        (ann_id,)
    ) or []

    if isinstance(attachments_rows, dict):
        attachments_rows = [attachments_rows]

    attachments = [
        {
            "id": a.get("attachment_id", a.get("id")),
            "name": a.get("file_name", a.get("name", "attachment.pdf")),
            "url": a.get("file_url", a.get("url", "")),
            "type": a.get("file_type", a.get("type", "PDF")),
            "extraction_status": a.get("extraction_status", "Completed")
        }
        for a in attachments_rows
        if isinstance(a, dict)
    ]

    # AI Insights
    insight = query_db(
        """SELECT english_summary, tamil_summary, tamil_translation, ai_suggested_category
           FROM ai_insights WHERE announcement_id = %s LIMIT 1""",
        (ann_id,),
        one=True
    ) or {}
    if isinstance(insight, list):
        insight = insight[0] if insight else {}
    elif not isinstance(insight, dict):
        insight = {}

    # User-specific flags (read status & bookmarks)
    is_read = False
    is_bookmarked = False
    if user_id:
        r = query_db(
            "SELECT is_read FROM read_status WHERE user_id = %s AND announcement_id = %s",
            (user_id, ann_id),
            one=True
        )
        if r and r.get("is_read"):
            is_read = True

        b = query_db(
            "SELECT bookmark_id FROM bookmarks WHERE user_id = %s AND announcement_id = %s",
            (user_id, ann_id),
            one=True
        )
        if b:
            is_bookmarked = True

    pub_date = _format_datetime(row.get("published_date"))
    upd_date = _format_datetime(row.get("updated_date"))
    dead_date = _format_datetime(row.get("deadline_date"))

    return {
        "id": ann_id,
        "announcement_id": ann_id,
        "title": row["title"],
        "description": row["description"],
        "category": row.get("category", "General"),
        "department": row.get("department", "All Departments"),
        "target_year": row.get("target_year", "All Years"),
        "announcement_type": row.get("announcement_type", "Circular"),
        "published_date": pub_date,
        "date": pub_date,
        "deadline_date": dead_date,
        "updated_date": upd_date,
        "updated_at": upd_date,
        "is_updated": bool(row.get("is_updated", False)),
        "update_count": row.get("update_count", 0),
        "is_important": bool(row.get("is_important", False)),
        "source_website": row.get("source_website", ""),
        "source_url": row.get("source_url", ""),
        "verification_status": row.get("verification_status", "Verified"),
        "verification_note": row.get("verification_note", ""),
        "ai_summary": insight.get("english_summary") or "",
        "tamil_title": row.get("title", ""),
        "tamil_description": insight.get("tamil_summary") or insight.get("tamil_translation") or "",
        "attachments": attachments,
        "is_read": is_read,
        "is_bookmarked": is_bookmarked,
    }


@announcement_bp.route("/api/announcements", methods=["GET"])
@optional_login
def get_announcements_feed():
    """
    Public and student announcements feed.
    Only returns 'Verified' announcements unless requested by admin.
    Supports query parameters: category, department, year, search, sort.
    """
    user_id = g.current_user["user_id"] if g.current_user else None

    # Read query filters
    category = request.args.get("category", "").strip()
    department = request.args.get("department", "").strip()
    year = request.args.get("year", "").strip()
    search = request.args.get("search", "").strip()
    sort_by = request.args.get("sort", "newest").strip().lower()

    query_parts = ["SELECT * FROM announcements WHERE verification_status = 'Verified'"]
    params = []

    # Category filter
    if category and category.lower() not in ("all", ""):
        query_parts.append("AND LOWER(category) = LOWER(%s)")
        params.append(category)

    # Department filter
    if department and department.lower() not in ("all", "all departments", ""):
        query_parts.append("AND (LOWER(department) LIKE LOWER(%s) OR LOWER(department) = 'all' OR LOWER(department) = 'all departments')")
        params.append(f"%{department}%")

    # Academic Year filter
    if year and year.lower() not in ("all", "all years", ""):
        # Support both '3' and 'Third Year'
        year_mapping = {
            "1": "First Year",
            "2": "Second Year",
            "3": "Third Year",
            "4": "Fourth Year",
        }
        mapped_year = year_mapping.get(year, year)
        query_parts.append("AND (LOWER(target_year) LIKE LOWER(%s) OR LOWER(target_year) = 'all' OR LOWER(target_year) = 'all years')")
        params.append(f"%{mapped_year}%")

    # Full-text or substring search
    if search:
        query_parts.append("AND (LOWER(title) LIKE LOWER(%s) OR LOWER(description) LIKE LOWER(%s))")
        params.extend([f"%{search}%", f"%{search}%"])

    # Sorting
    if sort_by == "oldest":
        query_parts.append("ORDER BY published_date ASC, id ASC")
    elif sort_by == "title":
        query_parts.append("ORDER BY title ASC")
    elif sort_by == "important":
        query_parts.append("ORDER BY is_important DESC, published_date DESC, id DESC")
    else:  # newest (default)
        query_parts.append("ORDER BY published_date DESC, id DESC")

    full_sql = " ".join(query_parts)
    rows = query_db(full_sql, tuple(params)) or []

    announcements_list = [_build_announcement_dict(r, user_id) for r in rows]
    return jsonify(announcements_list), 200


@announcement_bp.route("/api/announcements/<int:announcement_id>", methods=["GET"])
@optional_login
def get_announcement_detail(announcement_id):
    """
    Retrieve single announcement details by ID.
    """
    user_id = g.current_user["user_id"] if g.current_user else None
    row = query_db(
        "SELECT * FROM announcements WHERE id = %s LIMIT 1",
        (announcement_id,),
        one=True
    )

    if not row:
        return jsonify({
            "error": "Not Found",
            "message": f"Announcement with ID {announcement_id} not found."
        }), 404

    # Check if student/guest can view unverified
    role = g.current_user.get("role", "") if g.current_user else ""
    if row["verification_status"] != "Verified" and role not in ("admin", "administrator"):
        return jsonify({
            "error": "Forbidden",
            "message": "This announcement is awaiting administrative verification."
        }), 403

    payload = _build_announcement_dict(row, user_id)
    return jsonify(payload), 200


@announcement_bp.route("/api/announcements/<int:announcement_id>/versions", methods=["GET"])
def get_announcement_versions(announcement_id):
    """
    Retrieve revision history from announcement_versions table.
    """
    versions = query_db(
        """SELECT version_id, announcement_id, previous_title, previous_description, changed_at
           FROM announcement_versions
           WHERE announcement_id = %s
           ORDER BY changed_at DESC""",
        (announcement_id,)
    ) or []

    for v in versions:
        v["changed_at"] = _format_datetime(v["changed_at"])

    return jsonify(versions), 200


@announcement_bp.route("/api/announcements/<int:announcement_id>/attachments", methods=["GET"])
def get_announcement_attachments(announcement_id):
    """
    Retrieve list of attachment files for an announcement.
    """
    attachments = query_db(
        """SELECT attachment_id, announcement_id, file_name, file_url, file_type,
                  extracted_text, extraction_status, extracted_at
           FROM attachments
           WHERE announcement_id = %s""",
        (announcement_id,)
    ) or []

    for a in attachments:
        a["extracted_at"] = _format_datetime(a.get("extracted_at"))

    return jsonify(attachments), 200


@announcement_bp.route("/api/announcements/<int:announcement_id>/summary", methods=["GET"])
def get_announcement_summary(announcement_id):
    """
    Get AI-generated summary for an announcement.
    Returns existing summary from ai_insights or generates one dynamically.
    """
    announcement = query_db(
        "SELECT id, title, description FROM announcements WHERE id = %s",
        (announcement_id,),
        one=True
    )

    if not announcement:
        return jsonify({
            "error": "Not Found",
            "message": "Announcement not found."
        }), 404

    insight = query_db(
        "SELECT english_summary FROM ai_insights WHERE announcement_id = %s",
        (announcement_id,),
        one=True
    )

    if insight and insight.get("english_summary"):
        return jsonify({"summary": insight["english_summary"]}), 200

    # Generate via AI Service
    ai_data = AIService.summarize(announcement["title"], announcement["description"])
    summary_text = ai_data["summary"]

    # Cache into ai_insights
    try:
        execute_db(
            """INSERT INTO ai_insights (announcement_id, english_summary, ai_confidence_score)
               VALUES (%s, %s, %s)
               ON DUPLICATE KEY UPDATE english_summary = VALUES(english_summary)""",
            (announcement_id, summary_text, 95.0)
        )
    except Exception:
        pass

    return jsonify({"summary": summary_text}), 200


@announcement_bp.route("/api/announcements/<int:announcement_id>/translate", methods=["GET"])
def translate_announcement(announcement_id):
    """
    Translate announcement into Tamil or English.
    """
    lang = request.args.get("lang", "ta").strip().lower()

    announcement = query_db(
        "SELECT id, title, description FROM announcements WHERE id = %s",
        (announcement_id,),
        one=True
    )

    if not announcement:
        return jsonify({
            "error": "Not Found",
            "message": "Announcement not found."
        }), 404

    if lang in ("en", "english"):
        return jsonify({
            "translated_text": f"{announcement['title']}\n\n{announcement['description']}",
            "language": "en"
        }), 200

    # Check database cache
    insight = query_db(
        "SELECT tamil_translation, tamil_summary FROM ai_insights WHERE announcement_id = %s",
        (announcement_id,),
        one=True
    )

    if insight and (insight.get("tamil_translation") or insight.get("tamil_summary")):
        text = insight.get("tamil_translation") or insight.get("tamil_summary")
        return jsonify({
            "translated_text": text,
            "language": "ta"
        }), 200

    # Generate Tamil translation
    result = AIService.translate_to_tamil(announcement["title"], announcement["description"])
    translated_text = result["translated_text"]

    # Cache into ai_insights
    try:
        execute_db(
            """INSERT INTO ai_insights (announcement_id, tamil_translation, tamil_summary, ai_confidence_score)
               VALUES (%s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE tamil_translation = VALUES(tamil_translation), tamil_summary = VALUES(tamil_summary)""",
            (announcement_id, translated_text, translated_text, 92.0)
        )
    except Exception:
        pass

    return jsonify({
        "translated_text": translated_text,
        "language": "ta"
    }), 200


@announcement_bp.route("/api/announcements/<int:announcement_id>/read", methods=["POST"])
@login_required
def mark_announcement_read(announcement_id):
    """
    Record that current user has read this announcement.
    """
    user_id = g.current_user["user_id"]

    execute_db(
        """INSERT INTO read_status (user_id, announcement_id, is_read, read_at)
           VALUES (%s, %s, TRUE, NOW())
           ON DUPLICATE KEY UPDATE is_read = TRUE, read_at = NOW()""",
        (user_id, announcement_id)
    )

    return jsonify({
        "message": "Announcement marked as read.",
        "announcement_id": announcement_id,
        "is_read": True
    }), 200


@announcement_bp.route("/api/announcements/<int:announcement_id>/read", methods=["DELETE"])
@login_required
def mark_announcement_unread(announcement_id):
    """
    Mark announcement as unread for current user.
    """
    user_id = g.current_user["user_id"]

    execute_db(
        """UPDATE read_status SET is_read = FALSE
           WHERE user_id = %s AND announcement_id = %s""",
        (user_id, announcement_id)
    )

    return jsonify({
        "message": "Announcement marked as unread.",
        "announcement_id": announcement_id,
        "is_read": False
    }), 200
