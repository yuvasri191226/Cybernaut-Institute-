"""
Quick direct test script for sample PDFs.
Tests English, Tamil, Mixed, and Scanned PDFs directly without requiring MySQL.
Usage:
    python test_samples.py
"""
import os
import sys

# Ensure pdf_extractor is on Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import config
import pdf_parser


def test_samples():
    print("=" * 60)
    print("DIRECT SAMPLE PDF EXTRACTION TEST")
    print("=" * 60)
    print()

    samples = [
        ("English Announcement", "sample_1_english_announcement.pdf"),
        ("Tamil Announcement", "sample_2_tamil_announcement.pdf"),
        ("Mixed Tamil-English Announcement", "sample_mixed_tamil_english.pdf"),
        ("Scanned / No Text Notice", "sample_3_scanned_notice.pdf"),
        ("Multi-page Notice", "sample_multipage.pdf"),
        ("Corrupted PDF", "sample_corrupted.pdf"),
    ]

    for label, file_name in samples:
        file_path = os.path.join(config.SAMPLE_PDFS_DIR, file_name)
        print(f"Testing: {label} ({file_name})")
        print("-" * 50)

        if not os.path.exists(file_path):
            print(f"Status: File not found ({file_path})")
            print()
            continue

        result = pdf_parser.extract_pdf_text(file_path)
        print(f"Engine used: {result.engine}")
        print(f"Pages: {result.page_count}")
        print(f"Has extractable text: {result.has_text}")
        print(f"Status: {result.status}")
        if result.error_message:
            print(f"Message: {result.error_message}")
        if result.text:
            preview = result.text[:200].replace("\n", " ")
            print(f"Extracted preview: {preview}...")
        print()

    print("=" * 60)
    print("TEST FINISHED")
    print("=" * 60)


if __name__ == "__main__":
    test_samples()
