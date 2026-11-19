// =============================================================================
// announcements.js – Main Announcement Display Engine
// Cybernaut Institute of Technology – Student Dashboard
// Written by Member 3
//
// This module handles everything to do with displaying announcements on the
// student dashboard:
//   • Fetching data from the backend (or falling back to demo data)
//   • Rendering rich announcement cards into the page
//   • Showing a comprehensive detail modal for a single announcement
//   • Updating the statistics panel (5 cards including Important)
//   • Setting up all filters, search, sort, and quick filter tab controls
//   • Language toggle (EN / Tamil) on individual cards
//   • Bookmarks section show/hide
// =============================================================================

// ---------------------------------------------------------------------------
// Imports from other modules in this project
// ---------------------------------------------------------------------------

import {
  formatDate,
  getCategoryLabel,
  getDepartmentLabel,
  showToast,
  showLoading,
  hideLoading,
  debounce,
} from './utils.js';

import {
  getAnnouncements,
  checkBackendConnectivity,
  markRead,
  markUnread,
  addBookmark,
  removeBookmark,
  getAnnouncementSummary,
  translateAnnouncement,
  askAssistant,
} from './api.js';

import { applyFilters, updateFilter, resetFilters, getFilterState, FilterState } from './filters.js';

import {
  getReadSet,
  getBookmarkSet,
  markAsRead,
  toggleBookmark,
} from './bookmarks.js';

