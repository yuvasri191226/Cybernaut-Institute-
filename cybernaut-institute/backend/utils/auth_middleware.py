"""
auth_middleware.py - JWT Authentication & Role-Based Access Control
===================================================================
Cybernaut Institute of Technology - Announcement System Backend

Provides JWT creation, verification, and route decorators for:
- @login_required: Any authenticated active user (student or admin)
- @admin_required: Authenticated users with admin role
- @optional_login: Populates g.current_user if token is present, continues otherwise
"""

from functools import wraps
from datetime import datetime, timezone
import jwt
from flask import request, jsonify, g
from config import Config
from db import query_db


def generate_token(user: dict) -> str:
    """
    Generate a signed JWT token containing user identity and role.

    :param user: Dictionary with user data (user_id, email, role, etc.)
    :return: Encoded JWT string
    """
    now = datetime.now(timezone.utc)
    exp = now + Config.JWT_ACCESS_TOKEN_EXPIRES

    payload = {
        "user_id": user["user_id"],
        "email": user["email"],
        "role": user["role"],
        "full_name": user.get("full_name", ""),
        "department": user.get("department", "All"),
        "academic_year": user.get("academic_year", "All"),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }

    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    """
    Verify and decode a JWT token.

    :param token: JWT token string
    :return: Payload dictionary
    :raises: jwt.ExpiredSignatureError or jwt.InvalidTokenError
    """
    return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])


def extract_token_from_header() -> str:
    """Extract Bearer token from HTTP Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header:
        return ""
    parts = auth_header.split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return ""


def login_required(f):
    """
    Decorator requiring a valid JWT authentication token.
    Populates g.current_user with the user's database record.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = extract_token_from_header()
        if not token:
            return jsonify({
                "error": "Unauthorized",
                "message": "Authentication token is missing. Please log in."
            }), 401

        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({
                "error": "Unauthorized",
                "message": "Your session has expired. Please log in again."
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                "error": "Unauthorized",
                "message": "Invalid authentication token. Please log in again."
            }), 401

        # Retrieve current user record from database
        user = query_db(
            """SELECT user_id, register_number, full_name, email, role,
                      department, academic_year, preferred_language, is_active
               FROM users WHERE user_id = %s""",
            (payload.get("user_id"),),
            one=True
        )

        if not user or not user.get("is_active"):
            return jsonify({
                "error": "Unauthorized",
                "message": "User account not found or has been deactivated."
            }), 401

        g.current_user = user
        return f(*args, **kwargs)

    return decorated_function


def admin_required(f):
    """
    Decorator requiring that the user is authenticated AND holds the 'admin' role.
    """
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        role = g.current_user.get("role", "").lower()
        if role not in ("admin", "administrator"):
            return jsonify({
                "error": "Forbidden",
                "message": "Access denied: this action requires administrator privileges."
            }), 403
        return f(*args, **kwargs)

    return decorated_function


def optional_login(f):
    """
    Decorator that checks for an authentication token if provided.
    If valid, sets g.current_user. If missing or invalid, sets g.current_user = None.
    Allows public or student endpoints to optionally personalize responses.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        g.current_user = None
        token = extract_token_from_header()
        if token:
            try:
                payload = decode_token(token)
                user = query_db(
                    """SELECT user_id, register_number, full_name, email, role,
                              department, academic_year, preferred_language, is_active
                       FROM users WHERE user_id = %s""",
                    (payload.get("user_id"),),
                    one=True
                )
                if user and user.get("is_active"):
                    g.current_user = user
            except Exception:
                g.current_user = None

        return f(*args, **kwargs)

    return decorated_function
