"""
ai_routes.py - AI Insights & Interactive Q&A Endpoints
======================================================
Cybernaut Institute of Technology - Announcement System Backend

Endpoints:
- POST /api/assistant/ask: Text-based Q&A with context awareness
- POST /api/assistant/voice: Voice-based Q&A (transcribed text)
- POST /api/ai/summarize: On-demand AI summarization & key points
- GET  /api/ai/insights/<announcement_id>: Retrieve cached AI insights
"""

from flask import Blueprint, request, jsonify, g
from db import query_db, execute_db
from utils.auth_middleware import optional_login
from utils.ai_service import AIService

ai_bp = Blueprint("ai_bp", __name__)


def _get_user_id_for_logging():
    """Return logged-in user_id or a default student user_id for public/guest Q&A."""
    if g.current_user and isinstance(g.current_user, dict) and g.current_user.get("user_id"):
        return g.current_user["user_id"]
    try:
        demo_user = query_db("SELECT user_id FROM users WHERE role = 'student' LIMIT 1", one=True)
        if demo_user and isinstance(demo_user, dict) and demo_user.get("user_id"):
            return demo_user["user_id"]
    except Exception:
        pass
    return 1


@ai_bp.route("/api/assistant/ask", methods=["POST"])
@optional_login
def ask_assistant():
    """
    Interactive Q&A endpoint.
    Accepts: {"question": "...", "announcement_id": 123 (optional)}
    Returns: {"answer": "...", "found": bool}
    Logs question and response in `ai_qa_logs`.
    """
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()
    announcement_id = data.get("announcement_id")

    if not question:
        return jsonify({
            "error": "Bad Request",
            "message": "Question text is required."
        }), 400

    context_text = ""
    valid_ann_id = None

    if announcement_id:
        try:
            valid_ann_id = int(announcement_id)
            ann = query_db(
                "SELECT title, description, department, target_year, deadline_date FROM announcements WHERE id = %s",
                (valid_ann_id,),
                one=True
            )
            if ann:
                context_text = f"Title: {ann['title']}\nDescription: {ann['description']}"
                if ann.get("deadline_date"):
                    context_text += f"\nDeadline Date: {ann['deadline_date']}"
                if ann.get("department"):
                    context_text += f"\nDepartment: {ann['department']}"
                if ann.get("target_year"):
                    context_text += f"\nTarget Year: {ann['target_year']}"
        except (ValueError, TypeError):
            valid_ann_id = None

    # If no announcement context provided, search across recent verified announcements
    if not context_text:
        recent = query_db(
            """SELECT id, title, description, published_date, deadline_date
               FROM announcements
               WHERE verification_status = 'Verified'
               ORDER BY published_date DESC LIMIT 5"""
        ) or []
        context_text = "\n\n".join(
            [f"Announcement {a['id']}: {a['title']}\n{a['description']}" for a in recent]
        )

    # Generate answer using AI Service
    result = AIService.answer_question(question, context_text)
    answer = result["answer"]
    found = result.get("found", True)

    # Log into ai_qa_logs table
    user_id = _get_user_id_for_logging()
    try:
        execute_db(
            """INSERT INTO ai_qa_logs
               (user_id, announcement_id, question_text, input_mode, ai_response)
               VALUES (%s, %s, %s, %s, %s)""",
            (user_id, valid_ann_id, question, "text", answer)
        )
    except Exception:
        pass

    return jsonify({
        "answer": answer,
        "found": found,
        "question": question,
        "announcement_id": valid_ann_id
    }), 200


@ai_bp.route("/api/assistant/voice", methods=["POST"])
@optional_login
def submit_voice_query():
    """
    Submits a voice query transcribed to text by browser Speech Recognition.
    Accepts: {"text": "..."}
    Returns: {"answer": "..."}
    Logs into `ai_qa_logs` with input_mode = 'voice'.
    """
    data = request.get_json(silent=True) or {}
    transcribed_text = (data.get("text") or data.get("question") or "").strip()

    if not transcribed_text:
        return jsonify({
            "error": "Bad Request",
            "message": "Voice text query is required."
        }), 400

    # Build context from recent announcements
    recent = query_db(
        """SELECT id, title, description, published_date, deadline_date
           FROM announcements
           WHERE verification_status = 'Verified'
           ORDER BY published_date DESC LIMIT 5"""
    ) or []
    context_text = "\n\n".join(
        [f"Announcement {a['id']}: {a['title']}\n{a['description']}" for a in recent]
    )

    result = AIService.answer_question(transcribed_text, context_text)
    answer = result["answer"]

    # Log into ai_qa_logs table with input_mode='voice'
    user_id = _get_user_id_for_logging()
    try:
        execute_db(
            """INSERT INTO ai_qa_logs
               (user_id, announcement_id, question_text, input_mode, ai_response)
               VALUES (%s, %s, %s, %s, %s)""",
            (user_id, None, transcribed_text, "voice", answer)
        )
    except Exception:
        pass

    return jsonify({
        "answer": answer,
        "query": transcribed_text
    }), 200


@ai_bp.route("/api/ai/summarize", methods=["POST"])
def summarize_text():
    """
    Direct summarization endpoint for arbitrary text or announcement ID.
    Accepts: {"text": "...", "title": "..."} or {"announcement_id": 123}
    Returns: {"summary": "...", "key_points": [...], "action_required": "...", "priority_level": "..."}
    """
    data = request.get_json(silent=True) or {}
    ann_id = data.get("announcement_id")
    title = data.get("title", "")
    text = data.get("text", "")

    if ann_id:
        ann = query_db("SELECT title, description FROM announcements WHERE id = %s", (ann_id,), one=True)
        if ann:
            title = ann["title"]
            text = ann["description"]

    if not text:
        return jsonify({"error": "Bad Request", "message": "Text or announcement_id is required."}), 400

    summary_result = AIService.summarize(title, text)
    return jsonify(summary_result), 200


@ai_bp.route("/api/ai/insights/<int:announcement_id>", methods=["GET"])
def get_insights(announcement_id):
    """
    Retrieve stored or computed AI insights for an announcement.
    """
    insight = query_db(
        """SELECT insight_id, announcement_id, english_summary, tamil_summary,
                  tamil_translation, ai_suggested_category, ai_confidence_score, generated_at
           FROM ai_insights
           WHERE announcement_id = %s""",
        (announcement_id,),
        one=True
    )

    if not insight:
        # Check if announcement exists
        ann = query_db("SELECT title, description, category FROM announcements WHERE id = %s", (announcement_id,), one=True)
        if not ann:
            return jsonify({"error": "Not Found", "message": "Announcement not found."}), 404

        # Generate on the fly
        summary_result = AIService.summarize(ann["title"], ann["description"])
        tamil_result = AIService.translate_to_tamil(ann["title"], ann["description"])
        execute_db(
            """INSERT INTO ai_insights
               (announcement_id, english_summary, tamil_summary, tamil_translation, ai_suggested_category, ai_confidence_score)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON DUPLICATE KEY UPDATE english_summary = VALUES(english_summary)""",
            (announcement_id, summary_result["summary"], tamil_result["translated_text"], tamil_result["translated_text"], ann["category"], 95.0)
        )
        insight = query_db("SELECT * FROM ai_insights WHERE announcement_id = %s", (announcement_id,), one=True)

    return jsonify(insight), 200