// ---------------------------------------------------------------------------
// DEMO DATA — matches data/announcements.json exactly
// Used ONLY when the backend is unreachable. All tagged is_demo:true.
// ---------------------------------------------------------------------------
const DEMO_ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Mid-Semester Examination Schedule Released',
    description: 'The Controller of Examinations has released the mid-semester examination schedule for all departments. Theory examinations will begin on 25 November 2026 and end on 05 December 2026. Students must collect their hall tickets from the department office. Seating arrangements will be published on the exam cell notice board one day before each exam. Students are advised to check the timetable carefully and report any clashes to their department coordinator within 3 working days.',
    ai_summary: '• Mid-semester exams run 25 Nov – 05 Dec 2026 for all departments.\n• Hall tickets available at department offices; seating posted one day before each exam.\n• Report timetable clashes to your department coordinator within 3 working days.',
    tamil_title: 'இடைப்பருவத் தேர்வு அட்டவணை வெளியிடப்பட்டது',
    tamil_description: 'அனைத்துத் துறைகளுக்கான இடைப்பருவத் தேர்வு அட்டவணையை தேர்வுக் கட்டுப்பாட்டாளர் வெளியிட்டுள்ளார். கோட்பாடுத் தேர்வுகள் 25 நவம்பர் 2026 முதல் 05 டிசம்பர் 2026 வரை நடைபெறும்.',
    category: 'examination',
    department: 'all',
    target_year: 'all',
    published_date: '2026-11-15',
    updated_at: null,
    is_important: true,
    is_updated: false,
    source_website: 'CIT Examination Cell',
    source_url: 'https://cit.edu.in/examinations/mid-sem-schedule-nov2026',
    attachments: [{ name: 'MidSem_Timetable_Nov2026.pdf', url: 'https://cit.edu.in/docs/MidSem_Timetable_Nov2026.pdf' }],
    verification_status: 'Verified',
    is_demo: true,
  },
  {
    id: 2,
    title: 'Revised Academic Calendar 2026–27 (Odd Semester)',
    description: 'Due to the extended monsoon break, the academic calendar for the odd semester 2026–27 has been revised. Classes will now resume on 18 November 2026. The last working day is rescheduled to 20 January 2027. Internal assessment deadlines and fee payment due dates have been adjusted accordingly. All students and faculty must review the updated calendar and plan accordingly. Contact the academic section for clarifications.',
    ai_summary: '• Classes resume 18 November 2026; last working day moved to 20 January 2027.\n• Internal assessment and fee payment deadlines adjusted.\n• Contact the academic section for clarifications.',
    tamil_title: 'திருத்தப்பட்ட கல்வி நாட்காட்டி 2026–27 (ஒற்றைப் பருவம்)',
    tamil_description: 'நீடிக்கப்பட்ட மழைக்கால விடுமுறையின் காரணமாக, 2026–27 ஒற்றைப் பருவத்திற்கான கல்வி நாட்காட்டி மறுபரிசீலனை செய்யப்பட்டுள்ளது.',
    category: 'circular',
    department: 'all',
    target_year: 'all',
    published_date: '2026-11-14',
    updated_at: '2026-11-16',
    is_important: false,
    is_updated: true,
    source_website: 'CIT Academic Section',
    source_url: 'https://cit.edu.in/academics/calendar-2026-27',
    attachments: [{ name: 'AcademicCalendar_OddSem_Revised.pdf', url: 'https://cit.edu.in/docs/AcademicCalendar_OddSem_Revised.pdf' }],
    verification_status: 'Verified',
    is_demo: true,
  },
  {
    id: 3,
    title: 'CYNOSURE 2026 – Annual Technical Symposium Registration Open',
    description: 'CYNOSURE 2026, the flagship annual technical symposium of Cybernaut Institute of Technology, is scheduled for 10–11 December 2026. This year features 12 technical events including Paper Presentation, Project Expo, Hackathon, Coding Contest, Robo Race, and Circuit Debugging. Guest speakers from Google, Microsoft, and Infosys will address the opening ceremony. Registration is open for teams of 2–4 members. Entry fee: ₹200 per team. Last date for registration: 30 November 2026.',
    ai_summary: '• CYNOSURE 2026 on 10–11 December with 12 technical events.\n• Team registration (2–4 members) for ₹200; deadline 30 November 2026.\n• Guest speakers from Google, Microsoft, and Infosys; certificates for all participants.',
    tamil_title: 'CYNOSURE 2026 – ஆண்டு தொழில்நுட்ப விழா பதிவு தொடக்கம்',
    tamil_description: 'CYNOSURE 2026, சைபர்நாட் தொழில்நுட்பக் கல்வி நிறுவனத்தின் ஆண்டு தொழில்நுட்ப விழா, 10–11 டிசம்பர் 2026 அன்று நடைபெறும்.',
    category: 'events',
    department: 'all',
    target_year: 'all',
    published_date: '2026-11-12',
    updated_at: null,
    is_important: true,
    is_updated: false,
    source_website: 'CIT Events Committee',
    source_url: 'https://cit.edu.in/events/cynosure-2026',
    attachments: [{ name: 'CYNOSURE_2026_Brochure.pdf', url: 'https://cit.edu.in/docs/CYNOSURE_2026_Brochure.pdf' }],
    verification_status: 'Verified',
    is_demo: true,
  },
  {
    id: 4,
    title: 'Odd Semester Results – All Branches Published',
    description: 'The Controller of Examinations announces that odd semester results for all branches (B.Tech I, III, V, VII semesters) have been published. Students can view their results on the student portal using their roll number and date of birth. Grade cards will be distributed through department offices from 20 November 2026 onwards. Students with backlogs should contact the examination section for re-examination registration details. The last date for re-exam registration is 10 December 2026.',
    ai_summary: '• Odd semester results published for I, III, V, VII semesters (all branches).\n• View results on student portal; grade cards available from 20 November.\n• Re-exam registration deadline: 10 December 2026.',
    tamil_title: 'ஒற்றைப் பருவத் தேர்வு முடிவுகள் – அனைத்து பிரிவுகளும் வெளியிடப்பட்டன',
    tamil_description: 'அனைத்து பிரிவுகளுக்கான ஒற்றைப் பருவத் தேர்வு முடிவுகள் வெளியிடப்பட்டுள்ளன.',
    category: 'results',
    department: 'all',
    target_year: 'all',
    published_date: '2026-11-10',
    updated_at: null,
    is_important: true,
    is_updated: false,
    source_website: 'CIT Student Portal',
    source_url: 'https://cit.edu.in/results',
    attachments: [],
    verification_status: 'Verified',
    is_demo: true,
  },
  {
    id: 5,
    title: 'Campus Placement Drive – TechCorp Solutions (Product Engineer)',
    description: 'TechCorp Solutions will conduct an on-campus placement drive at Cybernaut Institute of Technology on 28 November 2026. Position: Product Engineer. Package: ₹8.5 LPA (CTC). Eligibility: B.Tech final year students (CSE, IT, ECE) with CGPA ≥ 7.0 and no active backlogs. Required documents: Updated resume, college ID card, mark sheets of all semesters, and 2 passport-size photographs. Register with the Training & Placement Cell by 25 November 2026.',
    ai_summary: '• TechCorp Solutions hiring Product Engineers on 28 Nov; ₹8.5 LPA package.\n• Eligible: Final year CSE/IT/ECE, CGPA ≥ 7.0, no backlogs.\n• Register with Placement Cell by 25 Nov; pre-placement talk 27 Nov 10 AM.',
    tamil_title: 'வளாகப் பணி நியமனம் – TechCorp Solutions (Product Engineer)',
    tamil_description: 'TechCorp Solutions நிறுவனம் 28 நவம்பர் 2026 அன்று சைபர்நாட் தொழில்நுட்பக் கல்வி நிறுவனத்தில் வளாகப் பணி நியமன முகாமை நடத்தும்.',
    category: 'placement',
    department: 'CSE',
    target_year: '4',
    published_date: '2026-11-08',
    updated_at: null,
    is_important: true,
    is_updated: false,
    source_website: 'CIT Training & Placement Cell',
    source_url: 'https://cit.edu.in/placements/techcorp-nov2026',
    attachments: [{ name: 'TechCorp_JD_ProductEngineer.pdf', url: 'https://cit.edu.in/docs/TechCorp_JD_ProductEngineer.pdf' }],
    verification_status: 'Verified',
    is_demo: true,
  },
  {
    id: 6,
    title: 'Practical Examination Schedule – Odd Semester Labs',
    description: 'Practical examinations for all odd semester laboratory courses will commence from 22 November 2026. The department-wise lab schedule is attached. Students must bring their completed lab records, observation notebooks, and college ID cards. External examiners have been appointed for all departments.',
    ai_summary: '• Practical exams start 22 November 2026 for all odd semester labs.\n• Bring lab records, observation notebooks, and college ID.\n• Check batch-wise schedule; absence without medical certificate = marked absent.',
    tamil_title: 'செய்முறைத் தேர்வு அட்டவணை – ஒற்றைப் பருவ ஆய்வகங்கள்',
    tamil_description: 'அனைத்து ஒற்றைப் பருவ ஆய்வக பாடங்களுக்கான செய்முறைத் தேர்வுகள் 22 நவம்பர் 2026 முதல் தொடங்கும்.',
    category: 'examination',
    department: 'all',
    target_year: 'all',
    published_date: '2026-11-05',
    updated_at: '2026-11-07',
    is_important: false,
    is_updated: true,
    source_website: 'CIT Examination Cell',
    source_url: 'https://cit.edu.in/examinations/practical-schedule-nov2026',
    attachments: [{ name: 'PracticalExam_Schedule_Nov2026.pdf', url: 'https://cit.edu.in/docs/PracticalExam_Schedule_Nov2026.pdf' }],
    verification_status: 'Verified',
    is_demo: true,
  },
  {
    id: 7,
    title: 'Merit Scholarship Applications – Academic Year 2026–27',
    description: 'Applications are invited for the Cybernaut Institute Merit Scholarship for the academic year 2026–27. The scholarship covers 50% of tuition fees for one year. Eligibility: Students who secured a CGPA of 8.5 or above in the previous academic year with no history of disciplinary action. Apply online through the student portal. Last date to apply: 15 December 2026.',
    ai_summary: '• Merit scholarship covers 50% tuition; requires CGPA ≥ 8.5 (previous year).\n• Apply online with mark sheets, income certificate, Aadhaar, and HOD recommendation.\n• Application deadline: 15 December 2026; interviews in January 2027.',
    tamil_title: 'தகுதி உதவித்தொகை விண்ணப்பங்கள் – 2026–27 கல்வி ஆண்டு',
    tamil_description: '2026–27 கல்வி ஆண்டிற்கான சைபர்நாட் நிறுவன தகுதி உதவித்தொகைக்கு விண்ணப்பங்கள் வரவேற்கப்படுகின்றன.',
    category: 'circular',
    department: 'all',
    target_year: 'all',
    published_date: '2026-11-03',
    updated_at: null,
    is_important: false,
    is_updated: false,
    source_website: 'CIT Scholarship Cell',
    source_url: 'https://cit.edu.in/scholarships/merit-2026-27',
    attachments: [{ name: 'MeritScholarship_Application_Form.pdf', url: 'https://cit.edu.in/docs/MeritScholarship_Application_Form.pdf' }],
    verification_status: 'Needs Review',
    is_demo: true,
  },
  {
    id: 8,
    title: 'Hostel Mess Committee Elections & New Mess Menu Feedback',
    description: 'Elections for the Hostel Mess Committee for the year 2026–27 will be held on 22 November 2026 in the common dining hall. All hostellers are eligible to vote and to nominate themselves. Nominations must be submitted to the Chief Warden\'s office by 19 November 2026. The proposed menu is available on the hostel notice board.',
    ai_summary: '• Mess committee elections on 22 Nov; nominations due by 19 Nov at Chief Warden\'s office.\n• New winter mess menu feedback due by 20 Nov via online form.\n• All hostellers are eligible to vote and nominate.',
    tamil_title: 'விடுதி உணவகக் குழு தேர்தல் & புதிய உணவு பட்டியல் கருத்துக்கள்',
    tamil_description: '2026–27 ஆண்டிற்கான விடுதி உணவகக் குழு தேர்தல் 22 நவம்பர் 2026 அன்று பொதுச் சாப்பாட்டு அரங்கில் நடைபெறும்.',
    category: 'events',
    department: 'all',
    target_year: 'all',
    published_date: '2026-11-01',
    updated_at: null,
    is_important: false,
    is_updated: false,
    source_website: 'CIT Hostel Administration',
    source_url: 'https://cit.edu.in/hostel/mess-committee-elections-2026',
    attachments: [{ name: 'Winter_Mess_Menu_Draft.pdf', url: 'https://cit.edu.in/docs/Winter_Mess_Menu_Draft.pdf' }],
    verification_status: 'Needs Review',
    is_demo: true,
  },
];

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------
let allAnnouncements = [];   // All announcements fetched (or demo data)
let isDemoMode = false;      // true when using DEMO_ANNOUNCEMENTS
let isTamilMode = false;     // true when language switcher shows Tamil


