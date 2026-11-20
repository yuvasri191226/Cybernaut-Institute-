"""
PDF Text Extraction Engine.
Extracts text from college announcement PDFs using pdfplumber as primary engine
and pypdf as fallback. Handles English, Tamil Unicode, mixed text, cleaning,
and distinguishes between extractable text, scanned/no-text, corrupted, and password-protected PDFs.
"""
import logging
import os
import re
from dataclasses import dataclass
from typing import Optional

import pdfplumber
import pypdf

# Suppress noisy internal warnings from pypdf for expectedly malformed test PDFs
logging.getLogger("pypdf").setLevel(logging.ERROR)

try:
    from . import config
except ImportError:
    import config


class PDFParserError(Exception):
    """Base exception for PDF parser errors."""
    pass


class CorruptPDFError(PDFParserError):
    """Raised when PDF file is damaged or corrupted."""
    pass


class PasswordProtectedPDFError(PDFParserError):
    """Raised when PDF file is encrypted with a password."""
    pass


@dataclass
class ExtractionResult:
    """Structured extraction response."""
    text: str
    page_count: int
    engine: str
    has_text: bool
    status: str
    error_message: Optional[str] = None


def clean_text(raw_text: Optional[str]) -> str:
    """
    Cleans and normalizes extracted text.
    - Normalizes line breaks (\\r\\n, \\r -> \\n)
    - Normalizes inline spaces and tabs (replaces multiple horizontal spaces with a single space)
    - Strips leading and trailing whitespace from each line
    - Collapses 3 or more consecutive blank lines into 2 (preserving paragraph breaks)
    - Preserves Tamil characters (U+0B80 - U+0BFF) without transliteration
    - Preserves English characters, numbers, and meaningful punctuation
    - Strips leading and trailing whitespace from the final text
    """
    if not raw_text:
        return ""

    # 1. Normalize line endings
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    # 2. Normalize inline whitespace (multiple spaces/tabs to a single space) per line
    lines = []
    for line in text.split("\n"):
        cleaned_line = re.sub(r"[ \t\f\v]+", " ", line).strip()
        lines.append(cleaned_line)

    normalized_text = "\n".join(lines)

    # 3. Collapse excessive blank lines (3 or more newlines -> 2 newlines)
    normalized_text = re.sub(r"\n{3,}", "\n\n", normalized_text)

    # 4. Strip overall text
    return normalized_text.strip()


def is_meaningful_text(text: str) -> bool:
    """
    Determines whether the text has substantive content rather than
    just whitespace, control characters, or non-printable glyph noise.
    """
    if not text:
        return False
    # Check for presence of letters, digits, or Tamil unicode characters
    has_alphanumeric_or_tamil = bool(
        re.search(r"[\w\u0B80-\u0BFF]", text, flags=re.UNICODE)
    )
    return has_alphanumeric_or_tamil


def _check_encrypted_pypdf(file_path: str) -> bool:
    """Check if the PDF is password-protected using pypdf."""
    try:
        reader = pypdf.PdfReader(file_path)
        if reader.is_encrypted:
            # Try decrypting with empty password
            try:
                decrypted = reader.decrypt("")
                if decrypted == pypdf.constants.PasswordResult.NOT_DECRYPTED:
                    return True
            except Exception:
                return True
        return False
    except pypdf.errors.FileNotDecryptedError:
        return True
    except Exception:
        return False


def extract_with_pdfplumber(file_path: str) -> ExtractionResult:
    """Attempts extraction using pdfplumber."""
    try:
        with pdfplumber.open(file_path) as pdf:
            page_count = len(pdf.pages)
            if page_count == 0:
                return ExtractionResult(
                    text="",
                    page_count=0,
                    engine="pdfplumber",
                    has_text=False,
                    status=config.STATUS_NO_TEXT,
                )

            extracted_pages = []
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_pages.append(page_text)

            full_text = "\n\n".join(extracted_pages)
            cleaned = clean_text(full_text)

            if is_meaningful_text(cleaned):
                return ExtractionResult(
                    text=cleaned,
                    page_count=page_count,
                    engine="pdfplumber",
                    has_text=True,
                    status=config.STATUS_COMPLETED,
                )
            else:
                return ExtractionResult(
                    text="",
                    page_count=page_count,
                    engine="pdfplumber",
                    has_text=False,
                    status=config.STATUS_NO_TEXT,
                )
    except pypdf.errors.FileNotDecryptedError:
        raise PasswordProtectedPDFError("PDF is password-protected.")
    except Exception as e:
        err_msg = str(e).lower()
        if "password" in err_msg or "encrypt" in err_msg:
            raise PasswordProtectedPDFError(f"PDF is encrypted or password-protected: {e}")
        # Otherwise raise PDFParserError for fallback
        raise PDFParserError(f"pdfplumber extraction failed: {e}")


