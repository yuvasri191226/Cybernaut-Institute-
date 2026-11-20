# AI-Powered College Announcement Monitoring System
## Module: Automated Python PDF Text Extraction Pipeline (`pdf_extractor/`)

Developed for **Cybernaut Institute of Technology** (Member 7 Module).  
**Author / Contributor:** Ragul Chandran (`ragulchandran2007@gmail.com`)

---

## 1. Project Overview

The **PDF Text Extraction Pipeline** is an automated backend component that continuously monitors and processes college announcement PDF attachments stored in the central MySQL database (`college_announcements_db`).

When scrapers (Member 4) or administrators insert announcement documents, attachment records are initially marked with `extraction_status = 'Pending'`. This pipeline:
1. Identifies and fetches pending PDF attachments.
2. Safely downloads remote documents or resolves local PDF files, enforcing strict SSRF protections and file size controls.
3. Extracts and cleans text page-by-page using `pdfplumber` (with automatic fallback to `pypdf`).
4. Faithfully preserves both English and native **Tamil Unicode** text (`U+0B80–U+0BFF`).
5. Intelligently classifies documents:
   - **`Completed`**: Documents with valid extractable text (saved to `extracted_text`).
   - **`No Text`**: Valid PDFs that contain only scanned images or blank pages without embedded text.
   - **`Failed`**: Corrupted, password-protected, unreachable, or invalid files.
6. Updates MySQL with the exact status, cleaned text, and timestamp (`extracted_at = NOW()`).

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
├── __init__.py                # Package initialization
├── extractor_runner.py        # Main execution entry point (orchestrates batch processing)
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
└── tests/                     # Automated test suite (pytest)
    ├── __init__.py
    ├── conftest.py            # Shared fixtures
    ├── test_pdf_parser.py     # PDF parser unit tests (English, Tamil, mixed, empty, etc.)
    ├── test_downloader.py     # Downloader and SSRF security tests
    ├── test_db_handler.py     # Database handler unit tests with mocking
    └── test_extractor_runner.py # Pipeline runner batch processing tests
```

---

## 4. System & Python Installation Requirements

- **Python**: Version 3.10, 3.11, 3.12, 3.13, or 3.14.
- **Operating System**: Windows 10/11, Linux, or macOS.
- **MySQL**: MySQL 8.0 or later with `utf8mb4` character set support.

---

## 5. Virtual Environment Creation

Open **Windows PowerShell** (or your preferred terminal) and navigate to the project directory:

```powershell
cd "d:\Cybernaut project\Cybernaut-Institute-\cybernaut-institute\pdf_extractor"
```

Create a dedicated virtual environment:

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

## 6. Dependency Installation

Install the tested dependencies:

```powershell
pip install -r requirements.txt
```

Installed packages:
- `pdfplumber`: Primary high-fidelity PDF layout and text extraction.
- `pypdf`: Fallback extraction engine and PDF structure inspector.
- `requests`: HTTP/HTTPS streaming downloader.
- `PyMySQL`: Native Python MySQL client supporting `utf8mb4`.
- `python-dotenv`: Environment variable loader.
- `pytest`: Automated unit and integration testing framework.

---

## 7. Environment Configuration (`.env`)

Copy `.env.example` to create your local `.env`:

```powershell
Copy-Item .env.example .env
```

Edit `.env` with your actual MySQL database credentials:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=college_announcements_db

DOWNLOAD_TIMEOUT=30
MAX_FILE_SIZE_MB=25
TEMP_DIR=temp
```

> [!NOTE]
> `.env` is automatically ignored by `.gitignore`. Never commit passwords or sensitive tokens to Git.

---

## 8. MySQL Database Setup Requirements

Ensure the database schema and seed data are imported per `database/SETUP_GUIDE.md`:

```powershell
mysql -u root -p < ..\database\schema.sql
mysql -u root -p < ..\database\seed.sql
```

The pipeline interacts with the `attachments` table:
- **`attachment_id`**: Integer primary key.
- **`file_url`**: Remote URL (`http://...`, `https://...`) or local path.
- **`file_type`**: Must be `PDF` or filename must end in `.pdf`.
- **`extraction_status`**: Processed when `'Pending'`.
- **`extracted_text`**: Populated with cleaned plain text.
- **`extracted_at`**: Set to current timestamp (`NOW()`).

---

## 9. Offline Sample PDF Testing (No MySQL Needed)

You can test all sample PDFs (English, Tamil, Mixed, Scanned, Corrupted) directly **without requiring a running MySQL database**:

### Direct Sample Inspection:
```powershell
python test_samples.py
```

### Offline Pipeline Runner Mode:
```powershell
python extractor_runner.py --offline
```

This runs the full extraction lifecycle on local sample files and prints execution metrics.

