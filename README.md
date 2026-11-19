# 🎓 AI-Powered College Announcement Monitoring System
### 🏛️ Cybernaut Institute of Technology

![Project Status](https://img.shields.io/badge/Status-In%20Development-blue)
![Python](https://img.shields.io/badge/Backend-Python%20%7C%20Flask-green)
![Frontend](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20JavaScript-yellow)
![Database](https://img.shields.io/badge/Database-MySQL-orange)
![AI](https://img.shields.io/badge/AI-NLP%20%7C%20Summarization%20%7C%20Translation-purple)

---

## 📖 Overview
The **AI-Powered College Announcement Monitoring System** is a centralized, intelligent platform designed for **Cybernaut Institute of Technology** to automate the collection, verification, and delivery of official college circulars, exam schedules, placement drives, and event updates. 

Instead of students manually checking multiple notice boards or portals, our system automatically scrapes announcements, extracts text from attached PDFs, generates concise summaries, translates notices into **Tamil and English**, and provides an interactive **AI Q&A & Voice Assistant**.

---

## ✨ Key Features

### 👨‍🎓 Student Dashboard
* **🔍 Live Search & Combined Filtering:** Filter notices dynamically by Keyword, Category (*Examination, Events, Academic, Placement, General*), Department (*CSE, IT, ECE, EEE, Mech, Civil*), Academic Year, and Date Range.
* **📊 Smart Sorting:** Sort by Latest, Oldest, Recently Updated, Alphabetical, or Important notices.
* **🔖 Bookmarking & Read Tracking:** Save important circulars for quick access and track read/unread announcements across sessions.
* **🔔 Smart Notifications:** Get alerted on new exam schedules, important notices, and updated circulars.
* **📄 Integrated PDF Viewer:** View and download attached PDF circulars directly from the notice card.

### 🤖 AI-Powered Capabilities
* **📝 Instant AI Summarization:** Condenses lengthy college circulars into quick, readable bullet points.
* **🌐 Bilingual Translation (English ↔️ Tamil):** Seamless toggle between original English notices and AI-translated Tamil content.
* **🏷️ Auto-Categorization:** Automatically classifies scraped notices into relevant academic categories.
* **💬 AI Announcement Q&A & 🎙️ Voice Assistant:** Ask questions like *"What is the last date?"* or *"Which department does this apply to?"* via text or voice input.

### 🛡️ Admin Control Center
* **✅ Verification Workflow:** Review scraped announcements and mark them as `Verified`, `Needs Review`, or `Rejected` with admin notes before publishing.
* **✏️ Announcement Management:** Edit, highlight (`Important`), or delete announcements safely.
* **🕷️ Automated Scraper Monitoring:** View real-time scraping logs, discovered vs. updated notice counts, and failure alerts.
* **📈 Platform Analytics:** Track total notices, pending reviews, verified circulars, and registered students.

---

## 🏗️ System Architecture & Workflow

```text
[College Websites & PDFs] 
        │
        ▼
[Member 4: Web Scraper] ──► [Member 7: PDF Text Extractor]
        │                                 │
        └────────────────┬────────────────┘
                         ▼
          [Member 6: MySQL Database]
                         │
                         ▼
       [Member 5: Flask API & AI Engine]
                         │
                         ▼
   [Member 1, 2 & 3: HTML/CSS/JS Frontend]

```

---

## 👥 Team Roles & Responsibilities

| Member | Role | Core Responsibilities |
| --- | --- | --- |
| **Member 1** | 🧱 **HTML Architect** | Semantic HTML5 structure, accessible forms, dashboard layouts, and consistent DOM IDs/classes. |
| **Member 2** | 🎨 **UI/UX & CSS Designer** | Responsive styling, modern SaaS dashboard design, cards, modals, and mobile compatibility. |
| **Member 3** | ⚡ **JavaScript Frontend Engineer** | Dynamic rendering, Fetch API integration, live search/filters, bookmarks, voice UI, and admin interactions. |
| **Member 4** | 🕷️ **Web Scraping Specialist** | Automated Python scrapers, duplicate detection, update tracking, and scheduled scraping logs. |
| **Member 5** | 🧠 **Backend & AI Developer** | Flask REST APIs, role-based authentication, AI summarization, Tamil/English translation, and Q&A engine. |
| **Member 6** | 🗄️ **Database Architect (DBA)** | Normalized MySQL schema (`utf8mb4` for Tamil support), foreign keys, indexes, views, and triggers. |
| **Member 7** | 📑 **PDF & Data Extractor** | Extracting text from attached PDF notices and preparing verification metadata. |

---

## 📂 Project Folder Structure

```text
ai-college-announcement-system/
├── 📁 frontend/
│   ├── index.html
│   ├── login.html
│   ├── student-dashboard.html
│   ├── admin-dashboard.html
│   ├── 📁 css/
│   │   └── style.css
│   └── 📁 js/
│       ├── api.js
│       ├── auth.js
│       ├── announcements.js
│       ├── filters.js
│       ├── bookmarks.js
│       ├── notifications.js
│       ├── ai-assistant.js
│       ├── admin.js
│       └── utils.js
├── 📁 backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── 📁 routes/
│   └── 📁 services/ (AI Summarizer, Translator, Q&A)
├── 📁 scraper/
│   ├── scraper.py
│   ├── pdf_extractor.py
│   └── scheduler.py
├── 📁 database/
│   ├── schema.sql
│   ├── seed.sql
│   ├── ER_DIAGRAM.md
│   └── SETUP_GUIDE.md
└── README.md

```

---

## 🚀 Getting Started (Local Setup)

### 1️⃣ Clone the Repository

```bash
git clone [https://github.com/your-org/ai-college-announcement-system.git](https://github.com/your-org/ai-college-announcement-system.git)
cd ai-college-announcement-system

```

### 2️⃣ Setup MySQL Database (Member 6)

1. Open **MySQL Workbench** or **phpMyAdmin**.
2. Create and initialize the database using `database/schema.sql`.
3. Load initial test accounts and sample announcements using `database/seed.sql`.

### 3️⃣ Setup Backend & AI Services (Member 5)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

```

Create a `.env` file in `backend/` with your database credentials and AI API keys:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=college_announcements_db
SECRET_KEY=your_flask_secret_key
AI_API_KEY=your_ai_api_key

```

Run the Flask server:

```bash
python app.py

```

### 4️⃣ Run Scraper & PDF Extractor (Members 4 & 7)

```bash
cd scraper
python scraper.py

```

### 5️⃣ Launch Frontend (Members 1, 2 & 3)

Open `frontend/index.html` using **VS Code Live Server** or serve via your local web server.

---

## 🔒 Security & Data Integrity Standards

* 🔐 **Password Hashing:** All user passwords are encrypted using Bcrypt/Werkzeug hashes (no plain-text storage).
* 🚫 **Zero Hallucination Policy:** Unknown publication dates remain `NULL`; AI Q&A strictly relies on verified announcement text.
* 🛡️ **XSS Protection:** All dynamic announcement content is rendered safely via `textContent` to prevent HTML injection.
* 🔗 **Source Preservation:** Every scraped announcement retains its original official college URL for verification.

---

## 🤝 Git Collaboration Workflow

1. Always pull the latest changes before starting work: `git pull origin main`
2. Create a feature branch for your module: `git checkout -b feature/memberX-task`
3. Test your changes locally and verify no console/API errors exist.
4. Commit with clear messages: `git commit -m "feat(db): add MySQL schema and triggers"`
5. Push and create a Pull Request for team review.

---