// =============================================================================
// renderAnnouncementCard(announcement, readSet, bookmarkSet)
// =============================================================================
// Creates and returns a rich <article> card element for one announcement.
// Uses only textContent (never innerHTML) for user-supplied text — prevents XSS.

export function renderAnnouncementCard(announcement, readSet, bookmarkSet) {
  const idStr = String(announcement.id);

  // ── Main card container ──────────────────────────────────────────────────
  const article = document.createElement('article');
  article.className = 'announcement-card';
  article.dataset.id = idStr;
  article.dataset.category = announcement.category || 'general';

  // Read / Unread class
  if (readSet.has(idStr)) {
    article.classList.add('is-read');
  } else {
    article.classList.add('is-unread');
  }
  if (bookmarkSet.has(idStr)) {
    article.classList.add('is-bookmarked');
  }

  // ── TOP ROW: Category badge + Department/Year tags + Important/Updated badges ─
  const topRow = document.createElement('div');
  topRow.className = 'card-top-row';

  // Category badge (color-coded via CSS class)
  const catBadge = document.createElement('span');
  catBadge.className = 'card-category-badge cat-' + (announcement.category || 'general');
  catBadge.textContent = getCategoryLabel(announcement.category);
  topRow.appendChild(catBadge);

  // Department • Year tag
  const metaTag = document.createElement('span');
  metaTag.className = 'card-meta-tag';
  const deptLabel = announcement.department && announcement.department !== 'all'
    ? announcement.department
    : 'All Depts';
  const yearLabel = (announcement.target_year || announcement.year || 'all') !== 'all'
    ? (announcement.target_year || announcement.year) + ' Year'
    : 'All Years';
  metaTag.textContent = deptLabel + ' • ' + yearLabel;
  topRow.appendChild(metaTag);

  // Status badges (Important / Updated / Demo) — right side
  const badgeGroup = document.createElement('span');
  badgeGroup.className = 'card-status-badges';

  if (announcement.is_demo) {
    const demoBadge = document.createElement('span');
    demoBadge.className = 'badge badge-demo';
    demoBadge.textContent = 'Demo';
    badgeGroup.appendChild(demoBadge);
  }
  if (announcement.is_important) {
    const impBadge = document.createElement('span');
    impBadge.className = 'badge badge-important';
    impBadge.textContent = '⭐ Important';
    badgeGroup.appendChild(impBadge);
  }
  if (announcement.is_updated) {
    const updBadge = document.createElement('span');
    updBadge.className = 'badge badge-updated';
    updBadge.textContent = '🔄 Updated';
    badgeGroup.appendChild(updBadge);
  }
  topRow.appendChild(badgeGroup);

  // Bookmark toggle button (top-right)
  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.type = 'button';
  bookmarkBtn.className = 'card-bookmark-btn' + (bookmarkSet.has(idStr) ? ' bookmarked' : '');
  bookmarkBtn.setAttribute('aria-label', bookmarkSet.has(idStr) ? 'Remove bookmark' : 'Bookmark this announcement');
  bookmarkBtn.textContent = bookmarkSet.has(idStr) ? '🔖' : '🔖';
  // We use opacity via CSS to show bookmarked state
  bookmarkBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const nowBookmarked = toggleBookmark(idStr);
    bookmarkBtn.classList.toggle('bookmarked', nowBookmarked);
    article.classList.toggle('is-bookmarked', nowBookmarked);
    updateStats(allAnnouncements, getReadSet(), getBookmarkSet());
    _syncBookmarksSection();
    showToast(nowBookmarked ? 'Bookmarked!' : 'Bookmark removed.', nowBookmarked ? 'success' : 'info');
  });
  topRow.appendChild(bookmarkBtn);

  article.appendChild(topRow);

  // ── CARD BODY ─────────────────────────────────────────────────────────────

  // Read/Unread indicator dot
  const readIndicator = document.createElement('span');
  readIndicator.className = 'read-indicator';
  readIndicator.textContent = readSet.has(idStr) ? '✓ Read' : '● Unread';
  article.appendChild(readIndicator);

  // Title (English or Tamil depending on mode)
  const titleEl = document.createElement('h3');
  titleEl.className = 'announcement-title';
  titleEl.dataset.enTitle = announcement.title || 'Untitled Announcement';
  titleEl.dataset.taTitle = announcement.tamil_title || announcement.title || 'Untitled Announcement';
  titleEl.textContent = isTamilMode && announcement.tamil_title
    ? announcement.tamil_title
    : (announcement.title || 'Untitled Announcement');
  article.appendChild(titleEl);

  // Date + Source website tag
  const metaRow = document.createElement('div');
  metaRow.className = 'card-meta-row';

  const datePara = document.createElement('span');
  datePara.className = 'card-date';
  // Support both published_date (new format) and date (old/backend format)
  const dateVal = announcement.published_date || announcement.date;
  datePara.textContent = dateVal ? formatDate(dateVal) : 'Date not available';
  metaRow.appendChild(datePara);

  if (announcement.source_website) {
    const sourceTag = document.createElement('span');
    sourceTag.className = 'card-source-tag';
    sourceTag.textContent = 'Source: ' + announcement.source_website;
    metaRow.appendChild(sourceTag);
  }
  article.appendChild(metaRow);

  // Description (2-line preview)
  const descPara = document.createElement('p');
  descPara.className = 'announcement-description';
  descPara.dataset.enDesc = announcement.description || '';
  descPara.dataset.taDesc = announcement.tamil_description || announcement.description || '';
  const descText = isTamilMode && announcement.tamil_description
    ? announcement.tamil_description
    : (announcement.description || '');
  // Show a 150-char preview
  descPara.textContent = descText.length > 150 ? descText.slice(0, 150) + '…' : descText;
  article.appendChild(descPara);

  // Attachment pill(s)
  const attachments = announcement.attachments || [];
  if (attachments.length > 0) {
    const attachRow = document.createElement('div');
    attachRow.className = 'card-attachments';
    attachments.forEach((att) => {
      const pill = document.createElement('a');
      pill.className = 'card-attachment-pill';
      pill.href = att.url || '#';
      pill.target = '_blank';
      pill.rel = 'noopener noreferrer';
      pill.textContent = '📄 ' + (att.name || 'Attachment');
      attachRow.appendChild(pill);
    });
    article.appendChild(attachRow);
  }

  // ── CARD FOOTER: Action buttons ───────────────────────────────────────────
  const footer = document.createElement('div');
  footer.className = 'card-action-footer';

  // View Details button
  const viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'card-btn btn-view-details';
  viewBtn.textContent = 'View Details';
  viewBtn.addEventListener('click', () => {
    // Mark as read when student opens the detail view
    markAsRead(idStr);
    article.classList.remove('is-unread');
    article.classList.add('is-read');
    readIndicator.textContent = '✓ Read';
    updateStats(allAnnouncements, getReadSet(), getBookmarkSet());
    showAnnouncementDetail(announcement);
  });
  footer.appendChild(viewBtn);

  // AI Summary button — inline expand
  const aiSumBtn = document.createElement('button');
  aiSumBtn.type = 'button';
  aiSumBtn.className = 'card-btn card-ai-btn btn-ai-summary';
  aiSumBtn.textContent = '✨ AI Summary';
  aiSumBtn.addEventListener('click', () => _toggleInlineSummary(article, announcement, aiSumBtn));
  footer.appendChild(aiSumBtn);

  // Language toggle button (card-level EN ↔ Tamil)
  const langBtn = document.createElement('button');
  langBtn.type = 'button';
  langBtn.className = 'card-btn card-ai-btn btn-card-lang';
  langBtn.textContent = isTamilMode ? 'EN' : 'தமிழ்';
  langBtn.addEventListener('click', () => {
    // Toggle this card only
    const currentlyTamil = article.dataset.cardLang === 'ta';
    const nextTamil = !currentlyTamil;
    article.dataset.cardLang = nextTamil ? 'ta' : 'en';
    langBtn.textContent = nextTamil ? 'EN' : 'தமிழ்';
    titleEl.textContent = nextTamil && announcement.tamil_title
      ? announcement.tamil_title
      : (announcement.title || 'Untitled Announcement');
    descPara.textContent = (() => {
      const raw = nextTamil && announcement.tamil_description
        ? announcement.tamil_description
        : (announcement.description || '');
      return raw.length > 150 ? raw.slice(0, 150) + '…' : raw;
    })();
  });
  footer.appendChild(langBtn);

  article.appendChild(footer);

  // Inline AI summary box (hidden by default, toggled by aiSumBtn)
  const inlineSummary = document.createElement('div');
  inlineSummary.className = 'card-inline-summary';
  inlineSummary.id = 'inline-summary-' + idStr;
  inlineSummary.style.display = 'none';
  article.appendChild(inlineSummary);

  return article;
}

