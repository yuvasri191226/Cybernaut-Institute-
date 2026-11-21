# AI-Powered College Announcement Monitoring System
## Module: Automated Python PDF Text Extraction Pipeline (`pdf_extractor/`)

Developed for **Cybernaut Institute of Technology** (Member 7 Module).  
**Author / Contributor:** Ragul Chandran (`ragulchandran2007@gmail.com`)

---

## 1. Project Overview

The **PDF Text Extraction Pipeline** is an automated backend component that continuously monitors and processes college announcement PDF attachments stored in the central MySQL database (`college_announcements_db`).

When scrapers (Member 4) or administrators insert announcement documents, attachment records are initially marked with `extraction_status = 'Pending'`. This pipeline:
1. Identifies and fetches pending PDF attachments from MySQL.
2. Validates `attachment_id` inputs safely (rejects invalid types like strings, booleans, floats, and empty values without crashing).
3. Safely downloads remote documents or resolves local PDF files, enforcing strict SSRF protections and file size controls.
4. Extracts and cleans text page-by-page using `pdfplumber` (with automatic fallback to `pypdf`).
5. Faithfully preserves both English and native **Tamil Unicode** text (`U+0B80–U+0BFF`).
6. Intelligently classifies documents:
   - **`Completed`**: Documents with valid extractable text (saved to `extracted_text`).
   - **`No Text`**: Valid PDFs that contain only scanned images or blank pages without embedded text.
   - **`Failed`**: Corrupted, password-protected, unreachable, or invalid files.
7. Updates MySQL with the exact status, cleaned text, and timestamp (`extracted_at = NOW()`).
8. Operates in both **Live Database Mode** and **Zero-Dependency Offline Mode** (`--offline`), which bypasses MySQL completely and processes local sample documents.

---

## 2. Module Architecture

```
                                  +-----------------------------+
                                  | MySQL Database              |
                                  | (attachments table)         |
                                  +--------------+--------------+
                                                 |
                                     Fetch Pending Attachments
                                                 |
                                                 v
                                  +-----------------------------+
                                  | extractor_runner.py         |
                                  | - validate_attachment_id()  |
                                  | - --offline mode bypass     |
                                  +--------------+--------------+
                                                 |
                                   Safe Download / Path Resolve
                                                 v
                                  +-----------------------------+
                                  | downloader.py               |
                                  | - SSRF IP validation        |
                                  | - %PDF- magic bytes check   |
                                  | - Chunked stream size limit |
                                  +--------------+--------------+
                                                 |
                                         Temporary PDF File
                                                 v
                                  +-----------------------------+
                                  | pdf_parser.py               |
                                  | - Primary: pdfplumber       |
                                  | - Fallback: pypdf           |
                                  | - Tamil Unicode preservation|
                                  | - Whitespace normalization  |
                                  +--------------+--------------+
                                                 |
                                    Cleaned Text & Status
                                                 v
                                  +-----------------------------+
                                  | db_handler.py               |
                                  | - Parameterized UPDATE      |
                                  | - UTF-8 MB4 encoding        |
                                  | - Commit / Rollback         |
                                  +--------------+--------------+
                                                 |
                                      Cleanup Temp Files
                                                 v
                                               [DONE]
```

---

## 3. Folder Structure

```
cybernaut-institute/pdf_extractor/
│
├── __init__.py                # Package initialization and clean __all__ public exports
├── extractor_runner.py        # Main execution entry point & batch orchestrator
├── config.py                  # Environment settings, size limits, and validation
├── db_handler.py              # MySQL queries matching database/schema.sql
├── downloader.py              # Safe streaming downloader with SSRF protection
├── pdf_parser.py              # Extraction engine (pdfplumber + pypdf) & text cleaner
├── test_samples.py            # Quick direct test script for offline sample verification
│
├── requirements.txt           # Python dependencies
├── .env.example               # Example environment variable template
├── .gitignore                 # Ignores temp/, .env, caches, and venv/
├── README.md                  # Comprehensive documentation and operational guide
│
├── sample_pdfs/               # Pre-generated sample PDFs for testing
│   ├── sample_1_english_announcement.pdf    # English timetable notice
│   ├── sample_2_tamil_announcement.pdf      # Tamil Unicode circular
│   ├── sample_3_scanned_notice.pdf          # Scanned/image-only notice (No Text)
│   ├── sample_mixed_tamil_english.pdf       # Mixed Tamil-English notice
│   ├── sample_multipage.pdf                 # 3-page sequential order test
│   ├── sample_password_protected.pdf        # Encrypted PDF
│   └── sample_corrupted.pdf                 # Corrupted file stream
│
└── tests/                     # Automated test suite (pytest - 34 tests)
    ├── __init__.py
    ├── conftest.py            # Shared fixtures
    ├── test_pdf_parser.py     # PDF parser unit tests (English, Tamil, mixed, empty, etc.)
    ├── test_downloader.py     # Downloader and SSRF security tests
    ├── test_db_handler.py     # Database handler unit tests with mocking
    └── test_extractor_runner.py # Pipeline runner batch processing & error handling tests
```

