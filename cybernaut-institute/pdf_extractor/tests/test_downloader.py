"""
Unit tests for downloader.py (Phase 9 download scenarios 1-8).
"""
import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock
import requests

import config
import downloader
from downloader import (
    download_or_get_pdf,
    cleanup_temp_file,
    DownloadError,
    MaxFileSizeExceededError,
    InvalidPDFSignatureError,
    SSRFSecurityError,
    is_safe_ip,
    validate_remote_url,
)


def test_1_valid_remote_pdf_download():
    """Download Scenario 1: Valid remote PDF download."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.is_redirect = False
    mock_resp.is_permanent_redirect = False
    # Valid PDF magic bytes followed by minimal PDF body
    mock_resp.iter_content.return_value = [b"%PDF-1.4\n%mock content\n%%EOF"]

    with patch("downloader.validate_remote_url", return_value="https://example.com/notice.pdf"):
        with patch.object(requests.Session, "get", return_value=mock_resp):
            file_path, is_temp = download_or_get_pdf("https://example.com/notice.pdf")

            assert is_temp is True
            assert os.path.exists(file_path)
            with open(file_path, "rb") as f:
                content = f.read()
                assert content.startswith(b"%PDF-")
            cleanup_temp_file(file_path)
            assert not os.path.exists(file_path)


def test_2_http_404_response():
    """Download Scenario 2: HTTP 404 response handling."""
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_resp.is_redirect = False
    mock_resp.is_permanent_redirect = False
    http_err = requests.exceptions.HTTPError(response=mock_resp)
    mock_resp.raise_for_status.side_effect = http_err

    with patch("downloader.validate_remote_url", return_value="https://example.com/notfound.pdf"):
        with patch.object(requests.Session, "get", return_value=mock_resp):
            with pytest.raises(DownloadError) as exc_info:
                download_or_get_pdf("https://example.com/notfound.pdf")
            assert "404" in str(exc_info.value)


def test_3_connection_timeout():
    """Download Scenario 3: Connection / download timeout."""
    with patch("downloader.validate_remote_url", return_value="https://example.com/timeout.pdf"):
        with patch.object(requests.Session, "get", side_effect=requests.exceptions.Timeout("Connection timed out")):
            with pytest.raises(DownloadError) as exc_info:
                download_or_get_pdf("https://example.com/timeout.pdf")
            assert "timed out" in str(exc_info.value).lower()


def test_4_invalid_file_format():
    """Download Scenario 4: Content does not have %PDF- signature (e.g. HTML 404 or image)."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.is_redirect = False
    mock_resp.is_permanent_redirect = False
    # Return HTML instead of PDF
    mock_resp.iter_content.return_value = [b"<!DOCTYPE html><html><body>Not a PDF</body></html>"]

    with patch("downloader.validate_remote_url", return_value="https://example.com/bad.pdf"):
        with patch.object(requests.Session, "get", return_value=mock_resp):
            with pytest.raises(InvalidPDFSignatureError):
                download_or_get_pdf("https://example.com/bad.pdf")


def test_5_file_exceeding_max_size(monkeypatch):
    """Download Scenario 5: File exceeding configured maximum size."""
    # Temporarily set max size to 1 MB for testing
    monkeypatch.setattr(config, "MAX_FILE_SIZE_BYTES", 1024 * 10)  # 10 KB limit
    monkeypatch.setattr(config, "MAX_FILE_SIZE_MB", 0.01)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.is_redirect = False
    mock_resp.is_permanent_redirect = False
    # Stream chunks totaling 20 KB (> 10 KB limit)
    mock_resp.iter_content.return_value = [b"%PDF-"] + [b"X" * 8192] * 3

    with patch("downloader.validate_remote_url", return_value="https://example.com/large.pdf"):
        with patch.object(requests.Session, "get", return_value=mock_resp):
            with pytest.raises(MaxFileSizeExceededError):
                download_or_get_pdf("https://example.com/large.pdf")


def test_6_interrupted_download():
    """Download Scenario 6: Network interrupted during chunk streaming."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.is_redirect = False
    mock_resp.is_permanent_redirect = False

    def generator_error(*args, **kwargs):
        yield b"%PDF-1.4 header"
        raise requests.exceptions.ChunkedEncodingError("Connection reset by peer")

    mock_resp.iter_content.side_effect = generator_error

    with patch("downloader.validate_remote_url", return_value="https://example.com/stream.pdf"):
        with patch.object(requests.Session, "get", return_value=mock_resp):
            with pytest.raises(DownloadError) as exc_info:
                download_or_get_pdf("https://example.com/stream.pdf")
            assert "network error" in str(exc_info.value).lower() or "reset" in str(exc_info.value).lower()


def test_7_local_sample_pdf_access(english_pdf_path):
    """Download Scenario 7: Local sample PDF access via path or file:// URL."""
    # 1. Direct path
    local_path, is_temp = download_or_get_pdf(english_pdf_path)
    assert is_temp is False
    assert os.path.isabs(local_path)
    assert os.path.exists(local_path)

    # 2. file:// URL
    file_url = f"file:///{os.path.abspath(english_pdf_path).replace(os.sep, '/')}"
    url_path, url_temp = download_or_get_pdf(file_url)
    assert url_temp is False
    assert os.path.exists(url_path)


def test_8_redirect_to_prohibited_destination():
    """Download Scenario 8: SSRF Protection rejecting localhost, private network, and loopback."""
    # 1. Direct private IPs
    assert not is_safe_ip("127.0.0.1")
    assert not is_safe_ip("10.0.0.1")
    assert not is_safe_ip("192.168.1.100")
    assert not is_safe_ip("172.16.0.1")
    assert not is_safe_ip("169.254.169.254")  # AWS/Cloud metadata service
    assert not is_safe_ip("::1")

    # 2. Public IP is safe
    assert is_safe_ip("93.184.216.34")  # example.com

    # 3. validate_remote_url rejecting localhost
    with patch("socket.getaddrinfo", return_value=[(None, None, None, None, ("127.0.0.1", 80))]):
        with pytest.raises(SSRFSecurityError) as exc_info:
            validate_remote_url("http://localhost/secret.pdf", allow_private=False)
        assert "restricted ip" in str(exc_info.value).lower() or "ssrf" in str(exc_info.value).lower()

    # 4. validate_remote_url rejecting private IP
    with patch("socket.getaddrinfo", return_value=[(None, None, None, None, ("192.168.1.50", 80))]):
        with pytest.raises(SSRFSecurityError):
            validate_remote_url("https://internal.lan/notice.pdf", allow_private=False)