// ---------------------------------------------------------------------------
// _toggleInlineSummary — shows/hides the AI bullet summary directly in a card
// ---------------------------------------------------------------------------
function _toggleInlineSummary(article, announcement, btn) {
  const box = article.querySelector('.card-inline-summary');
  if (!box) return;

  if (box.style.display !== 'none') {
    // Hide it
    box.style.display = 'none';
    btn.textContent = '✨ AI Summary';
    return;
  }

  // Show it — populate with the pre-written ai_summary from demo data,
  // or fetch from the backend if live.
  box.style.display = 'block';
  btn.textContent = '✨ Hide Summary';

  if (box.childElementCount > 0) return; // Already rendered

  if (announcement.ai_summary) {
    // Demo mode: use the pre-written summary
    const lines = announcement.ai_summary.split('\n');
    lines.forEach((line) => {
      const p = document.createElement('p');
      p.className = 'ai-summary-line';
      p.textContent = line;
      box.appendChild(p);
    });
    const demoLabel = document.createElement('small');
    demoLabel.className = 'ai-demo-label';
    demoLabel.textContent = '(Demo AI Summary — not generated live)';
    box.appendChild(demoLabel);
  } else {
    // Try the live backend
    const spinner = document.createElement('span');
    spinner.textContent = 'Fetching summary…';
    box.appendChild(spinner);
    getAnnouncementSummary(announcement.id).then((result) => {
      while (box.firstChild) box.removeChild(box.firstChild);
      const p = document.createElement('p');
      p.textContent = result.summary || result.text || 'No summary available.';
      box.appendChild(p);
    }).catch(() => {
      spinner.textContent = 'Summary unavailable (backend not connected).';
    });
  }
}


// =============================================================================
// renderAnnouncementList(announcements, readSet, bookmarkSet)
// =============================================================================
export function renderAnnouncementList(announcements, readSet, bookmarkSet) {
  const listContainer = document.getElementById('announcement-list');
  if (!listContainer) {
    console.error('[announcements.js] #announcement-list not found in HTML.');
    return;
  }

  // Clear existing cards
  while (listContainer.firstChild) {
    listContainer.removeChild(listContainer.firstChild);
  }

  if (announcements.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = 'empty-state-box';
    const icon = document.createElement('p');
    icon.textContent = '📭';
    icon.style.fontSize = '2rem';
    const msg = document.createElement('p');
    msg.className = 'no-results-message';
    msg.textContent = 'No announcements match your current filters. Try adjusting your search or filters.';
    noResults.appendChild(icon);
    noResults.appendChild(msg);
    listContainer.appendChild(noResults);
    return;
  }

  announcements.forEach((ann) => {
    const card = renderAnnouncementCard(ann, readSet, bookmarkSet);
    listContainer.appendChild(card);
  });
}


