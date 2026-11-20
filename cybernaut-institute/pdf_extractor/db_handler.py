"""
MySQL Database Handler for PDF Text Extraction (Member 7).
Adheres strictly to database/schema.sql.
Reads pending attachments and writes extracted_text, extraction_status, and extracted_at.
"""
from typing import List, Dict, Any, Optional
import pymysql
from pymysql.cursors import DictCursor

try:
    from . import config
except ImportError:
    import config


class DatabaseError(Exception):
    """Base exception for database operations."""
    pass


def get_connection(db_config: Optional[Dict[str, Any]] = None) -> pymysql.Connection:
    """
    Creates and returns a connection to MySQL using utf8mb4 charset and DictCursor.
    """
    cfg = db_config or config.DB_CONFIG
    try:
        conn = pymysql.connect(
            host=cfg.get("host", "localhost"),
            port=int(cfg.get("port", 3306)),
            user=cfg.get("user", "root"),
            password=cfg.get("password", ""),
            database=cfg.get("database", "college_announcements_db"),
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=False,
        )
        return conn
    except pymysql.MySQLError as e:
        raise DatabaseError(f"Failed to connect to MySQL database '{cfg.get('database')}': {e}")


def test_connection(connection: Optional[pymysql.Connection] = None) -> bool:
    """Tests if database connection is active."""
    should_close = False
    conn = connection
    try:
        if conn is None:
            conn = get_connection()
            should_close = True
        with conn.cursor() as cur:
            cur.execute("SELECT 1 AS check_val")
            row = cur.fetchone()
            return row is not None and row.get("check_val") == 1
    except Exception:
        return False
    finally:
        if should_close and conn:
            conn.close()


def fetch_pending_attachments(
    connection: pymysql.Connection,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Fetches pending PDF attachments from the attachments table.
    Filters by extraction_status = 'Pending' and file_type / extension.
    Uses parameterized SQL and proper UTF-8 handling.
    """
    query = """
        SELECT
            attachment_id,
            announcement_id,
            file_name,
            file_url,
            file_type,
            extraction_status
        FROM attachments
        WHERE extraction_status = %s
          AND (
            UPPER(COALESCE(file_type, '')) = 'PDF'
            OR LOWER(file_name) LIKE %s
            OR LOWER(file_url) LIKE %s
          )
        ORDER BY attachment_id ASC
    """
    params: List[Any] = [config.STATUS_PENDING, "%.pdf", "%.pdf"]

    if limit is not None and limit > 0:
        query += " LIMIT %s"
        params.append(int(limit))

    try:
        with connection.cursor() as cur:
            cur.execute(query, tuple(params))
            records = cur.fetchall()
            return list(records)
    except pymysql.MySQLError as e:
        raise DatabaseError(f"Error fetching pending attachments: {e}")


def update_attachment_status(
    connection: pymysql.Connection,
    attachment_id: int,
    status: str,
    extracted_text: Optional[str] = None
) -> bool:
    """
    Updates the attachment record with extraction results:
    - extraction_status: 'Completed', 'No Text', or 'Failed'
    - extracted_text: cleaned text for Completed; NULL for No Text and Failed
    - extracted_at: NOW()

    Uses parameterized queries, commits transaction on success,
    rolls back on error.
    """
    if status not in config.VALID_STATUSES:
        raise ValueError(
            f"Invalid status '{status}'. Must be one of: {config.VALID_STATUSES}"
        )

    # For Completed: store text. For No Text or Failed: store NULL
    text_to_save: Optional[str] = None
    if status == config.STATUS_COMPLETED and extracted_text:
        text_to_save = extracted_text

    query = """
        UPDATE attachments
        SET
            extraction_status = %s,
            extracted_text = %s,
            extracted_at = NOW()
        WHERE attachment_id = %s
    """
    params = (status, text_to_save, attachment_id)

    try:
        with connection.cursor() as cur:
            rows_affected = cur.execute(query, params)
        connection.commit()
        return bool(rows_affected)
    except pymysql.MySQLError as e:
        connection.rollback()
        raise DatabaseError(
            f"Failed to update attachment ID {attachment_id} to status '{status}': {e}"
        )