---

## 10. Running the Automated Test Suite (`pytest`)

Execute all 31 unit and security tests:

```powershell
pytest tests/ -v
```

### Specific Test Modules:
```powershell
# Run only PDF parser tests (English, Tamil, page order, whitespace, fallbacks)
pytest tests/test_pdf_parser.py -v

# Run downloader & SSRF security tests
pytest tests/test_downloader.py -v

# Run database handler mock tests
pytest tests/test_db_handler.py -v

# Run runner batch processing tests
pytest tests/test_extractor_runner.py -v
```

All unit tests execute with mock objects and **never require a running database server**.

---

## 11. Running the Live Extraction Pipeline

Once MySQL is running and `.env` is configured:

```powershell
python extractor_runner.py
```

### Optional CLI Arguments:
- `--limit N`: Limit processing to the first `N` pending attachments (e.g., `python extractor_runner.py --limit 5`).
- `--offline`: Run in local sample mode without connecting to MySQL.

---

## 12. Expected Console Output

```
========================================
COLLEGE ANNOUNCEMENT PDF EXTRACTOR
========================================

Database connection: SUCCESS

Pending PDF attachments found: 4

Processing attachment ID: 1
File: exam_timetable.pdf
Extraction: SUCCESS
Pages: 2
Status: Completed

Processing attachment ID: 2
File: circular_tamil.pdf
Extraction: SUCCESS
Pages: 1
Status: Completed

Processing attachment ID: 3
File: scanned_notice.pdf
Extraction: NO TEXT
Pages: 1
Status: No Text

Processing attachment ID: 4
File: corrupted.pdf
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

## 13. Database Status Explanations

| Status | Meaning | Action Taken in Database |
| :--- | :--- | :--- |
| **`Pending`** | Document queued for processing | Unprocessed, awaiting pipeline pickup. |
| **`Completed`** | Text successfully extracted | `extracted_text = <cleaned_text>`, `extracted_at = NOW()` |
| **`No Text`** | Valid PDF, but contains only images or scanned pages | `extracted_text = NULL`, `extracted_at = NOW()` |
| **`Failed`** | Download failed, corrupted file, or encrypted with password | `extracted_text = NULL`, `extracted_at = NOW()` |

---

## 14. Common Errors and Solutions

1. **`Can't connect to MySQL server`**:
   - Check if your MySQL service is started: `Start-Service MySQL80`.
   - Verify `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` in `.env`.
   - To test pipeline logic without MySQL, run `python extractor_runner.py --offline`.

2. **`SSRF violation: Host resolves to restricted IP`**:
   - The pipeline blocks requests to `localhost`, `127.0.0.1`, and private IP ranges (`10.x`, `192.168.x`).
   - If running local tests against a local test web server, set `ALLOW_PRIVATE_IPS=true` in `.env`.

3. **`File exceeds maximum allowed size`**:
   - The file exceeds `MAX_FILE_SIZE_MB` (default: 25 MB).
   - Adjust `MAX_FILE_SIZE_MB` in `.env` if legitimate large documents must be parsed.

4. **`Character encoding errors (UnicodeEncodeError / UnicodeDecodeError)`**:
   - The database connection enforces `charset='utf8mb4'`. Ensure the MySQL server and tables use `utf8mb4_unicode_ci`.

---

## 15. Security Considerations

- **SSRF Protection**: All remote URLs are validated using DNS address resolution prior to requesting content. Private networks, loopbacks, AWS metadata endpoints (`169.254.169.254`), and link-local destinations are rejected.
- **Redirect Revalidation**: Each HTTP redirect is checked against the SSRF validator to prevent open-redirect exploits.
- **Resource Exhaustion Defense**: Streaming download chunks with strict byte counters immediately aborts downloads exceeding `MAX_FILE_SIZE_MB`.
- **Magic Bytes Validation**: Downloaded payloads are verified against standard `%PDF-` signature bytes before parser invocation, stopping malicious HTML/script payloads masquerading as PDFs.
- **SQL Injection Prevention**: All queries in `db_handler.py` strictly utilize parameterized SQL statements (`%s` placeholders).
- **Credential Protection**: Passwords are read solely from environment variables and never logged or printed.
- **Path Traversal Protection**: Local files and temp file paths are resolved to canonical absolute paths and checked for containment.

---

## 16. Current Limitations

1. **No Optical Character Recognition (OCR)**:
   - In accordance with project specifications, OCR engines (such as Tesseract) are not included.
   - PDFs composed purely of scanned raster images will be accurately classified as **`No Text`**.
2. **Password Protected PDFs**:
   - Encrypted PDFs requiring user authentication passwords cannot be decrypted and will be classified as **`Failed`**.