// =============================================================================
// showAnnouncementDetail(announcement)
// =============================================================================
// Opens a comprehensive modal dialog for a single announcement.
// Includes: language tabs, PDF box, source verification, inline AI Q&A.

export function showAnnouncementDetail(announcement) {
  // Find or create the modal container (exists in HTML as an empty div)
  let modal = document.getElementById('announcement-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'announcement-detail-modal';
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');
    document.body.appendChild(modal);
  }

  // Clear previous content
  while (modal.firstChild) modal.removeChild(modal.firstChild);

  // ── Modal inner box ──────────────────────────────────────────────────────
  const box = document.createElement('div');
  box.className = 'modal-box';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'modal-close-btn';
  closeBtn.textContent = '← Back to Announcements';
  closeBtn.setAttribute('aria-label', 'Close detail view');
  closeBtn.addEventListener('click', () => _closeModal(modal));
  box.appendChild(closeBtn);

  // Status badges row
  if (announcement.is_demo || announcement.is_important || announcement.is_updated) {
    const badges = document.createElement('div');
    badges.className = 'announcement-badges';
    if (announcement.is_demo) {
      const b = document.createElement('span');
      b.className = 'badge badge-demo';
      b.textContent = 'Demo';
      badges.appendChild(b);
    }
    if (announcement.is_important) {
      const b = document.createElement('span');
      b.className = 'badge badge-important';
      b.textContent = '⭐ Important';
      badges.appendChild(b);
    }
    if (announcement.is_updated) {
      const b = document.createElement('span');
      b.className = 'badge badge-updated';
      b.textContent = '🔄 Updated';
      badges.appendChild(b);
    }
    box.appendChild(badges);
  }

  // Title (supports language tabs below)
  const titleEl = document.createElement('h2');
  titleEl.id = 'modal-title';
  titleEl.className = 'modal-title';
  titleEl.textContent = announcement.title || 'Untitled Announcement';
  box.appendChild(titleEl);

  // ── Meta info ─────────────────────────────────────────────────────────────
  const meta = document.createElement('div');
  meta.className = 'modal-meta';

  const metaItems = [
    { label: 'Category', value: getCategoryLabel(announcement.category) },
    { label: 'Department', value: announcement.department !== 'all' ? announcement.department : 'All Departments' },
    { label: 'Target Year', value: (announcement.target_year || announcement.year || 'all') !== 'all' ? 'Year ' + (announcement.target_year || announcement.year) : 'All Years' },
    { label: 'Published', value: formatDate(announcement.published_date || announcement.date) },
  ];
  if (announcement.updated_at) {
    metaItems.push({ label: 'Last Updated', value: formatDate(announcement.updated_at) });
  }

  metaItems.forEach(({ label, value }) => {
    const span = document.createElement('span');
    span.className = 'modal-meta-item';
    const lbl = document.createElement('strong');
    lbl.textContent = label + ': ';
    span.appendChild(lbl);
    span.appendChild(document.createTextNode(value));
    meta.appendChild(span);
  });
  box.appendChild(meta);

  // ── Language / Content Tabs ───────────────────────────────────────────────
  // Three tabs: Original English | தமிழ் | AI Summary
  const tabBar = document.createElement('div');
  tabBar.className = 'modal-lang-tabs';
  tabBar.setAttribute('role', 'tablist');

  const tabs = [
    { id: 'tab-en',      label: '🇬🇧 Original English',       content: () => _makeTextContent(announcement.description) },
    { id: 'tab-ta',      label: '🇮🇳 தமிழ் மொழிபெயர்ப்பு', content: () => _makeTextContent(announcement.tamil_description || '(No Tamil translation available.)') },
    { id: 'tab-ai',      label: '✨ AI Bullet Summary',        content: () => _makeAiSummaryContent(announcement) },
  ];

  const contentArea = document.createElement('div');
  contentArea.className = 'modal-tab-content';

  let activeTab = tabs[0];

  tabs.forEach((tab) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'modal-lang-tab' + (tab === activeTab ? ' active' : '');
    btn.textContent = tab.label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab === activeTab ? 'true' : 'false');
    btn.addEventListener('click', () => {
      tabBar.querySelectorAll('.modal-lang-tab').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      // Clear and repopulate content
      while (contentArea.firstChild) contentArea.removeChild(contentArea.firstChild);
      tab.content().forEach((el) => contentArea.appendChild(el));
    });
    tabBar.appendChild(btn);
  });
  box.appendChild(tabBar);

  // Initial tab content
  activeTab.content().forEach((el) => contentArea.appendChild(el));
  box.appendChild(contentArea);

  // ── PDF Preview / Action Box ──────────────────────────────────────────────
  const attachments = announcement.attachments || [];
  if (attachments.length > 0) {
    const pdfBox = document.createElement('div');
    pdfBox.className = 'modal-pdf-box';

    const pdfHeading = document.createElement('h4');
    pdfHeading.textContent = '📄 Attached Documents';
    pdfBox.appendChild(pdfHeading);

    attachments.forEach((att) => {
      const attRow = document.createElement('div');
      attRow.className = 'pdf-attachment-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'pdf-name';
      nameSpan.textContent = att.name || 'Document';
      attRow.appendChild(nameSpan);

      if (att.url) {
        const openBtn = document.createElement('a');
        openBtn.href = att.url;
        openBtn.target = '_blank';
        openBtn.rel = 'noopener noreferrer';
        openBtn.className = 'btn-pdf-action';
        openBtn.textContent = '↗ Open';
        attRow.appendChild(openBtn);

        const dlBtn = document.createElement('a');
        dlBtn.href = att.url;
        dlBtn.download = att.name || 'document.pdf';
        dlBtn.className = 'btn-pdf-action';
        dlBtn.textContent = '⬇ Download';
        attRow.appendChild(dlBtn);
      }

      pdfBox.appendChild(attRow);
    });

    box.appendChild(pdfBox);
  }

  // ── Official Source Verification ──────────────────────────────────────────
  if (announcement.source_url) {
    const sourceBox = document.createElement('div');
    sourceBox.className = 'modal-source-verify';

    const sourceLabel = document.createElement('span');
    sourceLabel.textContent = '🔗 Official Source: ';
    sourceBox.appendChild(sourceLabel);

    const sourceLink = document.createElement('a');
    sourceLink.href = announcement.source_url;
    sourceLink.textContent = announcement.source_website || announcement.source_url;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener noreferrer';
    sourceBox.appendChild(sourceLink);

    box.appendChild(sourceBox);
  }

  // ── Modal Actions (Bookmark / Mark Read) ──────────────────────────────────
  const actionsRow = document.createElement('div');
  actionsRow.className = 'modal-actions';

  const idStr = String(announcement.id);
  const bookmarkSet = getBookmarkSet();
  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.type = 'button';
  bookmarkBtn.className = 'modal-bookmark-btn';
  const isBookmarked = bookmarkSet.has(idStr);
  bookmarkBtn.textContent = isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark';
  bookmarkBtn.addEventListener('click', () => {
    const nowBookmarked = toggleBookmark(idStr);
    bookmarkBtn.textContent = nowBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark';
    updateStats(allAnnouncements, getReadSet(), getBookmarkSet());
    _syncBookmarksSection();
    _refreshList();
  });
  actionsRow.appendChild(bookmarkBtn);

  const readSet = getReadSet();
  const readBtn = document.createElement('button');
  readBtn.type = 'button';
  readBtn.className = 'modal-read-btn';
  readBtn.textContent = readSet.has(idStr) ? 'Mark as Unread' : 'Mark as Read';
  readBtn.addEventListener('click', async () => {
    const currentlyRead = getReadSet().has(idStr);
    if (currentlyRead) {
      // mark unread
      getReadSet().delete(idStr);
      readBtn.textContent = 'Mark as Read';
      try { await markUnread(idStr); } catch { /* offline ok */ }
    } else {
      markAsRead(idStr);
      readBtn.textContent = 'Mark as Unread';
      try { await markRead(idStr); } catch { /* offline ok */ }
    }
    _refreshList();
    updateStats(allAnnouncements, getReadSet(), getBookmarkSet());
  });
  actionsRow.appendChild(readBtn);

  box.appendChild(actionsRow);

  // ── Inline AI Q&A section ─────────────────────────────────────────────────
  const aiSection = document.createElement('section');
  aiSection.className = 'modal-ai-section';

  const aiHeading = document.createElement('h3');
  aiHeading.textContent = '🤖 Ask AI About This Notice';
  aiSection.appendChild(aiHeading);

  // Quick prompt chips
  const chips = ['What is the last date?', 'Who is eligible?', 'Required documents?'];
  const chipsRow = document.createElement('div');
  chipsRow.className = 'ai-prompt-chips modal-chips';
  chips.forEach((chipText) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'prompt-chip';
    chip.textContent = chipText;
    chip.addEventListener('click', () => {
      questionInput.value = chipText;
      questionInput.focus();
    });
    chipsRow.appendChild(chip);
  });
  aiSection.appendChild(chipsRow);

  // Question input + Ask button
  const askRow = document.createElement('div');
  askRow.className = 'ask-question-row';

  const questionInput = document.createElement('input');
  questionInput.type = 'text';
  questionInput.className = 'question-input';
  questionInput.placeholder = 'Type your question here…';
  questionInput.setAttribute('aria-label', 'Type a question about this announcement');
  askRow.appendChild(questionInput);

  const askBtn = document.createElement('button');
  askBtn.type = 'button';
  askBtn.className = 'ai-btn btn-ask';
  askBtn.textContent = 'Ask';
  askBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    if (!question) { showToast('Please type a question first.', 'info'); return; }
    askBtn.textContent = 'Asking…';
    askBtn.disabled = true;
    try {
      // Try the live backend first; fall back to a demo answer
      let answer;
      try {
        const result = await askAssistant(question, announcement.id);
        answer = result.answer || result.text || JSON.stringify(result);
      } catch {
        // Demo fallback: search the announcement text for keywords
        answer = _demoAnswerFromAnnouncement(question, announcement);
      }
      _showAiResult(aiSection, answer);
    } finally {
      askBtn.textContent = 'Ask';
      askBtn.disabled = false;
    }
  });
  askRow.appendChild(askBtn);
  aiSection.appendChild(askRow);

  // AI result display area
  const aiResultArea = document.createElement('div');
  aiResultArea.className = 'ai-result-area';
  aiSection.appendChild(aiResultArea);

  box.appendChild(aiSection);

  // ── Assemble and open modal ───────────────────────────────────────────────
  modal.appendChild(box);
  modal.classList.add('modal-open');
  modal.removeAttribute('aria-hidden');
  closeBtn.focus();

  // Click outside the box → close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) _closeModal(modal);
  }, { once: true });

  // ESC key → close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      _closeModal(modal);
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// ── _makeTextContent: returns an array of paragraph elements from plain text ─
function _makeTextContent(text) {
  const p = document.createElement('p');
  p.className = 'modal-description';
  p.textContent = text || 'No content available.';
  return [p];
}

