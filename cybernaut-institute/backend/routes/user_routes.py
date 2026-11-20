"""
user_routes.py - Bookmarks & Notifications Endpoints
====================================================
Cybernaut Institute of Technology - Announcement System Backend

Endpoints:
- GET    /api/bookmarks: Retrieve user's bookmarked announcements
- POST   /api/bookmarks: Bookmark an announcement
- DELETE /api/bookmarks/<id>: Remove bookmark (by bookmark_id or announcement_id)
- GET    /api/notifications: Retrieve user's notifications inbox
- POST   /api/notifications/<id>/read: Mark a notification as read
- POST   /api/notifications/mark-all-read: Mark all notifications as read
"""

from flask import Blueprint, request, jsonify, g
from db import query_db, execute_db
from utils.auth_middleware import login_required
from routes.announcement_routes import _build_announcement_dict, _format_datetime

user_bp = Blueprint("user_bp", __name__)


# ============================================================================
# BOOKMARKS
# ============================================================================

@user_bp.route("/api/bookmarks", methods=["GET"])
@login_required
def get_user_bookmarks():
    """
    Retrieve all announcements bookmarked by the currently logged-in user.
    """
    user_id = g.current_user["user_id"]

    rows = query_db(
        """SELECT b.bookmark_id, b.saved_at, a.*
           FROM bookmarks b
           JOIN announcements a ON b.announcement_id = a.id
           WHERE b.user_id = %s
           ORDER BY b.saved_at DESC""",
        (user_id,)
    ) or []

    result = []
    for r in rows:
        formatted = _build_announcement_dict(r, user_id)
        formatted["bookmark_id"] = r["bookmark_id"]
        formatted["saved_at"] = _format_datetime(r["saved_at"])
        result.append(formatted)

    return jsonify(result), 200


@user_bp.route("/api/bookmarks", methods=["POST"])
@login_required
def add_user_bookmark():
    """
    Bookmark an announcement for the current user.
    Body: {"announcement_id": 123}
    """
    user_id = g.current_user["user_id"]
    data = request.get_json(silent=True) or {}
    announcement_id = data.get("announcement_id")

    if not announcement_id:
        return jsonify({"error": "Bad Request", "message": "announcement_id is required."}), 400

    # Verify announcement exists
    exists = query_db("SELECT id FROM announcements WHERE id = %s", (announcement_id,), one=True)
    if not exists:
        return jsonify({"error": "Not Found", "message": "Announcement not found."}), 404

    execute_db(
        """INSERT IGNORE INTO bookmarks (user_id, announcement_id)
           VALUES (%s, %s)""",
        (user_id, announcement_id)
    )

    return jsonify({
        "message": "Announcement bookmarked successfully.",
        "announcement_id": announcement_id,
        "is_bookmarked": True
    }), 201


@user_bp.route("/api/bookmarks/<int:identifier>", methods=["DELETE"])
@login_required
def delete_user_bookmark(identifier):
    """
    Remove a bookmark for the current user.
    Accepts either bookmark_id or announcement_id as identifier.
    """
    user_id = g.current_user["user_id"]

    execute_db(
        """DELETE FROM bookmarks
           WHERE user_id = %s AND (bookmark_id = %s OR announcement_id = %s)""",
        (user_id, identifier, identifier)
    )

    return jsonify({
        "message": "Bookmark removed successfully.",
        "id": identifier,
        "success": True
    }), 200


# ============================================================================
# NOTIFICATIONS
# ============================================================================

@user_bp.route("/api/notifications", methods=["GET"])
@login_required
def get_user_notifications():
    """
    Retrieve user notification inbox.
    """
    user_id = g.current_user["user_id"]

    rows = query_db(
        """SELECT notification_id, user_id, announcement_id, title, message,
                  notification_type, is_read, created_at
           FROM notifications
           WHERE user_id = %s
           ORDER BY created_at DESC
           LIMIT 50""",
        (user_id,)
    ) or []

    notifications = []
    for r in rows:
        created = _format_datetime(r["created_at"])
        notifications.append({
            "id": r["notification_id"],
            "notification_id": r["notification_id"],
            "title": r["title"],
            "message": r["message"],
            "type": r["notification_type"],
            "notification_type": r["notification_type"],
            "is_read": bool(r["is_read"]),
            "date": created,
            "created_at": created,
            "announcement_id": r.get("announcement_id")
        })

    return jsonify(notifications), 200


@user_bp.route("/api/notifications/<int:notification_id>/read", methods=["POST"])
@login_required
def mark_single_notification_read(notification_id):
    """
    Mark a single notification as read.
    """
    user_id = g.current_user["user_id"]

    execute_db(
        """UPDATE notifications
           SET is_read = TRUE
           WHERE notification_id = %s AND user_id = %s""",
        (notification_id, user_id)
    )

    return jsonify({
        "message": "Notification marked as read.",
        "id": notification_id,
        "is_read": True
    }), 200


@user_bp.route("/api/notifications/mark-all-read", methods=["POST"])
@login_required
def mark_all_notifications_read():
    """
    Mark all notifications as read for current user.
    """
    user_id = g.current_user["user_id"]

    execute_db(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = %s",
        (user_id,)
    )

    return jsonify({
        "message": "All notifications marked as read.",
        "success": True
    }), 200
