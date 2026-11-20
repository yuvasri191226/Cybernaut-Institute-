"""
Unit tests for pdf_parser.py (Phase 9 requirements 1-9).
"""
import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock

import config
import pdf_parser
from pdf_parser import (
    clean_text,
    is_meaningful_text,
    extract_pdf_text,
    ExtractionResult,
    PDFParserError,
    CorruptPDFError,
    PasswordProtectedPDFError,
)


def test_1_extract_english_pdf(english_pdf_path):
    """Scenario 1: Extract text from a valid English PDF."""
    assert os.path.exists(english_pdf_path), "English sample PDF must exist"
    result = extract_pdf_text(english_pdf_path)

    assert result.status == config.STATUS_COMPLETED
    assert result.has_text is True
    assert result.page_count >= 1
    assert "CYBERNAUT INSTITUTE OF TECHNOLOGY" in result.text
    assert "TIMETABLE" in result.text
    assert "INSTRUCTIONS TO STUDENTS" in result.text


def test_2_extract_tamil_pdf(tamil_pdf_path):
    """Scenario 2: Extract text from a valid Tamil PDF with Tamil Unicode preserved."""
    assert os.path.exists(tamil_pdf_path), "Tamil sample PDF must exist"
    result = extract_pdf_text(tamil_pdf_path)

    assert result.status == config.STATUS_COMPLETED
    assert result.has_text is True
    assert result.page_count >= 1
    # Verify exact Tamil Unicode characters are present without transliteration
    assert "சைபர்நாட்" in result.text
    assert "தேர்வு" in result.text
    assert "மாணவர்களுக்கான அறிவுரைகள்" in result.text


def test_3_extract_mixed_tamil_english(mixed_pdf_path):
    """Scenario 3: Extract mixed Tamil and English content."""
    assert os.path.exists(mixed_pdf_path), "Mixed sample PDF must exist"
    result = extract_pdf_text(mixed_pdf_path)

    assert result.status == config.STATUS_COMPLETED
    assert result.has_text is True
    # Contains both English and Tamil
    assert "Cybernaut Institute of Technology" in result.text
    assert "தொழில்நுட்பக் கல்லூரி" in result.text
    assert "Final Year Exam Schedule" in result.text
    assert "அனுமதிச் சீட்டு" in result.text


def test_4_verify_page_order(multipage_pdf_path):
    """Scenario 4: Verify page order is strictly preserved in multi-page extraction."""
    assert os.path.exists(multipage_pdf_path), "Multipage sample PDF must exist"
    result = extract_pdf_text(multipage_pdf_path)

    assert result.status == config.STATUS_COMPLETED
    assert result.page_count == 3
    pos_p1 = result.text.find("PAGE 1")
    pos_p2 = result.text.find("PAGE 2")
    pos_p3 = result.text.find("PAGE 3")

    assert pos_p1 != -1 and pos_p2 != -1 and pos_p3 != -1
    assert pos_p1 < pos_p2 < pos_p3, "Pages must be in sequential order (Page 1 < Page 2 < Page 3)"


def test_5_verify_whitespace_normalization():
    """Scenario 5: Verify whitespace, tab, line ending, and blank line normalization."""
    raw = "   Line 1 with    multiple    spaces.\r\n\r\n\r\n\r\nLine 2 with \t tabs.\rLine 3.   \n\n\n\n   "
    cleaned = clean_text(raw)

    # Inline multiple spaces/tabs should collapse to single space
    assert "multiple spaces." in cleaned
    assert "Line 2 with tabs." in cleaned
    # 4 consecutive newlines should collapse to at most 2
    assert "\n\n\n" not in cleaned
    # Leading and trailing whitespace should be stripped
    assert not cleaned.startswith(" ")
    assert not cleaned.endswith(" ")
    # Tamil Unicode should be preserved during cleaning
    tamil_raw = "   வணக்கம்    மாணவர்களே! \n\n\n\n தேர்வு ஆரம்பம்.   "
    tamil_cleaned = clean_text(tamil_raw)
    assert tamil_cleaned == "வணக்கம் மாணவர்களே!\n\nதேர்வு ஆரம்பம்."


def test_6_handle_empty_pdf():
    """Scenario 6: Handle an empty PDF (0-byte file)."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        temp_empty = f.name

    try:
        result = extract_pdf_text(temp_empty)
        assert result.status == config.STATUS_FAILED
        assert result.has_text is False
        assert "empty file" in result.error_message.lower()
    finally:
        if os.path.exists(temp_empty):
            os.remove(temp_empty)


def test_7_handle_corrupted_pdf(corrupted_pdf_path):
    """Scenario 7: Handle a corrupted or malformed PDF gracefully."""
    result = extract_pdf_text(corrupted_pdf_path)
    assert result.status == config.STATUS_FAILED
    assert result.has_text is False
    assert result.error_message is not None


def test_8_handle_password_protected_pdf(password_pdf_path):
    """Scenario 8: Handle a password-protected PDF without crashing."""
    result = extract_pdf_text(password_pdf_path)
    assert result.status == config.STATUS_FAILED
    assert result.has_text is False
    assert "password" in result.error_message.lower()


def test_9_fallback_from_pdfplumber_to_pypdf(english_pdf_path):
    """Scenario 9: Verify fallback from pdfplumber to pypdf when pdfplumber encounters an error."""
    # Mock extract_with_pdfplumber to simulate a failure
    with patch("pdf_parser.extract_with_pdfplumber", side_effect=Exception("Simulated pdfplumber crash")):
        result = extract_pdf_text(english_pdf_path)

        assert result.status == config.STATUS_COMPLETED
        assert result.engine == "pypdf", "Should fallback to pypdf engine"
        assert result.has_text is True
        assert "CYBERNAUT INSTITUTE OF TECHNOLOGY" in result.text


def test_scanned_pdf_classified_as_no_text(scanned_pdf_path):
    """Verify that an image-only/scanned PDF is properly classified as 'No Text'."""
    result = extract_pdf_text(scanned_pdf_path)
    assert result.status == config.STATUS_NO_TEXT
    assert result.has_text is False
    assert result.text == ""