// ── _makeAiSummaryContent: returns bullet-point elements from ai_summary ─────
function _makeAiSummaryContent(announcement) {
  const wrapper = document.createElement('div');
  wrapper.className = 'modal-ai-summary-box';

  if (announcement.ai_summary) {
    const lines = announcement.ai_summary.split('\n');
    lines.forEach((line) => {
      const p = document.createElement('p');
      p.className = 'ai-summary-line';
      p.textContent = line;
      wrapper.appendChild(p);
    });
    const lbl = document.createElement('small');
    lbl.className = 'ai-demo-label';
    lbl.textContent = '(Demo AI Summary — pre-written for demonstration. Live AI requires backend connection.)';
    wrapper.appendChild(lbl);
  } else {
    const p = document.createElement('p');
    p.textContent = 'AI summary not available. Connect to the backend to generate one.';
    wrapper.appendChild(p);
  }
  return [wrapper];
}

// ── _demoAnswerFromAnnouncement: keyword-based fallback Q&A ──────────────────
function _demoAnswerFromAnnouncement(question, announcement) {
  const q = question.toLowerCase();
  const desc = (announcement.description || '') + ' ' + (announcement.ai_summary || '');

  if (q.includes('last date') || q.includes('deadline') || q.includes('due date')) {
    // Try to extract a date mention from description
    const dateMatch = desc.match(/\d{1,2}\s+\w+\s+\d{4}|\d{4}-\d{2}-\d{2}/);
    return dateMatch
      ? 'Based on the announcement text, the relevant date is: ' + dateMatch[0] + '. Please refer to the official source for confirmation.'
      : 'The exact deadline is mentioned in the announcement text above. Please read carefully and check the official source link.';
  }
  if (q.includes('eligible') || q.includes('eligibility') || q.includes('who can')) {
    return 'Eligibility details are described in the announcement body. Please read the full description and check the official source for the most accurate criteria.';
  }
  if (q.includes('document') || q.includes('required') || q.includes('bring')) {
    return 'Required documents (if any) are listed in the announcement description. Check the attached PDF for a detailed checklist.';
  }
  if (q.includes('venue') || q.includes('where') || q.includes('location')) {
    return 'The venue details are mentioned in the announcement description. Please refer to the official source or contact the concerned department.';
  }

  return 'Demo AI: I found the announcement "' + (announcement.title || '') + '". For detailed answers, please read the full description above or check the official source link. (Live AI answers require the backend server to be connected.)';
}

