# 🎓 Cybernaut Institute — Versioned Campus Announcement & Circular Change-Monitoring System

A web-based campus announcement, academic circular, and document change-monitoring platform built for **Cybernaut Edutech (SRS Brief 13)** 🚀. It consolidates public academic notices, examination circulars, placement updates, and PDF attachments into a searchable portal with **SHA-256 deduplication**, **automatic version history snapshots**, **safe PDF text extraction (English & Tamil Unicode)**, **AI insights**, and **role-based student/administrator dashboards** ✨.

---

## ✨ Key Features

* 🕷️ **Web Scraping & Deduplication Pipeline (`scraper/`)**: Collects permitted public announcement pages configured in `sources.json`, computes SHA-256 content hashes to prevent duplicate inflation, sets initial moderation state to `Needs Review`, and writes structured output (`output/scraped_20261120_133357.json`) and database records.
* 🕒 **Versioned Change Tracking (`database/`)**: Uses a normalized 10-table **MySQL** schema (`schema.sql`, `seed.sql`) with database triggers (`trg_before_announcement_update`) that snapshot prior versions into `announcement_versions` whenever a notice is revised.
* 📄 **Safe PDF Text Extraction (`pdf_extractor/`)**: Downloads attached PDFs with SSRF protection, `%PDF-` magic-byte checks, and a 25 MB file-size limit, extracting text via **pdfplumber** and **pypdf** (preserving Tamil Unicode 🌐) and classifying outcomes as `Completed`, `No Text`, or `Failed`.
* ⚡ **REST API & AI Assistance (`backend/`)**: Built with **Flask** (`app.py`, `db.py`, `test_backend.py`) across `auth`, `announcement`, `admin`, `user`, and `ai` route blueprints, including JWT authentication and the `POST /api/announcements/<id>/extract-pdf` trigger.
* 🖥️ **Role-Based Web Interface (`index.html`, `login.html`, `student-dashboard.html`, `admin-dashboard.html`)**: Provides keyword search, category filtering, bookmarks, notifications, PDF viewing, admin moderation/CRUD, and graceful fallback handling when the backend is offline.

---

## 📁 Project Structure

```text
Cybernaut-Institute--main/
└── cybernaut-institute/
    ├── .vscode/settings.json          # ⚙️ Live Server port configuration
    ├── index.html                   # 🏠 Public landing & announcements page
    ├── login.html                   # 🔐 Student & administrator login
    ├── student-dashboard.html       # 🎓 Student search, filters, bookmarks & PDF viewer
    ├── admin-dashboard.html         # 🛠️ Admin moderation, CRUD & PDF extraction controls
    ├── css/                         # 🎨 style.css, member3-additions.css
    ├── js/                          # ⚙️ api.js, auth.js, announcements.js, admin.js, filters.js,
    │                                #    bookmarks.js, notifications.js, pdf-viewer.js, ai-assistant.js
    ├── data/announcements.json      # 📦 Sample/fallback announcements fixture
    ├── database/                    # 🗄️ schema.sql, seed.sql, ER_DIAGRAM.md, SETUP_GUIDE.md, backup SQL
    ├── backend/                     # 🚀 app.py, config.py, db.py, test_backend.py, routes/, utils/
    ├── scraper/                     # 🕷️ config.py, sources.json, scraper_engine.py, db_handler.py, run_scraper.py
    └── pdf_extractor/               # 📄 config.py, downloader.py, pdf_parser.py, db_handler.py,
                                     #    extractor_runner.py, sample_pdfs/, tests/
                                     🚀 Setup & Execution
                                     
1️⃣ **Environment Configuration**
Copy .env.example to .env inside backend/, scraper/, and pdf_extractor/, then fill in your MySQL host, database name (college_announcements_db), credentials, and secret keys without committing real secrets to Git 🔒.

2️⃣ **Initialize MySQL Database**

cd cybernaut-institute
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
(See database/SETUP_GUIDE.md and database/ER_DIAGRAM.md for additional schema and setup details 📘.)

3️⃣ **Run the Flask Backend**

cd backend
pip install -r requirements.txt
python app.py

4️⃣ **Run Scraper & PDF Extractor**

# 🕷️ Run web scraper pipeline
python scraper/run_scraper.py

# 📄 Run PDF extractor in offline sample mode (English, Tamil, scanned & edge-case PDFs)
python pdf_extractor/extractor_runner.py --offline

5️⃣ **Serve the Frontend**

Open cybernaut-institute/ in VS Code and launch Live Server over HTTP (configured via .vscode/settings.json) rather than opening HTML files directly via file:// 🌐.

🧪 **Testing & Verification**
📄 PDF Extractor Tests: Run pytest pdf_extractor/tests/ or python pdf_extractor/test_samples.py against pdf_extractor/sample_pdfs/ (sample_1_english_announcement.pdf, sample_2_tamil_announcement.pdf, sample_3_scanned_notice.pdf, sample_corrupted.pdf, sample_mixed_tamil_english.pdf, sample_multipage.pdf, sample_password_protected.pdf).

⚙️ **Backend API Tests**: Run python backend/test_backend.py to verify endpoints, authentication, and database integration.

🛡️ **Scope & Compliance Notes**
✅ Collects only permitted public academic announcement data and sample fixtures; does not bypass authentication walls, CAPTCHAs, or rate limits, or expose private personal records.

⚠️ Failed network requests or unreadable PDFs are classified as explicit errors (Failed / No Text) rather than treated as permanent deletions of existing notices.
