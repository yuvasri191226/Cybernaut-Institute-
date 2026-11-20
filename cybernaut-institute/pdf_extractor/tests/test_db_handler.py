"""
Unit tests for db_handler.py (Phase 9 database requirements 1-6).
Uses mocks to avoid requiring a running MySQL server.
"""
import pytest
from unittest.mock import MagicMock, patch
import pymysql

import config
import db_handler
from db_handler import (
    get_connection,
    fetch_pending_attachments,
    update_attachment_status,
    test_connection as check_db_connection,
    DatabaseError,
)


def test_0_db_connection_success():
    """Verify check_db_connection returns True on active connection."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {"check_val": 1}
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    assert check_db_connection(mock_conn) is True


def test_1_fetch_only_pending_pdf_attachments():
    """Database Test 1: Fetch only records with extraction_status = 'Pending'."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    mock_cursor.fetchall.return_value = [
        {
            "attachment_id": 3,
            "announcement_id": 3,
            "file_name": "tech_day_hackathon_guidelines.pdf",
            "file_url": "https://studentaffairs.cybernaut.edu.in/files/tech_day_hackathon_guidelines.pdf",
            "file_type": "PDF",
            "extraction_status": "Pending",
        }
    ]

    results = fetch_pending_attachments(mock_conn, limit=10)

    # Verify query was executed with 'Pending' parameter
    mock_cursor.execute.assert_called_once()
    sql_called, params_called = mock_cursor.execute.call_args[0]
    assert "extraction_status = %s" in sql_called
    assert "Pending" in params_called
    assert len(results) == 1
    assert results[0]["attachment_id"] == 3
    assert results[0]["extraction_status"] == "Pending"


def test_2_verify_completed_status_update():
    """Database Test 2: Verify Completed status update saves text and timestamp."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.execute.return_value = 1
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    success = update_attachment_status(
        connection=mock_conn,
        attachment_id=1,
        status="Completed",
        extracted_text="Exam timetable text content.",
    )

    assert success is True
    mock_cursor.execute.assert_called_once()
    sql, params = mock_cursor.execute.call_args[0]
    assert "UPDATE attachments" in sql
    assert "extraction_status = %s" in sql
    assert "extracted_text = %s" in sql
    assert "extracted_at = NOW()" in sql
    assert params == ("Completed", "Exam timetable text content.", 1)
    mock_conn.commit.assert_called_once()


def test_3_verify_no_text_status_update():
    """Database Test 3: Verify No Text status update sets extraction_status='No Text' and text=NULL."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.execute.return_value = 1
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    success = update_attachment_status(
        connection=mock_conn,
        attachment_id=3,
        status="No Text",
        extracted_text=None,
    )

    assert success is True
    sql, params = mock_cursor.execute.call_args[0]
    assert params == ("No Text", None, 3)
    mock_conn.commit.assert_called_once()


def test_4_verify_failed_status_update():
    """Database Test 4: Verify Failed status update sets extraction_status='Failed'."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.execute.return_value = 1
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    success = update_attachment_status(
        connection=mock_conn,
        attachment_id=4,
        status="Failed",
        extracted_text=None,
    )

    assert success is True
    sql, params = mock_cursor.execute.call_args[0]
    assert params == ("Failed", None, 4)
    mock_conn.commit.assert_called_once()


def test_5_verify_tamil_unicode_text_handling():
    """Database Test 5: Verify Tamil Unicode text handling in parameters without corruption."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.execute.return_value = 1
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    tamil_text = "சைபர்நாட் இன்ஸ்டிடியூட் ஆப் டெக்னாலஜி தேர்வு அறிவிப்பு 2026."
    update_attachment_status(
        connection=mock_conn,
        attachment_id=2,
        status="Completed",
        extracted_text=tamil_text,
    )

    sql, params = mock_cursor.execute.call_args[0]
    assert params[0] == "Completed"
    assert params[1] == tamil_text
    assert "சைபர்நாட்" in params[1]
    mock_conn.commit.assert_called_once()


def test_6_verify_sql_parameterization():
    """Database Test 6: Verify SQL parameterization to prevent SQL injection."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.execute.return_value = 1
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    # Malicious injection attempt in extracted text and status
    malicious_text = "'); DROP TABLE attachments; --"
    update_attachment_status(
        connection=mock_conn,
        attachment_id=5,
        status="Completed",
        extracted_text=malicious_text,
    )

    sql, params = mock_cursor.execute.call_args[0]
    # Check that placeholders (%s) are used and string concatenation was NOT performed
    assert "%s" in sql
    assert malicious_text not in sql
    assert params[1] == malicious_text

    # Invalid status should be rejected immediately before query
    with pytest.raises(ValueError) as exc:
        update_attachment_status(mock_conn, 5, "Hacked'; --", "some text")
    assert "Invalid status" in str(exc.value)


def test_database_rollback_on_error():
    """Verify rollback on database update error."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.execute.side_effect = pymysql.MySQLError("Deadlock or DB disconnect")
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with pytest.raises(DatabaseError):
        update_attachment_status(mock_conn, 1, "Completed", "test text")

    mock_conn.rollback.assert_called_once()
