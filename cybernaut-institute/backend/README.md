# Cybernaut Institute of Technology — Announcement REST API Backend
**AI-Powered College Announcement Monitoring System**  
*Role: Senior Python Backend Architect & AI Systems Engineer (Member 5)*

---

## 1. Overview & Architecture

The backend provides a production-grade modular Flask REST API that bridges the frontend application (`index.html`, `login.html`, `student-dashboard.html`, `admin-dashboard.html`) and Member 4's web scraper with the central MySQL database (`college_announcements_db`).

### Key Highlights
- **100% Frontend Compatibility:** Aligned with all client functions and data structures in `js/api.js`, `js/auth.js`, `js/announcements.js`, `js/admin.js`, `js/ai-assistant.js`, `js/bookmarks.js`, and `js/notifications.js`.
- **JWT Authentication & RBAC:** Secure token issuance and authorization decorators (`@login_required`, `@admin_required`, `@optional_login`).
- **Database Schema Support (10 Tables):** Integrates with `users`, `announcements`, `announcement_versions`, `attachments`, `ai_insights`, `ai_qa_logs`, `bookmarks`, `read_status`, `notifications`, and `scraping_logs`, alongside view `vw_admin_dashboard_stats`.
- **Bilingual & AI Capabilities:** English and Tamil text processing (`utf8mb4`), automated bullet-point summarization, key takeaway extraction, and interactive contextual Q&A with deterministic NLP fallback.
- **Flask-CORS Enabled:** Allows seamless cross-origin requests from the browser frontend.

---

## 2. Demo User Credentials

The 5 demo accounts seeded in `cybernaut-institute/database/seed.sql` have been updated with valid Werkzeug `pbkdf2:sha256` password hashes.

| User ID | Full Name | Role | Department | Academic Year | Email / Username | Plaintext Password | Language |
|:---:|:---|:---:|:---:|:---:|:---|:---:|:---:|
| **1** | Dr. R. Meenakshi | `admin` | IT | All | `admin.it@cybernaut.edu.in` | `Admin@123` | English |
| **2** | Dr. S. Karthikeyan | `admin` | CSE | All | `admin.cse@cybernaut.edu.in` | `Admin@123` | English |
| **3** | Arun Kumar | `student` | CSE | Third Year | `arun.kumar@cybernaut.edu.in` | `Student@123` | English |
| **4** | Priya Lakshmi | `student` | IT | Third Year | `priya.lakshmi@cybernaut.edu.in` | `Student@123` | Tamil |
| **5** | Vignesh Raja | `student` | ECE | Second Year | `vignesh.raja@cybernaut.edu.in` | `Student@123` | English |

*(Note: Students can also log in using their college Register Numbers: `CITCSE2023001`, `CITIT2023002`, `CITECE2023003`)*

---

## 3. Project Directory Structure

```text
cybernaut-institute/backend/
├── app.py                  # Flask application factory, CORS, error handlers, root/health routes
├── config.py               # Central environment configuration (DB, JWT, AI keys, ports)
├── db.py                   # MySQL connection pooling & context-aware query executor (PyMySQL)
├── requirements.txt        # Backend dependencies
├── .env.example            # Environment variables template
├── README.md               # Backend architecture & API documentation
├── utils/
│   ├── __init__.py
│   ├── auth_middleware.py  # JWT generation/decoding, @login_required, @admin_required, @optional_login
│   └── ai_service.py       # AI summarization, Tamil translation, and contextual Q&A engine
└── routes/
    ├── __init__.py
    ├── auth_routes.py      # /api/login, /api/logout, /api/me
    ├── announcement_routes.py # /api/announcements, search, filters, versions, read status
    ├── admin_routes.py     # /api/admin/announcements, stats, verification, scraping logs
    ├── user_routes.py      # /api/bookmarks, /api/notifications
    └── ai_routes.py        # /api/assistant/ask, /api/assistant/voice, /api/ai/insights
```

---

## 4. Setup & Running the Server

### Prerequisites
- Python 3.10+
- MySQL Server 8.0+ running on port 3306