---

## 4. Key Recent Updates & Reliability Enhancements

1. **Independent Offline Mode (`--offline`)**:
   - The `--offline` flag runs completely independent of MySQL: `conn = None`.
   - Never calls `get_connection()` or attempts database validation.
   - Outputs `Database connection: SKIPPED (offline mode)`.
   - Works immediately even if no `.env` file exists and MySQL service is stopped.
   - All connection objects and cleanup operations are safely guarded against `None`.

2. **Resilient Attachment ID Validation (`validate_attachment_id`)**:
   - Safely accepts integer IDs (`5`) and numeric string IDs (`"5"`, `" 5 "`).
   - Safely rejects invalid types: `None`, `""`, `"abc"`, `"12abc"`, floats (`5.5`), and booleans (`True`, `False`).
   - Logs a clear warning (`WARNING: Invalid attachment_id '<val>' in record. Skipping record.`).
   - Marks invalid records as `Failed` in statistics without running database `UPDATE` statements.
   - An invalid ID **never crashes the batch**; remaining valid records continue processing seamlessly.

3. **Side-Effect-Free Package Exports (`__init__.__all__`)**:
   - Cleanly exports public functions and types: `config`, `run_pipeline`, `process_single_attachment`, `validate_attachment_id`, `extract_pdf_text`, `clean_text`, `is_meaningful_text`, `ExtractionResult`, `download_or_get_pdf`, `cleanup_temp_file`, `get_connection`, `test_connection`, `fetch_pending_attachments`, `update_attachment_status`, and custom exception classes.
   - Importing `pdf_extractor` has **zero side effects**: no database connection, no network socket, and no directory creation.
   - Verified via: `python -c "import pdf_extractor as p; print(p.__all__)"`.

---

## 5. System & Python Installation Requirements

- **Python**: Version 3.10, 3.11, 3.12, 3.13, or 3.14.
- **Operating System**: Windows 10/11, Linux, or macOS.
- **MySQL**: MySQL 8.0 or later with `utf8mb4` character set support (for live mode).

---

## 6. Virtual Environment Creation

Open **Windows PowerShell** (or terminal) and navigate to the module directory:

```powershell
cd "d:\Cybernaut project\Cybernaut-Institute-\cybernaut-institute\pdf_extractor"
```

Create a virtual environment:

```powershell
python -m venv venv
```

Activate the virtual environment:

- **Windows PowerShell**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(If execution of scripts is disabled, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned` once).*

- **Windows Command Prompt (CMD)**:
  ```cmd
  venv\Scripts\activate.bat
  ```

- **Linux / macOS**:
  ```bash
  source venv/bin/activate
  ```

---

## 7. Dependency Installation

Install dependencies from `requirements.txt`:

```powershell
pip install -r requirements.txt
```

Installed packages:
- `pdfplumber`: Primary high-fidelity PDF layout and text extraction.
- `pypdf`: Fallback extraction engine and PDF encryption inspector.
- `requests`: HTTP/HTTPS streaming downloader.
- `PyMySQL`: Native Python MySQL client supporting `utf8mb4`.
- `python-dotenv`: Environment variable management.
- `pytest`: Automated testing framework.

---

## 8. Offline Sample PDF Testing (No MySQL or `.env` Required)

You can run full extraction immediately without MySQL:

### Direct Sample Inspection:
```powershell
python test_samples.py
```

### Full Offline Extraction Runner:
```powershell
python extractor_runner.py --offline
```

**Expected Offline Output:**
```text
========================================
COLLEGE ANNOUNCEMENT PDF EXTRACTOR
========================================

Database connection: SKIPPED (offline mode)

Running in OFFLINE mode (using sample PDFs without MySQL)...

Pending PDF attachments found: 4

Processing attachment ID: 1
File: sample_1_english_announcement.pdf
Extraction: SUCCESS
Pages: 1
Status: Completed

Processing attachment ID: 2
File: sample_2_tamil_announcement.pdf
Extraction: SUCCESS
Pages: 1
Status: Completed

Processing attachment ID: 3
File: sample_3_scanned_notice.pdf
Extraction: NO TEXT
Pages: 1
Status: No Text

Processing attachment ID: 4
File: sample_corrupted.pdf
Extraction: FAILED
Pages: 0
Status: Failed

========================================
PROCESSING SUMMARY
========================================

Total processed: 4
Completed: 2
No Text: 1
Failed: 1

========================================
```

---

## 9. Automated Testing Suite (`pytest`)

Execute the complete automated test suite (34 tests):

```powershell
pytest tests/ -v
```

### Module Breakdown:
```powershell
# PDF parser tests (English, Tamil, order, whitespace, corrupt, password, scanned)
pytest tests/test_pdf_parser.py -v

# Downloader tests (SSRF, 404, timeout, size limit, magic bytes, local paths)
pytest tests/test_downloader.py -v

# Database handler tests (mocked transactions, UTF-8 MB4, SQL parameterization)
pytest tests/test_db_handler.py -v

# Runner & batch tests (offline bypass, invalid IDs, deduplication, error continuation)
pytest tests/test_extractor_runner.py -v
```

All 34 tests run with mock objects and **never require a running MySQL database**.

---

## 10. Running with Live MySQL Database

When ready to process live announcement records:

1. **Start MySQL service**:
   ```powershell
   Start-Service MySQL80
   ```

2. **Configure `.env`**:
   ```powershell
   Copy-Item .env.example .env
   ```
   Set your database credentials:
   ```ini
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_actual_password
   DB_NAME=college_announcements_db

   DOWNLOAD_TIMEOUT=30
   MAX_FILE_SIZE_MB=25
   TEMP_DIR=temp
   ```

3. **Import database schema & seed data (if not already loaded)**:
   ```powershell
   mysql -u root -p < ..\database\schema.sql
   mysql -u root -p < ..\database\seed.sql
   ```

4. **Run the extractor**:
   ```powershell
   python extractor_runner.py
   ```

   *(Optional: limit batch size with `--limit N`, e.g., `python extractor_runner.py --limit 5`)*.

---

## 11. Database Status Lifecycle

| Status | Meaning | Action Taken in Database |
| :--- | :--- | :--- |
| **`Pending`** | Queued for processing | Unprocessed, awaiting pipeline pickup. |
| **`Completed`** | Text successfully extracted | `extracted_text = <cleaned_text>`, `extracted_at = NOW()` |
| **`No Text`** | Valid PDF, but contains only images or scanned pages | `extracted_text = NULL`, `extracted_at = NOW()` |
| **`Failed`** | Network error, 404, corrupted, password-protected, or invalid ID | `extracted_text = NULL`, `extracted_at = NOW()` |

---

## 12. Security Architecture

- **SSRF Protection**: Remote URLs are pre-resolved and verified against private, loopback, link-local, and cloud metadata CIDR blocks (`127.0.0.1`, `::1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`). Every HTTP redirect target is individually re-validated before requesting.
- **Resource Exhaustion Defense**: Chunked streaming (8 KB) terminates downloads immediately if bytes exceed `MAX_FILE_SIZE_MB`.
- **Magic Byte Validation**: Validates initial `%PDF-` bytes to block spoofed HTML/scripts.
- **SQL Injection Prevention**: All queries strictly utilize parameterized `%s` placeholders.
- **Path Traversal Protection**: Enforces canonical path checks on local file inputs.
- **Credential Safety**: Passwords reside solely in `.env`, which is ignored by `.gitignore`.

---

## 13. Current Limitations

1. **No Optical Character Recognition (OCR)**: Per project specifications, OCR engines (such as Tesseract) are not included. Scanned documents without a text layer are accurately classified as **`No Text`**.
2. **Encrypted PDFs**: Documents protected by user passwords cannot be decrypted and are classified as **`Failed`**.
