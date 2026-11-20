"""
PDF Extractor Package for AI-Powered College Announcement Monitoring System.
"""
from . import config
from .extractor_runner import (
    run_pipeline,
    process_single_attachment,
    validate_attachment_id,
)
from .pdf_parser import (
    extract_pdf_text,
    clean_text,
    is_meaningful_text,
    ExtractionResult,
    PDFParserError,
    CorruptPDFError,
    PasswordProtectedPDFError,
)
from .downloader import (
    download_or_get_pdf,
    cleanup_temp_file,
    DownloadError,
    MaxFileSizeExceededError,
    InvalidPDFSignatureError,
    SSRFSecurityError,
)
from .db_handler import (
    get_connection,
    test_connection,
    fetch_pending_attachments,
    update_attachment_status,
    DatabaseError,
)

__version__ = "1.0.0"

__all__ = [
    "config",
    "run_pipeline",
    "process_single_attachment",
    "validate_attachment_id",
    "extract_pdf_text",
    "clean_text",
    "is_meaningful_text",
    "ExtractionResult",
    "PDFParserError",
    "CorruptPDFError",
    "PasswordProtectedPDFError",
    "download_or_get_pdf",
    "cleanup_temp_file",
    "DownloadError",
    "MaxFileSizeExceededError",
    "InvalidPDFSignatureError",
    "SSRFSecurityError",
    "get_connection",
    "test_connection",
    "fetch_pending_attachments",
    "update_attachment_status",
    "DatabaseError",
]