// ── _showAiResult: populates the AI result area ───────────────────────────────
function _showAiResult(container, text) {
  const resultArea = container.querySelector('.ai-result-area');
  if (!resultArea) return;
  while (resultArea.firstChild) resultArea.removeChild(resultArea.firstChild);
  const p = document.createElement('p');
  p.textContent = text;
  resultArea.appendChild(p);
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── _closeModal: hides the modal ──────────────────────────────────────────────
function _closeModal(modal) {
  modal.classList.remove('modal-open');
  modal.setAttribute('aria-hidden', 'true');
}


// =============================================================================
// updateStats(all, readSet, bookmarkSet)
// =============================================================================
// Updates the 5 stat cards: Total, Unread, Bookmarked, Important, Categories.

export function updateStats(all, readSet, bookmarkSet) {
  function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  setStat('stat-total', all.length);

  const readCount = all.filter((ann) => readSet.has(String(ann.id))).length;
  setStat('stat-unread', all.length - readCount);

  const bookmarkedCount = all.filter((ann) => bookmarkSet.has(String(ann.id))).length;
  setStat('stat-bookmarked', bookmarkedCount);

  const importantCount = all.filter((ann) => ann.is_important).length;
  setStat('stat-important', importantCount);

  const categories = new Set(all.map((ann) => ann.category).filter(Boolean));
  setStat('stat-categories', categories.size);
}


// =============================================================================
// loadAnnouncements()
// =============================================================================
export async function loadAnnouncements() {
  const listContainer = document.getElementById('announcement-list');
  if (!listContainer) return;

  showLoading(listContainer);

  try {
    const backendReachable = await checkBackendConnectivity();

    if (backendReachable) {
      isDemoMode = false;
      _removeDemoBanner();
      _updateStatusPill(true);
      const response = await getAnnouncements({});
      let raw = Array.isArray(response) ? response : (response.announcements || []);
      // Normalise: map 'date' → 'published_date' and 'year' → 'target_year' if missing
      allAnnouncements = raw.map((ann) => ({
        ...ann,
        published_date: ann.published_date || ann.date || null,
        target_year: ann.target_year || ann.year || 'all',
      }));
    } else {
      isDemoMode = true;
      allAnnouncements = DEMO_ANNOUNCEMENTS;
      _showDemoBanner();
      _updateStatusPill(false);
    }
  } catch (err) {
    console.error('[announcements.js] loadAnnouncements error:', err);
    isDemoMode = true;
    allAnnouncements = DEMO_ANNOUNCEMENTS;
    _showDemoBanner();
    _updateStatusPill(false);
  } finally {
    hideLoading(listContainer);
  }

  _refreshList();
  updateStats(allAnnouncements, getReadSet(), getBookmarkSet());
}


// ---------------------------------------------------------------------------
// _refreshList — applies current filter state and re-renders
// ---------------------------------------------------------------------------
function _refreshList() {
  const filtered = applyFilters(allAnnouncements);
  renderAnnouncementList(filtered, getReadSet(), getBookmarkSet());

  // Show/hide the bookmarks section based on quick filter tab
  const fs = getFilterState();
  if (fs.showBookmarkedOnly) {
    _syncBookmarksSection(true);
  }
}


// ---------------------------------------------------------------------------
// _syncBookmarksSection — updates #bookmarks-section visibility & content
// ---------------------------------------------------------------------------
function _syncBookmarksSection(forceShow = false) {
  const section = document.getElementById('bookmarks-section');
  const listEl = document.getElementById('bookmarks-list');
  if (!section || !listEl) return;

  const bSet = getBookmarkSet();
  const bookmarkedAnns = allAnnouncements.filter((ann) => bSet.has(String(ann.id)));

  if (!forceShow && bookmarkedAnns.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';

  // Clear and re-render bookmarks list
  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

  if (bookmarkedAnns.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'no-results-message';
    empty.textContent = 'No bookmarked announcements yet. Click the 🔖 on any card to save it here.';
    listEl.appendChild(empty);
    return;
  }

  bookmarkedAnns.forEach((ann) => {
    const card = renderAnnouncementCard(ann, getReadSet(), getBookmarkSet());
    listEl.appendChild(card);
  });
}


// ---------------------------------------------------------------------------
// _showDemoBanner / _removeDemoBanner
// ---------------------------------------------------------------------------
function _showDemoBanner() {
  if (document.getElementById('demo-mode-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'demo-mode-banner';
  banner.className = 'demo-banner';
  banner.setAttribute('role', 'alert');
  banner.textContent =
    '⚠ Demo mode: Backend not connected. Showing 8 sample announcements for demonstration only. Data is NOT real.';
  const listContainer = document.getElementById('announcement-list');
  if (listContainer && listContainer.parentElement) {
    listContainer.parentElement.insertBefore(banner, listContainer);
  }
}

function _removeDemoBanner() {
  const banner = document.getElementById('demo-mode-banner');
  if (banner) banner.remove();
}


// ---------------------------------------------------------------------------
// _updateStatusPill — updates the header backend status pill
// ---------------------------------------------------------------------------
function _updateStatusPill(isLive) {
  const pill = document.getElementById('backend-status-pill');
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (!pill) return;
  if (isLive) {
    pill.className = 'status-pill status-live';
    if (dot) dot.className = 'status-dot dot-live';
    if (text) text.textContent = 'Live Connected';
  } else {
    pill.className = 'status-pill status-demo';
    if (dot) dot.className = 'status-dot dot-demo';
    if (text) text.textContent = 'Demo Mode';
  }
}


// =============================================================================
// initStudentDashboard() — the main entry point called by script.js
// =============================================================================
export async function initStudentDashboard() {
  if (!document.body.classList.contains('page-student')) return;

  // ── Set student name from sessionStorage ──────────────────────────────────
  const storedName = sessionStorage.getItem('cit_student_name') || 'Student';
  const storedDept = sessionStorage.getItem('cit_student_dept') || 'CSE • 3rd Year';

  const nameEl = document.getElementById('student-name');
  if (nameEl) nameEl.textContent = storedName;

  const nameHeaderEl = document.getElementById('student-name-header');
  if (nameHeaderEl) nameHeaderEl.textContent = storedName;

  const deptHeaderEl = document.getElementById('student-dept-header');
  if (deptHeaderEl) deptHeaderEl.textContent = storedDept;

  // Avatar initial
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) avatarEl.textContent = storedName.charAt(0).toUpperCase() || 'S';

  // ── Logout button ─────────────────────────────────────────────────────────
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.clear();
      showToast('Logged out successfully.', 'info');
      setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    });
  }

  // ── Language switcher ─────────────────────────────────────────────────────
  const langBtn = document.getElementById('lang-switch-btn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      isTamilMode = !isTamilMode;
      langBtn.classList.toggle('active-tamil', isTamilMode);
      langBtn.textContent = isTamilMode ? 'தமிழ் | EN' : 'EN | தமிழ்';
      // Re-render all cards to reflect the new language mode
      _refreshList();
      showToast(isTamilMode ? 'Language: தமிழ்' : 'Language: English', 'info');
    });
  }

  // ── Notification bell (bell already in HTML — just wire up panel toggle) ──
  const bellBtn = document.getElementById('notif-bell-btn');
  const notifPanel = document.getElementById('notif-panel');
  const markAllBtn = document.getElementById('notif-mark-all');

  if (bellBtn && notifPanel) {
    bellBtn.addEventListener('click', () => {
      notifPanel.classList.toggle('is-open');
    });
  }

  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      // Mark all notification items as read visually
      notifPanel.querySelectorAll('.notif-item--unread').forEach((item) => {
        item.classList.replace('notif-item--unread', 'notif-item--read');
      });
      const badge = document.getElementById('notif-count-badge');
      if (badge) badge.textContent = '0';
      showToast('All notifications marked as read.', 'success');
    });
  }

  // Close notification panel when clicking outside
  document.addEventListener('click', (e) => {
    if (notifPanel && notifPanel.classList.contains('is-open')) {
      if (!notifPanel.contains(e.target) && e.target !== bellBtn && !bellBtn?.contains(e.target)) {
        notifPanel.classList.remove('is-open');
      }
    }
  });

  // ── Attach filter / search / sort listeners ───────────────────────────────
  _attachFilterListeners();

  // ── Attach quick filter tab listeners ────────────────────────────────────
  _attachQuickFilterTabs();

  // ── Handle URL hash deep-linking ─────────────────────────────────────────
  _handleUrlHash();

  // ── Load announcements ────────────────────────────────────────────────────
  await loadAnnouncements();

  // ── Session expired handler ───────────────────────────────────────────────
  document.addEventListener('session-expired', () => {
    showToast('Your session has expired. Please log in again.', 'warning');
    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
  });

  // ── Listen for 'open-announcement' event (from notification panel) ────────
  document.addEventListener('open-announcement', (e) => {
    const targetId = e.detail && e.detail.id ? String(e.detail.id) : null;
    if (!targetId) return;
    const ann = allAnnouncements.find((a) => String(a.id) === targetId);
    if (ann) showAnnouncementDetail(ann);
  });
}


