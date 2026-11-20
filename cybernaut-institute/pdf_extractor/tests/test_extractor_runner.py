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