def extract_with_pypdf(file_path: str) -> ExtractionResult:
    """Fallback extraction using pypdf."""
    try:
        reader = pypdf.PdfReader(file_path)
        if reader.is_encrypted:
            try:
                res = reader.decrypt("")
                if res == pypdf.constants.PasswordResult.NOT_DECRYPTED:
                    raise PasswordProtectedPDFError("PDF is password-protected.")
            except Exception:
                raise PasswordProtectedPDFError("PDF is password-protected.")

        page_count = len(reader.pages)
        if page_count == 0:
            return ExtractionResult(
                text="",
                page_count=0,
                engine="pypdf",
                has_text=False,
                status=config.STATUS_NO_TEXT,
            )

        extracted_pages = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                extracted_pages.append(page_text)

        full_text = "\n\n".join(extracted_pages)
        cleaned = clean_text(full_text)

        if is_meaningful_text(cleaned):
            return ExtractionResult(
                text=cleaned,
                page_count=page_count,
                engine="pypdf",
                has_text=True,
                status=config.STATUS_COMPLETED,
            )
        else:
            return ExtractionResult(
                text="",
                page_count=page_count,
                engine="pypdf",
                has_text=False,
                status=config.STATUS_NO_TEXT,
            )
    except PasswordProtectedPDFError:
        raise
    except pypdf.errors.PdfReadError as e:
        raise CorruptPDFError(f"Corrupted or invalid PDF format: {e}")
    except Exception as e:
        raise PDFParserError(f"pypdf extraction failed: {e}")


def extract_pdf_text(file_path: str) -> ExtractionResult:
    """
    Main extraction interface.
    1. Validates local file existence and header.
    2. Checks for password protection.
    3. Attempts primary extraction with pdfplumber.
    4. If pdfplumber fails or yields no text, attempts fallback with pypdf.
    5. Returns structured ExtractionResult.
    """
    if not os.path.isfile(file_path):
        return ExtractionResult(
            text="",
            page_count=0,
            engine="none",
            has_text=False,
            status=config.STATUS_FAILED,
            error_message=f"File not found: {file_path}",
        )

    # Check file size (0 bytes is invalid)
    if os.path.getsize(file_path) == 0:
        return ExtractionResult(
            text="",
            page_count=0,
            engine="none",
            has_text=False,
            status=config.STATUS_FAILED,
            error_message="PDF file is 0 bytes (empty file).",
        )

    # Check password protection
    if _check_encrypted_pypdf(file_path):
        return ExtractionResult(
            text="",
            page_count=0,
            engine="none",
            has_text=False,
            status=config.STATUS_FAILED,
            error_message="PDF is password-protected and cannot be extracted.",
        )

    # Try Primary: pdfplumber
    try:
        result = extract_with_pdfplumber(file_path)
        if result.has_text:
            return result
        # If pdfplumber returned No Text, test fallback pypdf in case pdfplumber missed font encodings
        try:
            fallback = extract_with_pypdf(file_path)
            if fallback.has_text:
                return fallback
        except Exception:
            pass
        # Both confirm No Text (e.g. scanned image-only PDF)
        return result

    except PasswordProtectedPDFError as e:
        return ExtractionResult(
            text="",
            page_count=0,
            engine="none",
            has_text=False,
            status=config.STATUS_FAILED,
            error_message=str(e),
        )
    except Exception as plumber_err:
        # Fallback to pypdf
        try:
            return extract_with_pypdf(file_path)
        except (CorruptPDFError, pypdf.errors.PdfReadError) as e:
            return ExtractionResult(
                text="",
                page_count=0,
                engine="pypdf",
                has_text=False,
                status=config.STATUS_FAILED,
                error_message=f"Corrupted PDF: {e}",
            )
        except PasswordProtectedPDFError as e:
            return ExtractionResult(
                text="",
                page_count=0,
                engine="pypdf",
                has_text=False,
                status=config.STATUS_FAILED,
                error_message=str(e),
            )
        except Exception as pypdf_err:
            return ExtractionResult(
                text="",
                page_count=0,
                engine="none",
                has_text=False,
                status=config.STATUS_FAILED,
                error_message=f"All extraction engines failed. pdfplumber: {plumber_err}; pypdf: {pypdf_err}",
            )