// ---------------------------------------------------------------------------
// _attachFilterListeners — wires up all filter/search/sort controls
// ---------------------------------------------------------------------------
function _attachFilterListeners() {
  function onSelectChange(id, filterKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      updateFilter(filterKey, el.value);
      _refreshList();
    });
  }

  onSelectChange('category-filter',  'category');
  onSelectChange('department-filter', 'department');
  onSelectChange('year-filter',      'year');
  onSelectChange('sort-select',      'sort');

  // Search input with debounce (300ms wait after last keystroke)
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    const debouncedSearch = debounce((e) => {
      updateFilter('search', e.target.value);
      _refreshList();
    }, 300);
    searchInput.addEventListener('input', debouncedSearch);
  }

  // Reset Filters button (already in HTML — just attach listener)
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetFilters();
      // Reset visual state of all controls
      const controls = {
        'search-input':      '',
        'category-filter':   'all',
        'department-filter': 'all',
        'year-filter':       'all',
        'sort-select':       'newest',
      };
      Object.entries(controls).forEach(([id, defaultVal]) => {
        const el = document.getElementById(id);
        if (el) el.value = defaultVal;
      });
      // Reset quick filter tabs
      document.querySelectorAll('.quick-tab').forEach((tab) => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
        if (tab.dataset.filter === 'all') {
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
        }
      });
      _refreshList();
      showToast('Filters have been reset.', 'info');
    });
  }
}


// ---------------------------------------------------------------------------
// _attachQuickFilterTabs — handles the 5 quick filter tabs
// ---------------------------------------------------------------------------
function _attachQuickFilterTabs() {
  const tabsContainer = document.getElementById('quick-filter-tabs');
  if (!tabsContainer) return;

  tabsContainer.querySelectorAll('.quick-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      // Update active tab style
      tabsContainer.querySelectorAll('.quick-tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const filter = tab.dataset.filter;

      // Reset special filter flags first
      updateFilter('showImportantOnly', false);
      updateFilter('showUnreadOnly', false);
      updateFilter('showBookmarkedOnly', false);
      updateFilter('showUpdatedOnly', false);

      // Show/hide bookmarks section
      const bookmarksSection = document.getElementById('bookmarks-section');

      switch (filter) {
        case 'all':
          if (bookmarksSection) bookmarksSection.style.display = 'none';
          break;
        case 'important':
          updateFilter('showImportantOnly', true);
          if (bookmarksSection) bookmarksSection.style.display = 'none';
          break;
        case 'unread':
          updateFilter('showUnreadOnly', true);
          if (bookmarksSection) bookmarksSection.style.display = 'none';
          break;
        case 'bookmarked':
          updateFilter('showBookmarkedOnly', true);
          // Show the bookmarks section and hide the main announcement list
          _syncBookmarksSection(true);
          const listContainer = document.getElementById('announcement-list');
          // We still render into announcement-list (filtered to bookmarks)
          break;
        case 'updated':
          updateFilter('showUpdatedOnly', true);
          if (bookmarksSection) bookmarksSection.style.display = 'none';
          break;
      }

      _refreshList();
    });
  });
}


// ---------------------------------------------------------------------------
// _handleUrlHash — pre-selects category from URL hash
// ---------------------------------------------------------------------------
function _handleUrlHash() {
  const hash = window.location.hash.replace('#', '').trim().toLowerCase();
  if (!hash) return;
  const knownCategories = ['examination', 'circular', 'events', 'results', 'placement'];
  if (knownCategories.includes(hash)) {
    updateFilter('category', hash);
    const catFilter = document.getElementById('category-filter');
    if (catFilter) catFilter.value = hash;
  }
}
