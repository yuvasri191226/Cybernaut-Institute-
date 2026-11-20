"""
app.py - Cybernaut Institute Announcement Backend Entry Point
============================================================
AI-Powered College Announcement Monitoring System - Member 5 Backend

Features:
- Flask REST API Factory (`create_app`)
- Flask-CORS enabled for cross-origin frontend communication
- Blueprints for Auth, Announcements, Admin, User actions & AI
- Contextual error handling and clean JSON responses
- Teardown database connection management
- Health check & database connection probe
"""

import os
import sys

# Ensure backend root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from db import close_db, test_connection

# Import Blueprints
from routes.auth_routes import auth_bp
from routes.announcement_routes import announcement_bp
from routes.admin_routes import admin_bp
from routes.user_routes import user_bp
from routes.ai_routes import ai_bp


def create_app(config_class=Config) -> Flask:
    """Application factory for Flask REST API server."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable Cross-Origin Resource Sharing (CORS) for all frontend origins
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Register Database teardown hook
    app.teardown_appcontext(close_db)

    # Register Route Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(announcement_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(ai_bp)

    # ──────────────────────────────────────────────────────────────────────────
    # Health & System Status Endpoints
    # ──────────────────────────────────────────────────────────────────────────

    @app.route("/", methods=["GET"])
    def root():
        """Root API welcome & system identity."""
        return jsonify({
            "system": "AI-Powered College Announcement Monitoring System",
            "institution": "Cybernaut Institute of Technology",
            "version": "1.0.0",
            "status": "online",
            "endpoints": {
                "health": "/api/health",
                "announcements": "/api/announcements",
                "login": "/api/login",
                "docs": "/api/docs"
            }
        }), 200

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Check system and database health."""
        db_connected, db_message = test_connection()
        status_code = 200 if db_connected else 503
        return jsonify({
            "status": "healthy" if db_connected else "degraded",
            "database": {
                "connected": db_connected,
                "message": db_message,
                "database_name": Config.DB_NAME,
                "host": Config.DB_HOST,
                "port": Config.DB_PORT
            },
            "timestamp": os.getenv("CURRENT_TIME", "")
        }), status_code

    # ──────────────────────────────────────────────────────────────────────────
    # Standardized Error Handlers (JSON responses for api.js compatibility)
    # ──────────────────────────────────────────────────────────────────────────

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "error": "Bad Request",
            "message": getattr(error, "description", "The request body or parameters were invalid.")
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            "error": "Unauthorized",
            "message": getattr(error, "description", "Authentication required. Please log in.")
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            "error": "Forbidden",
            "message": getattr(error, "description", "You do not have permission to perform this action.")
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Not Found",
            "message": getattr(error, "description", "The requested endpoint or resource was not found.")
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "error": "Method Not Allowed",
            "message": "The HTTP method is not allowed for this route."
        }), 405

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected error occurred on the server."
        }), 500

    return app


if __name__ == "__main__":
    app = create_app()
    print("=" * 70)
    print(" CYBERNAUT INSTITUTE OF TECHNOLOGY - ANNOUNCEMENT REST API BACKEND")
    print(f" Server running at: http://localhost:{Config.PORT}")
    print(f" Database Target:  {Config.DB_NAME} on {Config.DB_HOST}:{Config.DB_PORT}")
    print("=" * 70)
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