### Step 1: Initialize Database
Execute `schema.sql` and `seed.sql` in MySQL:
```bash
mysql -u root -p < cybernaut-institute/database/schema.sql
mysql -u root -p college_announcements_db < cybernaut-institute/database/seed.sql
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp cybernaut-institute/backend/.env.example cybernaut-institute/backend/.env
```
Update your MySQL `DB_PASSWORD` in `.env`:
```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=college_announcements_db
```

### Step 3: Install Dependencies
```bash
cd cybernaut-institute/backend
pip install -r requirements.txt
```

### Step 4: Run Flask Server
```bash
python app.py
```
The server will start at `http://localhost:5000`.

---

## 5. REST API Route Reference

### Authentication Routes (`routes/auth_routes.py`)
- `POST /api/login`: Accepts `{ "username": "...", "password": "..." }`. Returns `{ "token": "...", "role": "...", "user": {...} }`.
- `POST /api/logout`: Invalids client session. Returns `{ "message": "Successfully logged out." }`.
- `GET /api/me`: *(Protected)* Returns current logged-in user profile.

### Announcements Feed & Detail (`routes/announcement_routes.py`)
- `GET /api/announcements`: Feed of verified announcements.
  - Query params: `category`, `department`, `year`, `search`, `sort` (`newest` | `oldest` | `title` | `important`).
- `GET /api/announcements/<id>`: Full announcement details, attachments, and AI summary.
- `GET /api/announcements/<id>/versions`: Revision history from `announcement_versions`.
- `GET /api/announcements/<id>/attachments`: Attached documents and PDF extraction status.
- `GET /api/announcements/<id>/summary`: AI summary text (`{ "summary": "..." }`).
- `GET /api/announcements/<id>/translate?lang=ta`: Translation into Tamil (`{ "translated_text": "...", "language": "ta" }`).
- `POST /api/announcements/<id>/read`: *(Protected)* Mark announcement as read.
- `DELETE /api/announcements/<id>/read`: *(Protected)* Mark announcement as unread.

### Admin Dashboard Routes (`routes/admin_routes.py`)
- `GET /api/admin/announcements`: *(Admin only)* Returns all announcements regardless of verification status.
- `POST /api/admin/announcements`: *(Admin only)* Create new announcement (auto-generates content hash and initial AI summary).
- `PUT /api/admin/announcements/<id>`: *(Admin only)* Update existing announcement (DB trigger `trg_before_announcement_update` auto-archives previous revision).
- `DELETE /api/admin/announcements/<id>`: *(Admin only)* Permanently delete announcement.
- `POST /api/admin/announcements/<id>/verify`: *(Admin only)* Verify or reject announcement (`{ "status": "verified" | "rejected" | "needs review", "note": "..." }`).
- `GET /api/admin/statistics`: *(Admin only)* Metric statistics from view `vw_admin_dashboard_stats`.
- `GET /api/admin/scraping-logs`: *(Admin only)* Web scraper logs from `scraping_logs`.

### Bookmarks & Notifications (`routes/user_routes.py`)
- `GET /api/bookmarks`: *(Protected)* Retrieve user's bookmarked announcements.
- `POST /api/bookmarks`: *(Protected)* Bookmark an announcement (`{ "announcement_id": 1 }`).
- `DELETE /api/bookmarks/<id>`: *(Protected)* Remove bookmark by record ID or announcement ID.
- `GET /api/notifications`: *(Protected)* Retrieve user notifications inbox.
- `POST /api/notifications/<id>/read`: *(Protected)* Mark single notification as read.
- `POST /api/notifications/mark-all-read`: *(Protected)* Mark all notifications as read.

### AI Assistant & Insights (`routes/ai_routes.py`)
- `POST /api/assistant/ask`: Ask assistant questions about announcements. Returns `{ "answer": "...", "found": true/false }`. Logs in `ai_qa_logs`.
- `POST /api/assistant/voice`: Voice question transcribed text query. Logs with `input_mode = 'voice'`.
- `POST /api/ai/summarize`: On-demand summarization and takeaway extraction.
- `GET /api/ai/insights/<announcement_id>`: Retrieve cached AI insights.
