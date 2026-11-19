# College Announcement Monitoring System

**College:** CYBERNAUT INSTITUTE OF TECHNOLOGY
**Team:** 7 members | **Member 1 (Team Leader):** HTML structure & integration
**Stack:** HTML + CSS + JavaScript (frontend) · Python Flask (backend) · MySQL (database)

This project is a college announcement portal with two user types:
**Students** (view/search/filter announcements) and **Admin** (add/edit/delete announcements).

> Current status: **HTML structure only** (Member 1's part). CSS, JS, sample data, Flask backend, MySQL schema, and PDF extraction/change detection are handled by other members — see the handover notes below.

---

## 1. Complete folder structure

```
cybernaut-institute/
├── index.html                  (Home page)
├── login.html                  (Student + Admin login forms)
├── student-dashboard.html      (Student view: search, filter, announcement cards)
├── admin-dashboard.html        (Admin view: add form + manage table)
├── css/
│   └── style.css               (placeholder — Member 2 writes the CSS here)
├── js/
│   └── script.js               (placeholder — Member 3 writes the JavaScript here)
├── data/
│   └── announcements.json      (empty array [] — Member 4 fills this)
├── images/
│   └── README.txt              (explains where to put logo.png and other images)
└── README.md                   (this file)
```

## 2. Where each file is saved

| File | Purpose | Owner |
|---|---|---|
| `index.html` | Home page: header, nav, welcome, college intro, 3 sample announcement cards, categories, footer | Member 1 |
| `login.html` | Two separate forms: Student Login and Admin Login, with empty `<span>` error placeholders | Member 1 |
| `student-dashboard.html` | Welcome message, dashboard nav, search bar, category filter, announcement cards | Member 1 |
| `admin-dashboard.html` | Admin nav, "Add Announcement" form, "Manage Announcements" table with Edit/Delete buttons | Member 1 |
| `css/style.css` | All styling. Currently contains only a placeholder comment | Member 2 |
| `js/script.js` | All behavior. Currently contains only a placeholder comment | Member 3 |
| `data/announcements.json` | Sample announcement data (currently `[]`) | Member 4 |
| `images/README.txt` | Instructions for adding `logo.png` and other images | Member 1 |
| `README.md` | This document | Member 1 |

## 3. How to run the site (VS Code + Live Server)

1. Install **Visual Studio Code** (https://code.visualstudio.com/).
2. Open VS Code, then open this folder: `File > Open Folder…` → select `cybernaut-institute`.
3. Install the Live Server extension:
   - Click the Extensions icon (or press `Ctrl+Shift+X`).
   - Search for **Live Server** by Ritwick Dey.
   - Click **Install**.
4. In the Explorer, right-click `index.html` → **Open with Live Server**.
5. The site opens in your browser at `http://127.0.0.1:5500` (port number may vary).
6. Use the navigation bar to move between Home, Student Dashboard, Admin Dashboard, and Login.

No build step, no frameworks, no server code needed — it is plain HTML/CSS/JS.

## 4. Member 1 responsibilities (Team Leader)

- Created the complete folder structure and all four HTML pages.
- Defined and enforced the **naming conventions**: kebab-case for all IDs and classes.
- Kept the **same header, navigation, and footer markup** on every page for consistency.
- Created the reusable **announcement card** structure (`article.announcement-card`) used on Home and Student Dashboard, and the matching table row structure on the Admin Dashboard.
- Added `<!-- FLASK: ... -->` comments marking where Flask will inject data and where forms will POST.
- Coordination: collect each member's work, check that IDs/classes match this README, and integrate everything.
- Integration checks: verify every page links `css/style.css` and `js/script.js` via relative paths, all internal links work, and no inline CSS/JS was introduced.
- Git/repository setup: create the repo, `.gitignore`, branch protection, and merge teammates' work.
- Review teammates' work against the naming conventions before accepting it.
- Final demo preparation: run the full flow (home → login → dashboards), prepare screenshots, and keep this README updated.

## 5. Handover instructions — Member 2 (CSS)

**File to edit:** `css/style.css` only. Do NOT edit any `.html` file, and do NOT add inline styles, `<style>` blocks, or CSS frameworks.

**What to style (all existing classes/IDs, grouped by page area):**

- Shared chrome: `.site-header`, `.logo-link`, `.logo-placeholder`, `.college-name`, `.main-navigation`, `.site-footer`
- Home: `.welcome-section`, `.welcome-label`, `.welcome-text`, `.hero-actions`, `.button-link`, `.button-link-secondary`, `.college-introduction`, `.introduction-content`, `.introduction-logo`, `.announcements-preview`, `.section-heading-row`, `.notice-categories`, `.category-grid`, `.category-card`
- Login: `.login-main`, `.page-intro`, `.login-forms`, `.login-panel`, `.login-form`, `.form-group`, `.error-message`, `.login-button`, `.form-message`
- Dashboards: `.dashboard-main`, `.admin-dashboard-main`, `.dashboard-welcome`, `.welcome-message`, `.dashboard-controls`, `.search-filter-row`, `.search-group`, `.filter-group`, `.announcements-section`
- Announcement cards (identical markup on Home + Student Dashboard): `.announcement-list`, `.announcement-card`, `.announcement-title`, `.announcement-date`, `.announcement-category`, `.announcement-description`, `.view-details-link`
- Admin form/table: `.admin-form-section`, `.announcement-form`, `.submit-button`, `.admin-table-section`, `.table-wrapper`, `.announcements-table`, `.actions-cell`, `.edit-button`, `.delete-button`

**IDs that need styling hooks** (select by ID only if necessary; prefer classes): `announcement-list`, `announcement-table-body`, `search-input`, `category-filter`, `student-login-form`, `admin-login-form`, `announcement-form`, `announcements-table`, plus the input/field IDs listed in the table below.

**State/visual hooks to add:** style `.error-message` (empty spans that will receive red text), `.form-message` (status text), `:focus` states for inputs, and `.view-details-link` as a button-style link. Add a `.button-link:hover` state.

**Do NOT change:** any HTML markup, ID names, class names, `data-*` attributes, or the `<!-- FLASK: ... -->` comments. If a needed selector is missing, tell Member 1 — do not add one yourself.

## 6. Handover instructions — Member 3 (JavaScript)

**File to edit:** `js/script.js` only. It currently holds only a comment. Do NOT edit HTML.

**IDs to target:**

| ID | Page | Use |
|---|---|---|
| `student-login-form` | login.html | Student form — validation + submit handler |
| `admin-login-form` | login.html | Admin form — validation + submit handler |
| `student-email`, `student-password` | login.html | Inputs to validate (non-empty; email pattern optional) |
| `admin-email`, `admin-password` | login.html | Inputs to validate (non-empty) |
| `student-email-error`, `student-password-error` | login.html | Empty `<span>`s — write error text into these |
| `admin-email-error`, `admin-password-error` | login.html | Empty `<span>`s — write error text into these |
| `student-login-message`, `admin-login-message` | login.html | Status message spans (e.g. "Logged in") |
| `search-input` | student-dashboard.html | Live text search over announcement cards |
| `category-filter` | student-dashboard.html | Dropdown filter; values: `all`, `examination`, `circular`, `events`, `results`, `placement` |
| `announcement-list` | index.html, student-dashboard.html | Container whose cards are shown/hidden/replaced |
| `announcement-form` | admin-dashboard.html | Add Announcement form — validation + submit handler |
| `announcement-title`, `announcement-category`, `announcement-date`, `announcement-description`, `announcement-document-link` | admin-dashboard.html | Form fields (names match future DB columns) |
| `announcement-form-message` | admin-dashboard.html | Status span for the add form |
| `announcement-table-body` | admin-dashboard.html | `<tbody>` whose rows are rendered from data |
| `student-name` | student-dashboard.html | Welcome name placeholder |

**Data attributes to use:** every card and table row has `data-id` (numeric id) and `data-category` (`examination` | `circular` | `events` | `results` | `placement`). Filter by `data-category`; identify items by `data-id`.

**Forms needing validation:** `student-login-form` (username/email + password non-empty), `admin-login-form` (same), `announcement-form` (title, category, date, description required; `document_link` optional). Write messages into the corresponding `.error-message` / `.form-message` spans — never `alert()`.

**Search & filter hooks:** `input` event on `#search-input` (match against `.announcement-title` / `.announcement-description` text), `change` event on `#category-filter`. Combine both filters. Edit/Delete buttons inside `#announcement-table-body` have classes `.edit-button` / `.delete-button` (no functionality yet — add click handlers that read the row's `data-id`).

**Do NOT:** rename any ID/class, add inline `onclick` handlers, or add `<script>` tags to HTML (the pages already load `js/script.js` with `defer`).

## 7. Table of all IDs and classes used

**IDs (kebab-case):**

| ID | Appears in |
|---|---|
| `welcome-heading`, `introduction-heading`, `latest-announcements-heading`, `categories-heading` | index.html |
| `student-login-form`, `admin-login-form` | login.html |
| `student-email`, `student-password`, `student-email-error`, `student-password-error`, `student-login-message` | login.html |
| `admin-email`, `admin-password`, `admin-email-error`, `admin-password-error`, `admin-login-message` | login.html |
| `dashboard-welcome-heading`, `student-name`, `search-input`, `category-filter`, `announcements-heading` | student-dashboard.html |
| `admin-welcome-heading`, `announcement-form`, `announcement-title`, `announcement-category`, `announcement-date`, `announcement-description`, `announcement-document-link`, `announcement-form-message`, `manage-announcements-heading`, `announcements-table`, `announcement-table-body` | admin-dashboard.html |
| `announcement-list` | index.html, student-dashboard.html |

**Classes (kebab-case):** `site-header`, `logo-link`, `logo-placeholder`, `college-name`, `main-navigation`, `site-footer`, `welcome-section`, `welcome-label`, `welcome-text`, `hero-actions`, `button-link`, `button-link-secondary`, `college-introduction`, `introduction-content`, `introduction-logo`, `announcements-preview`, `section-heading-row`, `notice-categories`, `category-grid`, `category-card`, `login-main`, `page-intro`, `login-forms`, `login-panel`, `login-form`, `form-group`, `error-message`, `login-button`, `form-message`, `dashboard-main`, `admin-dashboard-main`, `dashboard-welcome`, `welcome-message`, `dashboard-controls`, `search-filter-row`, `search-group`, `filter-group`, `announcements-section`, `announcement-list`, `announcement-card`, `announcement-title`, `announcement-date`, `announcement-category`, `announcement-description`, `view-details-link`, `admin-form-section`, `announcement-form`, `submit-button`, `admin-table-section`, `table-wrapper`, `announcements-table`, `actions-cell`, `edit-button`, `delete-button`

**Data attributes:** `data-id` (1, 2, 3, …), `data-category` (`examination`, `circular`, `events`, `results`, `placement`).

## 8. How Members 4–7 connect later

- **Member 4 (sample data):** Fill `data/announcements.json` with objects matching the card fields (`id`, `title`, `date`, `category`, `description`, `document_link`). Keep `data-category` values to the five allowed ones. Member 1 will verify the sample data renders through the existing card structure.
- **Member 5 (Flask):** Replace `action="#"` with real routes (`/student-login`, `/admin-login`, `/admin/announcements/add`). Render cards/table rows inside `#announcement-list` and `#announcement-table-body` using the existing card/row markup. All injection points are marked with `<!-- FLASK: ... -->` comments. Form field `name` attributes (`title`, `category`, `date`, `description`, `document_link`) already match future database columns.
- **Member 6 (MySQL):** Design the `announcements` table (and `users`/`students`/`admins` tables for login) with columns matching the form field names above. Provide the schema to Member 5; the HTML needs no change.
- **Member 7 (PDF extraction & change detection):** Add a Flask route + background script that parses uploaded notice PDFs, compares them with stored announcements, and flags changes. The frontend already supports a document link field (`document_link`) and a status message span (`#announcement-form-message`) for reporting results.

---

## Integration checklist (for Member 1's review)

- [ ] Every page links `css/style.css` and `js/script.js` with relative paths.
- [ ] Header, nav, and footer markup identical on all four pages.
- [ ] Every `<input>`, `<select>`, `<textarea>` has a `<label>`; every image has `alt` text.
- [ ] No inline CSS, no inline JS, no frameworks.
- [ ] All IDs/classes in kebab-case and matching the table in section 7.
- [ ] `<!-- FLASK: ... -->` comments preserved at every injection point.
- [ ] `data/announcements.json` still contains `[]` until Member 4 fills it.