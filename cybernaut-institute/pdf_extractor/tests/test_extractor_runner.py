"""
Unit tests for extractor_runner.py (Phase 9 runner requirements 1-5).
"""
import pytest
from unittest.mock import patch, MagicMock

import config
import extractor_runner
from extractor_runner import (
    process_single_attachment,
    run_pipeline,
)
from pdf_parser import ExtractionResult


def test_1_process_multiple_attachments():
    """Runner Test 1: Process multiple attachments sequentially."""
    mock_conn = MagicMock()

    attachments = [
        {"attachment_id": 101, "file_name": "notice1.pdf", "file_url": "https://cit.edu/1.pdf"},
        {"attachment_id": 102, "file_name": "notice2.pdf", "file_url": "https://cit.edu/2.pdf"},
    ]

    with patch("db_handler.get_connection", return_value=mock_conn):
        with patch("db_handler.fetch_pending_attachments", return_value=attachments):
            with patch("extractor_runner.process_single_attachment") as mock_process:
                mock_process.side_effect = [
                    {"attachment_id": 101, "file_name": "notice1.pdf", "extraction_label": "SUCCESS", "pages": 1, "status": "Completed", "error": None},
                    {"attachment_id": 102, "file_name": "notice2.pdf", "extraction_label": "SUCCESS", "pages": 2, "status": "Completed", "error": None},
                ]

                stats = run_pipeline(offline=False)

                assert stats["total"] == 2
                assert stats["completed"] == 2
                assert stats["failed"] == 0
                assert mock_process.call_count == 2


def test_2_continue_after_individual_attachment_failure():
    """Runner Test 2: Pipeline continues processing subsequent items if one fails."""
    mock_conn = MagicMock()

    attachments = [
        {"attachment_id": 201, "file_name": "broken.pdf", "file_url": "https://cit.edu/broken.pdf"},
        {"attachment_id": 202, "file_name": "good.pdf", "file_url": "https://cit.edu/good.pdf"},
    ]

    with patch("db_handler.get_connection", return_value=mock_conn):
        with patch("db_handler.fetch_pending_attachments", return_value=attachments):
            with patch("extractor_runner.process_single_attachment") as mock_process:
                mock_process.side_effect = [
                    {"attachment_id": 201, "file_name": "broken.pdf", "extraction_label": "FAILED", "pages": 0, "status": "Failed", "error": "404 Not Found"},
                    {"attachment_id": 202, "file_name": "good.pdf", "extraction_label": "SUCCESS", "pages": 1, "status": "Completed", "error": None},
                ]

                stats = run_pipeline(offline=False)

                assert stats["total"] == 2
                assert stats["completed"] == 1
                assert stats["failed"] == 1
                assert mock_process.call_count == 2, "Must continue to process second item"


def test_3_accurate_processing_statistics():
    """Runner Test 3: Processing statistics accurately reflect counts for all categories."""
    mock_conn = MagicMock()

    attachments = [
        {"attachment_id": 301, "file_name": "p1.pdf", "file_url": "u1"},
        {"attachment_id": 302, "file_name": "p2.pdf", "file_url": "u2"},
        {"attachment_id": 303, "file_name": "p3.pdf", "file_url": "u3"},
        {"attachment_id": 304, "file_name": "p4.pdf", "file_url": "u4"},
    ]

    with patch("db_handler.get_connection", return_value=mock_conn):
        with patch("db_handler.fetch_pending_attachments", return_value=attachments):
            with patch("extractor_runner.process_single_attachment") as mock_process:
                mock_process.side_effect = [
                    {"attachment_id": 301, "file_name": "p1.pdf", "extraction_label": "SUCCESS", "pages": 1, "status": "Completed", "error": None},
                    {"attachment_id": 302, "file_name": "p2.pdf", "extraction_label": "SUCCESS", "pages": 2, "status": "Completed", "error": None},
                    {"attachment_id": 303, "file_name": "p3.pdf", "extraction_label": "NO TEXT", "pages": 1, "status": "No Text", "error": None},
                    {"attachment_id": 304, "file_name": "p4.pdf", "extraction_label": "FAILED", "pages": 0, "status": "Failed", "error": "Corrupt"},
                ]

                stats = run_pipeline(offline=False)

                assert stats["total"] == 4
                assert stats["completed"] == 2
                assert stats["no_text"] == 1
                assert stats["failed"] == 1


def test_4_handle_empty_pending_queue():
    """Runner Test 4: Gracefully handles an empty pending attachments queue."""
    mock_conn = MagicMock()

    with patch("db_handler.get_connection", return_value=mock_conn):
        with patch("db_handler.fetch_pending_attachments", return_value=[]):
            stats = run_pipeline(offline=False)

            assert stats["total"] == 0
            assert stats["completed"] == 0
            assert stats["no_text"] == 0
            assert stats["failed"] == 0


