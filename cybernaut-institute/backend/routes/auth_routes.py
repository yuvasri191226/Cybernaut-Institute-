"""
auth_routes.py - Authentication Endpoints
=========================================
Cybernaut Institute of Technology - Announcement System Backend

Endpoints:
- POST /api/login: User login (students & admins), returns JWT token
- POST /api/logout: Session invalidation
- GET  /api/me: Current user profile verification
"""

from flask import Blueprint, request, jsonify, g
from werkzeug.security import check_password_hash
from db import query_db, execute_db
from utils.auth_middleware import generate_token, login_required

auth_bp = Blueprint("auth_bp", __name__)


@auth_bp.route("/api/login", methods=["POST"])
def login():
    """
    Authenticate student or administrator with email/register_number and password.
    Returns signed JWT token and user profile.
    """
    data = request.get_json(silent=True) or {}
    # Support username, email, or register_number
    identifier = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({
            "error": "Bad Request",
            "message": "Both username/email and password are required."
        }), 400

    # Look up user by email or register_number
    user = query_db(
        """SELECT user_id, register_number, full_name, email, password_hash,
                  role, department, academic_year, preferred_language, is_active
           FROM users
           WHERE email = %s OR register_number = %s
           LIMIT 1""",
        (identifier, identifier),
        one=True
    )

    if not user:
        return jsonify({
            "error": "Unauthorized",
            "message": "Invalid username or password. Please check your credentials."
        }), 401

    if not user.get("is_active"):
        return jsonify({
            "error": "Forbidden",
            "message": "Your account has been deactivated. Please contact the administrator."
        }), 403

    # Verify Werkzeug password hash
    if not check_password_hash(user["password_hash"], password):
        return jsonify({
            "error": "Unauthorized",
            "message": "Invalid username or password. Please check your credentials."
        }), 401

    # Record last login timestamp
    try:
        execute_db(
            "UPDATE users SET last_login = NOW() WHERE user_id = %s",
            (user["user_id"],)
        )
    except Exception:
        pass  # Non-critical if timestamp update fails

    # Generate token
    token = generate_token(user)

    user_payload = {
        "id": user["user_id"],
        "user_id": user["user_id"],
        "register_number": user["register_number"],
        "name": user["full_name"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"],
        "department": user["department"],
        "academic_year": user["academic_year"],
        "preferred_language": user["preferred_language"],
    }

    return jsonify({
        "message": "Login successful",
        "token": token,
        "role": user["role"],
        "user": user_payload
    }), 200


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    """
    Log out the current user and invalidate session on client.
    """
    return jsonify({
        "message": "Successfully logged out.",
        "success": True
    }), 200


@auth_bp.route("/api/me", methods=["GET"])
@login_required
def get_me():
    """
    Fetch the currently logged in user profile.
    """
    user = g.current_user
    return jsonify({
        "id": user["user_id"],
        "user_id": user["user_id"],
        "register_number": user["register_number"],
        "name": user["full_name"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"],
        "department": user["department"],
        "academic_year": user["academic_year"],
        "preferred_language": user["preferred_language"],
    }), 200
