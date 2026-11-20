"""
Shared Pytest configuration and fixtures.
"""
import os
import sys
import pytest

# Ensure pdf_extractor package directory is in sys.path
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
PKG_DIR = os.path.dirname(TESTS_DIR)
if PKG_DIR not in sys.path:
    sys.path.insert(0, PKG_DIR)

import config


@pytest.fixture
def sample_dir():
    """Returns path to sample PDFs directory."""
    return config.SAMPLE_PDFS_DIR


@pytest.fixture
def english_pdf_path(sample_dir):
    return os.path.join(sample_dir, "sample_1_english_announcement.pdf")


@pytest.fixture
def tamil_pdf_path(sample_dir):
    return os.path.join(sample_dir, "sample_2_tamil_announcement.pdf")


@pytest.fixture
def mixed_pdf_path(sample_dir):
    return os.path.join(sample_dir, "sample_mixed_tamil_english.pdf")


@pytest.fixture
def multipage_pdf_path(sample_dir):
    return os.path.join(sample_dir, "sample_multipage.pdf")


@pytest.fixture
def scanned_pdf_path(sample_dir):
    return os.path.join(sample_dir, "sample_3_scanned_notice.pdf")


@pytest.fixture
def corrupted_pdf_path(sample_dir):
    return os.path.join(sample_dir, "sample_corrupted.pdf")


@pytest.fixture
def password_pdf_path(sample_dir):
    return os.path.join(sample_dir, "sample_password_protected.pdf")