def test_5_handle_database_connection_failure():
    """Runner Test 5: Gracefully handles database connection failure without uncaught crash."""
    with patch("db_handler.get_connection", side_effect=Exception("Can't connect to MySQL server on 'localhost'")):
        stats = run_pipeline(offline=False)

        assert stats["total"] == 0
        assert stats["completed"] == 0
        assert stats["failed"] == 0


def test_6_offline_mode_never_calls_db_connect(capsys):
    """Test 1: offline mode never calls the DB connect function and conn is None."""
    with patch("db_handler.get_connection") as mock_connect:
        stats = run_pipeline(offline=True)

        # Ensure DB connection was never attempted
        mock_connect.assert_not_called()

        # Ensure output states that DB connection was skipped in offline mode
        captured = capsys.readouterr()
        assert "Database connection: SKIPPED (offline mode)" in captured.out
        assert stats["total"] >= 1


def test_7_invalid_attachment_id_does_not_crash_and_processes_remaining(capsys):
    """Test 2: invalid attachment_id values ('abc', None, 5.5, True, '12abc') don't crash and remaining records are processed."""
    mock_conn = MagicMock()
    invalid_ids = ["abc", None, 5.5, True, "12abc"]

    attachments = [
        {"attachment_id": bad_id, "file_name": f"bad_{i}.pdf", "file_url": f"https://cit.edu/bad_{i}.pdf"}
        for i, bad_id in enumerate(invalid_ids)
    ]
    # Add a valid record at the end
    attachments.append(
        {"attachment_id": 999, "file_name": "valid.pdf", "file_url": "https://cit.edu/valid.pdf"}
    )

    with patch("db_handler.get_connection", return_value=mock_conn):
        with patch("db_handler.fetch_pending_attachments", return_value=attachments):
            with patch("db_handler.update_attachment_status") as mock_update:
                with patch("downloader.download_or_get_pdf", return_value=("mock_path.pdf", False)):
                    with patch("pdf_parser.extract_pdf_text", return_value=ExtractionResult(text="Valid Content", page_count=1, engine="pdfplumber", has_text=True, status="Completed")):
                        stats = run_pipeline(offline=False)

                        # All 5 invalid records counted as failed + 1 valid completed = 6 total
                        assert stats["total"] == 6
                        assert stats["failed"] == 5
                        assert stats["completed"] == 1

                        # DB update was ONLY called for the valid ID 999
                        assert mock_update.call_count == 1
                        _, kwargs = mock_update.call_args
                        assert mock_update.call_args[1]["attachment_id"] == 999 or mock_update.call_args[0][1] == 999

                        captured = capsys.readouterr()
                        for bad_id in invalid_ids:
                            assert f"WARNING: Invalid attachment_id '{bad_id}'" in captured.out


def test_8_valid_attachment_ids_work():
    """Test 3: valid ids (5 and '5' and ' 5 ') still work."""
    from extractor_runner import validate_attachment_id

    # Unit checks on validate_attachment_id helper
    assert validate_attachment_id(5) == 5
    assert validate_attachment_id("5") == 5
    assert validate_attachment_id(" 5 ") == 5
    assert validate_attachment_id("abc") is None
    assert validate_attachment_id(None) is None
    assert validate_attachment_id(5.5) is None
    assert validate_attachment_id(True) is None
    assert validate_attachment_id(False) is None
    assert validate_attachment_id("12abc") is None

    # Pipeline processing with int and str valid IDs
    mock_conn = MagicMock()
    attachments = [
        {"attachment_id": 5, "file_name": "int_id.pdf", "file_url": "url1"},
        {"attachment_id": " 5 ", "file_name": "str_id.pdf", "file_url": "url2"},
    ]

    with patch("db_handler.get_connection", return_value=mock_conn):
        with patch("db_handler.fetch_pending_attachments", return_value=attachments):
            with patch("extractor_runner.process_single_attachment") as mock_process:
                mock_process.side_effect = [
                    {"attachment_id": 5, "file_name": "int_id.pdf", "extraction_label": "SUCCESS", "pages": 1, "status": "Completed", "error": None},
                    {"attachment_id": 5, "file_name": "str_id.pdf", "extraction_label": "SUCCESS", "pages": 1, "status": "Completed", "error": None},
                ]
                stats = run_pipeline(offline=False)
                # First ID 5 processed; second ID 5 is skipped as duplicate ID 5 in same run
                assert stats["total"] == 1
                assert stats["completed"] == 1
