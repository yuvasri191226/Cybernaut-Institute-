/**
 * admin.js
 * ========
 * Admin Dashboard JavaScript for Cybernaut Institute of Technology
 * Announcement Management System.
 *
 * UPDATED for UI Upgrade:
 *   - 6 stat cards (Total, Verified, Needs Review, Rejected, Important, Students)
 *   - Scraper health panel elements already in HTML — no injection needed
 *   - Admin search row already in HTML — just attach listeners
 *   - New form fields: department, year, source URL, is_important checkbox
 *   - Table has 7 columns: ID, Title, Category, Status, Date, Attachment, Actions
 *
 * Public export: initAdminDashboard()
 */

// ─── IMPORTS ─────────────────────────────────────────────────────────────────
import {
  adminGetStatistics,
  adminGetAnnouncements,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement,
  adminVerifyAnnouncement,
  adminGetScrapingLogs,
  apiFetch,
  checkBackendConnectivity,
} from './api.js';

import {
  formatDate,
  getCategoryLabel,
  showToast,
  showLoading,
  hideLoading,
  isValidUrl,
  sanitizeText,
} from './utils.js';


// ─── MODULE-LEVEL STATE ───────────────────────────────────────────────────────

/** null = Add mode, number = Edit mode (ID of announcement being edited). */
let currentEditId = null;

/** Local copy of all announcements for in-memory search/filter. */
let allAnnouncements = [];

/** True when backend is unreachable and we are using demo data. */
let _isDemoMode = false;


// ─── DEMO DATA ───────────────────────────────────────────────────────────────
/**
 * DEMO DATA — used ONLY when the backend server is not reachable.
 * Matches the 8 announcements in data/announcements.json.
 * Clearly tagged as demo — never presented as real server data.
 */
const DEMO_ANNOUNCEMENTS = [
  { id: 1, title: 'Mid-Semester Examination Schedule Released',   category: 'examination', department: 'all', target_year: 'all', status: 'Verified',      published_date: '2026-11-15', is_important: true,  attachments: [{ name: 'MidSem_Timetable_Nov2026.pdf', url: '#' }], source_url: '', description: 'Mid-semester exams run 25 Nov – 05 Dec 2026.' },
  { id: 2, title: 'Revised Academic Calendar 2026–27',            category: 'circular',    department: 'all', target_year: 'all', status: 'Verified',      published_date: '2026-11-14', is_important: false, attachments: [{ name: 'AcademicCalendar_OddSem_Revised.pdf', url: '#' }], source_url: '', description: 'Classes resume 18 November 2026.' },
  { id: 3, title: 'CYNOSURE 2026 – Annual Technical Symposium',   category: 'events',      department: 'all', target_year: 'all', status: 'Verified',      published_date: '2026-11-12', is_important: true,  attachments: [{ name: 'CYNOSURE_2026_Brochure.pdf', url: '#' }], source_url: '', description: 'CYNOSURE 2026 on 10–11 December.' },
  { id: 4, title: 'Odd Semester Results – All Branches Published', category: 'results',     department: 'all', target_year: 'all', status: 'Verified',      published_date: '2026-11-10', is_important: true,  attachments: [], source_url: '', description: 'Odd semester results for I, III, V, VII semesters.' },
  { id: 5, title: 'Campus Placement Drive – TechCorp Solutions',  category: 'placement',   department: 'CSE', target_year: '4',   status: 'Verified',      published_date: '2026-11-08', is_important: true,  attachments: [{ name: 'TechCorp_JD_ProductEngineer.pdf', url: '#' }], source_url: '', description: 'TechCorp on 28 Nov. ₹8.5 LPA.' },
  { id: 6, title: 'Practical Examination Schedule – Odd Semester', category: 'examination', department: 'all', target_year: 'all', status: 'Verified',      published_date: '2026-11-05', is_important: false, attachments: [{ name: 'PracticalExam_Schedule_Nov2026.pdf', url: '#' }], source_url: '', description: 'Practical exams from 22 November 2026.' },
  { id: 7, title: 'Merit Scholarship Applications 2026–27',       category: 'circular',    department: 'all', target_year: 'all', status: 'Needs Review', published_date: '2026-11-03', is_important: false, attachments: [{ name: 'MeritScholarship_Application_Form.pdf', url: '#' }], source_url: '', description: 'Scholarship covers 50% tuition; deadline 15 Dec.' },
  { id: 8, title: 'Hostel Mess Committee Elections & Menu Feedback', category: 'events',   department: 'all', target_year: 'all', status: 'Needs Review', published_date: '2026-11-01', is_important: false, attachments: [{ name: 'Winter_Mess_Menu_Draft.pdf', url: '#' }], source_url: '', description: 'Elections on 22 Nov. Nominations by 19 Nov.' },
];


// ─── DEMO SCRAPER DATA ────────────────────────────────────────────────────────
const DEMO_SCRAPER_LOG = {
  last_run:   '2026-11-19T08:30:00',
  status:     'Success',
  discovered: 24,
  new:        3,
  updated:    1,
  failed:     0,
};


// =============================================================================
// 1. LOAD ADMIN STATISTICS
// =============================================================================
/**
 * loadAdminStats()
 * ----------------
 * Fetches announcement statistics and updates the 6 stat cards at the top
 * of the admin dashboard:
 *   #admin-stat-total    → Total announcements
 *   #admin-stat-verified → Verified count
 *   #admin-stat-review   → Needs Review count
 *   #admin-stat-rejected → Rejected count
 *   #admin-stat-important → Important count
 *   #admin-stat-students → Total students (from API, if available)
 *
 * Shows an error placeholder if the server cannot be reached.
 * NEVER invents statistics — only real data or '—'.
 */
async function loadAdminStats() {
  // Helper to safely set a stat element's text
  function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  // Set loading state
  ['admin-stat-total', 'admin-stat-verified', 'admin-stat-review',
   'admin-stat-rejected', 'admin-stat-important', 'admin-stat-students'].forEach((id) => setStat(id, '…'));

  if (_isDemoMode) {
    // Calculate from demo data
    const total    = DEMO_ANNOUNCEMENTS.length;
    const verified = DEMO_ANNOUNCEMENTS.filter((a) => a.status === 'Verified').length;
    const review   = DEMO_ANNOUNCEMENTS.filter((a) => a.status === 'Needs Review').length;
    const rejected = DEMO_ANNOUNCEMENTS.filter((a) => a.status === 'Rejected').length;
    const important = DEMO_ANNOUNCEMENTS.filter((a) => a.is_important).length;
    setStat('admin-stat-total',     total);
    setStat('admin-stat-verified',  verified);
    setStat('admin-stat-review',    review);
    setStat('admin-stat-rejected',  rejected);
    setStat('admin-stat-important', important);
    setStat('admin-stat-students',  '—');
    return;
  }

  try {
    const stats = await adminGetStatistics();
    setStat('admin-stat-total',     stats.total     ?? '0');
    setStat('admin-stat-verified',  stats.verified  ?? '0');
    setStat('admin-stat-review',    stats.review    ?? stats.needs_review ?? '0');
    setStat('admin-stat-rejected',  stats.rejected  ?? '0');
    setStat('admin-stat-important', stats.important ?? '0');
    setStat('admin-stat-students',  stats.students  ?? '—');
  } catch (error) {
    console.error('admin.js: Failed to load statistics:', error.message);
    ['admin-stat-total', 'admin-stat-verified', 'admin-stat-review',
     'admin-stat-rejected', 'admin-stat-important', 'admin-stat-students'].forEach((id) => setStat(id, 'Err'));
  }
}


// =============================================================================
// 2. LOAD ADMIN ANNOUNCEMENTS
// =============================================================================
/**
 * loadAdminAnnouncements()
 * ------------------------
 * Fetches all announcements and renders them in the table.
 * Falls back to DEMO_ANNOUNCEMENTS when the backend is unreachable.
 */
async function loadAdminAnnouncements() {
  const tbody = document.getElementById('announcement-table-body');
  if (!tbody) return;

  showLoading(tbody);

  try {
    const data = await adminGetAnnouncements();
    const list = Array.isArray(data) ? data : (data.announcements || []);
    allAnnouncements = list;
    _isDemoMode = false;
    removeDemoBanner();
    renderAdminTable(list);
  } catch (error) {
    console.warn('admin.js: Backend not reachable, using demo data.', error.message);
    _isDemoMode = true;
    allAnnouncements = DEMO_ANNOUNCEMENTS;
    showDemoBanner();
    renderAdminTable(DEMO_ANNOUNCEMENTS);
    // Update stats using demo data
    await loadAdminStats();
  } finally {
    hideLoading(tbody);
  }
}

function showDemoBanner() {
  if (document.getElementById('demo-mode-banner')) return;
  const tableSection = document.querySelector('.admin-panel');
  if (!tableSection) return;
  const banner = document.createElement('div');
  banner.id = 'demo-mode-banner';
  banner.className = 'demo-banner';
  banner.setAttribute('role', 'alert');
  banner.textContent = '⚠ Demo mode: Backend not connected. Showing 8 sample announcements. This is NOT real data.';
  // Insert at top of page main
  const main = document.querySelector('main') || document.body;
  main.insertBefore(banner, main.firstChild);
}

function removeDemoBanner() {
  const banner = document.getElementById('demo-mode-banner');
  if (banner) banner.remove();
}


// =============================================================================
// 3. RENDER ADMIN TABLE
// =============================================================================
/**
 * renderAdminTable(announcements)
 * --------------------------------
 * Clears the table body and fills it with new rows.
 *
 * Table columns (7): ID | Title | Category | Status | Date | Attachment | Actions
 *
 * @param {Array} announcements - Array of announcement objects
 */
function renderAdminTable(announcements) {
  const tbody = document.getElementById('announcement-table-body');
  if (!tbody) return;

  // Clear everything
  tbody.textContent = '';

  if (!announcements || announcements.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 7;
    emptyCell.textContent = 'No announcements found.';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.padding = '1rem';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
    return;
  }

  announcements.forEach((announcement) => {
    const row = document.createElement('tr');
    row.dataset.id = announcement.id;
    row.dataset.category = announcement.category || '';

    // ── Col 1: ID ────────────────────────────────────────────────────────────
    const idCell = document.createElement('td');
    idCell.textContent = String(announcement.id);
    row.appendChild(idCell);

    // ── Col 2: Title ──────────────────────────────────────────────────────────
    const titleCell = document.createElement('td');
    titleCell.textContent = sanitizeText(announcement.title || '—');
    row.appendChild(titleCell);

    // ── Col 3: Category ───────────────────────────────────────────────────────
    const categoryCell = document.createElement('td');
    categoryCell.textContent = getCategoryLabel(announcement.category || '');
    row.appendChild(categoryCell);

    // ── Col 4: Verification Status ────────────────────────────────────────────
    const statusCell = document.createElement('td');
    statusCell.className = 'status-cell';
    // Support both 'status' (old API) and 'verification_status' (new JSON)
    const rawStatus = announcement.status || announcement.verification_status || 'Needs Review';
    const statusKey = getStatusKey(rawStatus);
    statusCell.dataset.status = statusKey;
    statusCell.classList.add('status-' + statusKey);
    statusCell.textContent = rawStatus;
    row.appendChild(statusCell);

    // ── Col 5: Date ───────────────────────────────────────────────────────────
    const dateCell = document.createElement('td');
    // Support both published_date (new) and date (old API)
    dateCell.textContent = formatDate(announcement.published_date || announcement.date || '');
    row.appendChild(dateCell);

    // ── Col 6: Attachment ─────────────────────────────────────────────────────
    const attachCell = document.createElement('td');
    const attachments = announcement.attachments || [];
    if (attachments.length > 0) {
      attachments.forEach((att) => {
        if (att.url && att.url !== '#') {
          const link = document.createElement('a');
          link.href = att.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = '📄 ' + sanitizeText(att.name || 'Document');
          link.style.display = 'block';
          attachCell.appendChild(link);
        } else {
          const span = document.createElement('span');
          span.textContent = '📄 ' + sanitizeText(att.name || 'Document');
          span.style.display = 'block';
          attachCell.appendChild(span);
        }
      });
    } else if (isValidUrl(announcement.document_link)) {
      // Fallback: old-format document_link field
      const link = document.createElement('a');
      link.href = announcement.document_link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '📄 View Document';
      attachCell.appendChild(link);
    } else {
      attachCell.textContent = '—';
    }
    row.appendChild(attachCell);

    // ── Col 7: Actions ────────────────────────────────────────────────────────
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions-cell';

    const makeBtn = (label, cssClass, action) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cssClass;
      btn.textContent = label;
      btn.dataset.id = announcement.id;
      btn.dataset.action = action;
      return btn;
    };

    actionsCell.appendChild(makeBtn('Edit',   'edit-button',   'edit'));
    actionsCell.appendChild(makeBtn('Delete', 'delete-button', 'delete'));
    actionsCell.appendChild(makeBtn('✓ Verify', 'verify-button', 'verify'));
    actionsCell.appendChild(makeBtn('✗ Reject', 'reject-button', 'reject'));

    row.appendChild(actionsCell);
    tbody.appendChild(row);
  });
}

/**
 * getStatusKey(status) — maps status string → CSS-safe key
 */
function getStatusKey(status) {
  if (!status) return 'unverified';
  const s = status.toLowerCase();
  if (s === 'verified') return 'verified';
  if (s === 'rejected') return 'rejected';
  return 'unverified'; // 'needs review' and anything else
}


// =============================================================================
// 4. SCRAPER HEALTH PANEL
// =============================================================================
/**
 * loadScraperStatus()
 * -------------------
 * Populates the scraper health panel elements that are already in the HTML.
 * Uses real data from the backend, or DEMO_SCRAPER_LOG if offline.
 *
 * HTML elements (all in admin-dashboard.html):
 *   #scrape-last-time, #scrape-status, #scrape-discovered,
 *   #scrape-new, #scrape-updated, #scrape-failed
 */
async function loadScraperStatus(log) {
  function setScraperEl(id, text, cssClass) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(text);
    if (cssClass) el.className = cssClass;
  }

  if (!log) {
    // Show "unavailable" state
    setScraperEl('scrape-last-time',   'Unavailable');
    setScraperEl('scrape-status',      'Unknown', 'scrape-error');
    setScraperEl('scrape-discovered',  '—');
    setScraperEl('scrape-new',         '—');
    setScraperEl('scrape-updated',     '—');
    setScraperEl('scrape-failed',      '—');
    return;
  }

  setScraperEl('scrape-last-time',  formatDate(log.last_run || log.timestamp || '') || '—');
  const status = log.status || 'Unknown';
  setScraperEl('scrape-status',     status, status === 'Success' ? 'scrape-ok' : 'scrape-error');
  setScraperEl('scrape-discovered', log.discovered ?? log.found ?? '—');
  setScraperEl('scrape-new',        log.new ?? log.added ?? '—');
  setScraperEl('scrape-updated',    log.updated ?? '—');
  setScraperEl('scrape-failed',     log.failed ?? '—');
}

/**
 * initScraperPanel()
 * ------------------
 * Loads scraper data and wires up the "Trigger Manual Scrape" button.
 */
async function initScraperPanel() {
  if (_isDemoMode) {
    // Show demo scraper data
    await loadScraperStatus(DEMO_SCRAPER_LOG);
    const triggerBtn = document.getElementById('trigger-scrape-btn');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => {
        showToast('Demo mode: Manual scrape simulation. Connect backend to trigger a real scrape.', 'info');
        // Animate to show something happened
        triggerBtn.textContent = '⏳ Scraping…';
        triggerBtn.disabled = true;
        setTimeout(() => {
          triggerBtn.textContent = '▶ Trigger Manual Scrape';
          triggerBtn.disabled = false;
          showToast('Demo scrape complete! (No real data fetched in demo mode.)', 'success');
        }, 2000);
      });
    }
    return;
  }

  try {
    const logs = await adminGetScrapingLogs();
    const log = Array.isArray(logs) ? logs[0] : logs;
    await loadScraperStatus(log || null);
  } catch (error) {
    console.warn('admin.js: Scraping status not available:', error.message);
    await loadScraperStatus(null);
  }

  // Wire the manual scrape button
  const triggerBtn = document.getElementById('trigger-scrape-btn');
  if (triggerBtn) {
    triggerBtn.addEventListener('click', async () => {
      triggerBtn.textContent = '⏳ Scraping…';
      triggerBtn.disabled = true;
      try {
        // GET /api/admin/scraping-logs triggers a scrape on the backend
        const result = await adminGetScrapingLogs();
        const log = Array.isArray(result) ? result[0] : result;
        await loadScraperStatus(log || null);
        showToast('Manual scrape triggered!', 'success');
      } catch (err) {
        showToast('Could not trigger scrape: ' + err.message, 'error');
      } finally {
        triggerBtn.textContent = '▶ Trigger Manual Scrape';
        triggerBtn.disabled = false;
      }
    });
  }
}


// =============================================================================
// 5. HANDLE ADD / EDIT ANNOUNCEMENT (Form Submit)
// =============================================================================
/**
 * handleAddAnnouncement(event)
 * ----------------------------
 * Called when the admin submits the announcement form.
 * Supports all new fields: department, target_year, source_url, is_important.
 */
async function handleAddAnnouncement(event) {
  event.preventDefault();

  const titleInput     = document.getElementById('announcement-title');
  const categoryInput  = document.getElementById('announcement-category');
  const deptInput      = document.getElementById('announcement-department');
  const yearInput      = document.getElementById('announcement-year');
  const dateInput      = document.getElementById('announcement-date');
  const descInput      = document.getElementById('announcement-description');
  const sourceInput    = document.getElementById('announcement-source-url');
  const linkInput      = document.getElementById('announcement-document-link');
  const importantInput = document.getElementById('announcement-important');
  const messageEl      = document.getElementById('announcement-form-message');
  const submitBtn      = document.getElementById('form-submit-btn');

  if (messageEl) messageEl.textContent = '';

  // ── Validation ──────────────────────────────────────────────────────────
  if (!titleInput || !titleInput.value.trim()) {
    showFormMessage(messageEl, 'Please enter a title.', 'error');
    titleInput && titleInput.focus();
    return;
  }
  if (!categoryInput || !categoryInput.value) {
    showFormMessage(messageEl, 'Please select a category.', 'error');
    categoryInput && categoryInput.focus();
    return;
  }
  if (!dateInput || !dateInput.value) {
    showFormMessage(messageEl, 'Please enter a date.', 'error');
    dateInput && dateInput.focus();
    return;
  }
  if (!descInput || !descInput.value.trim()) {
    showFormMessage(messageEl, 'Please enter a description.', 'error');
    descInput && descInput.focus();
    return;
  }

  // ── Build the data object ────────────────────────────────────────────────
  const announcementData = {
    title:         titleInput.value.trim(),
    category:      categoryInput.value,
    department:    deptInput  ? deptInput.value  : 'all',
    target_year:   yearInput  ? yearInput.value  : 'all',
    date:          dateInput.value,
    published_date: dateInput.value,
    description:   descInput.value.trim(),
    source_url:    sourceInput && sourceInput.value.trim() ? sourceInput.value.trim() : null,
    document_link: linkInput  && linkInput.value.trim()  ? linkInput.value.trim()  : '',
    is_important:  importantInput ? importantInput.checked : false,
    status:        'Needs Review', // Always Needs Review until admin explicitly verifies
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';
  }

  try {
    if (_isDemoMode) {
      // Demo mode: simulate a save
      await new Promise((r) => setTimeout(r, 800));
      const fakeId = Date.now();
      const newAnn = { id: fakeId, ...announcementData, verification_status: 'Needs Review', is_demo: true, attachments: [] };
      allAnnouncements.unshift(newAnn);
      renderAdminTable(allAnnouncements);
      await loadAdminStats();
      showFormMessage(messageEl, '✓ Demo: Announcement added locally (not saved to server).', 'success');
      showToast('Demo: Announcement added!', 'success');
      clearAnnouncementForm();
      return;
    }

    if (currentEditId !== null) {
      await adminUpdateAnnouncement(currentEditId, announcementData);
      showFormMessage(messageEl, '✓ Announcement updated successfully.', 'success');
      showToast('Announcement updated!', 'success');
    } else {
      await apiFetch('/api/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(announcementData),
      });
      showFormMessage(messageEl, '✓ Announcement added successfully.', 'success');
      showToast('New announcement added!', 'success');
    }

    clearAnnouncementForm();
    await loadAdminAnnouncements();
    await loadAdminStats();

  } catch (error) {
    console.error('admin.js: Failed to save announcement:', error.message);
    showFormMessage(messageEl, '✗ Error: ' + error.message, 'error');
    showToast('Failed to save announcement.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = currentEditId !== null ? 'Update Announcement' : 'Add Announcement';
    }
  }
}

function showFormMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = 'form-message form-message-' + type;
}

function clearAnnouncementForm() {
  const form = document.getElementById('announcement-form');
  if (form) form.reset();
  const messageEl = document.getElementById('announcement-form-message');
  if (messageEl) messageEl.textContent = '';
  const submitBtn = document.getElementById('form-submit-btn');
  if (submitBtn) submitBtn.textContent = 'Add Announcement';
  currentEditId = null;
}


// =============================================================================
// 6. HANDLE EDIT
// =============================================================================
async function handleEditAnnouncement(announcementId) {
  let announcement = allAnnouncements.find((a) => String(a.id) === String(announcementId));

  if (!announcement && !_isDemoMode) {
    try {
      const data = await adminGetAnnouncements();
      const list = Array.isArray(data) ? data : (data.announcements || []);
      announcement = list.find((a) => String(a.id) === String(announcementId));
    } catch (error) {
      console.error('admin.js: Could not fetch announcement for editing:', error.message);
      showToast('Could not load announcement data for editing.', 'error');
      return;
    }
  }

  if (!announcement) {
    showToast('Announcement not found.', 'error');
    return;
  }

  // Pre-fill form fields
  const fields = {
    'announcement-title':         announcement.title        || '',
    'announcement-category':      announcement.category     || '',
    'announcement-department':    announcement.department   || 'all',
    'announcement-year':          announcement.target_year  || announcement.year || 'all',
    'announcement-date':          announcement.published_date || announcement.date || '',
    'announcement-description':   announcement.description  || '',
    'announcement-source-url':    announcement.source_url   || '',
    'announcement-document-link': announcement.document_link || '',
  };
  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  const importantEl = document.getElementById('announcement-important');
  if (importantEl) importantEl.checked = !!announcement.is_important;

  currentEditId = announcementId;

  const submitBtn = document.getElementById('form-submit-btn');
  if (submitBtn) submitBtn.textContent = 'Update Announcement';

  const form = document.getElementById('announcement-form');
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showToast('Form ready to edit. Make your changes and click "Update Announcement".', 'info');
}


// =============================================================================
// 7. HANDLE DELETE
// =============================================================================
async function handleDeleteAnnouncement(announcementId) {
  const confirmed = window.confirm('Are you sure you want to delete this announcement? This cannot be undone.');
  if (!confirmed) return;

  if (_isDemoMode) {
    allAnnouncements = allAnnouncements.filter((a) => String(a.id) !== String(announcementId));
    renderAdminTable(allAnnouncements);
    await loadAdminStats();
    showToast('Demo: Announcement removed locally.', 'info');
    return;
  }

  try {
    await adminDeleteAnnouncement(announcementId);
    const row = document.querySelector('#announcement-table-body tr[data-id="' + announcementId + '"]');
    if (row) row.remove();
    allAnnouncements = allAnnouncements.filter((a) => String(a.id) !== String(announcementId));
    await loadAdminStats();
    showToast('Announcement deleted.', 'success');
  } catch (error) {
    console.error('admin.js: Failed to delete:', error.message);
    showToast('Failed to delete announcement: ' + error.message, 'error');
  }
}


// =============================================================================
// 8. HANDLE VERIFY / REJECT
// =============================================================================
async function handleVerifyAnnouncement(announcementId, action) {
  const isVerify = action === 'verify';
  const newStatus = isVerify ? 'Verified' : 'Rejected';

  const confirmed = window.confirm('Mark this announcement as ' + newStatus + '?');
  if (!confirmed) return;

  if (_isDemoMode) {
    const local = allAnnouncements.find((a) => String(a.id) === String(announcementId));
    if (local) local.status = newStatus;
    renderAdminTable(allAnnouncements);
    await loadAdminStats();
    showToast('Demo: Announcement marked as ' + newStatus + '.', 'success');
    return;
  }

  try {
    await adminVerifyAnnouncement(announcementId, newStatus, '');

    const row = document.querySelector('#announcement-table-body tr[data-id="' + announcementId + '"]');
    if (row) {
      const statusCell = row.querySelector('.status-cell');
      if (statusCell) {
        statusCell.classList.remove('status-verified', 'status-rejected', 'status-unverified');
        statusCell.classList.add('status-' + newStatus.toLowerCase());
        statusCell.dataset.status = newStatus.toLowerCase();
        statusCell.textContent = newStatus;
      }
    }

    const local = allAnnouncements.find((a) => String(a.id) === String(announcementId));
    if (local) local.status = newStatus;

    await loadAdminStats();
    showToast('Announcement marked as ' + newStatus + '.', 'success');

  } catch (error) {
    console.error('admin.js: Failed to update verification status:', error.message);
    showToast('Failed to update status: ' + error.message, 'error');
  }
}


// =============================================================================
// 9. ADMIN SEARCH & FILTER (HTML controls already exist — just wire them up)
// =============================================================================
function initAdminSearchFilter() {
  const searchInput    = document.getElementById('admin-search-input');
  const categoryFilter = document.getElementById('admin-category-filter');
  const statusFilter   = document.getElementById('admin-status-filter');

  function applyFilter() {
    const query    = searchInput  ? searchInput.value.trim().toLowerCase()   : '';
    const category = categoryFilter ? categoryFilter.value : 'all';
    const status   = statusFilter   ? statusFilter.value   : 'all';

    const filtered = allAnnouncements.filter((a) => {
      const titleMatch    = !query || (a.title    || '').toLowerCase().includes(query);
      const catLabelMatch = !query || getCategoryLabel(a.category || '').toLowerCase().includes(query);
      const categoryMatch = category === 'all' || a.category === category;
      const rawStatus     = a.status || a.verification_status || 'Needs Review';
      const statusMatch   = status === 'all' || rawStatus === status;
      return (titleMatch || catLabelMatch) && categoryMatch && statusMatch;
    });

    renderAdminTable(filtered);
  }

  if (searchInput)    searchInput.addEventListener('input', applyFilter);
  if (categoryFilter) categoryFilter.addEventListener('change', applyFilter);
  if (statusFilter)   statusFilter.addEventListener('change', applyFilter);
}


// =============================================================================
// 10. INIT ADMIN DASHBOARD — the main entry point called by script.js
// =============================================================================
export async function initAdminDashboard() {
  if (!document.body.classList.contains('page-admin')) return;

  console.log('admin.js: Initialising admin dashboard…');

  // ── Set admin name from sessionStorage ───────────────────────────────────
  const storedName = sessionStorage.getItem('cit_admin_name') || 'Admin';
  const nameEl = document.getElementById('admin-name-header');
  if (nameEl) nameEl.textContent = storedName;

  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) avatarEl.textContent = storedName.charAt(0).toUpperCase();

  // ── Logout button ─────────────────────────────────────────────────────────
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.clear();
      showToast('Logged out successfully.', 'info');
      setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    });
  }

  // ── Backend status pill ───────────────────────────────────────────────────
  const reachable = await checkBackendConnectivity();
  _isDemoMode = !reachable;
  _updateStatusPill(reachable);

  // ── Load all dashboard data ───────────────────────────────────────────────
  await Promise.allSettled([
    loadAdminAnnouncements(),
    loadAdminStats(),
    initScraperPanel(),
  ]);

  // ── Wire search/filter controls (already in HTML) ─────────────────────────
  initAdminSearchFilter();

  // ── Attach the form submit listener ──────────────────────────────────────
  const form = document.getElementById('announcement-form');
  if (form) {
    form.addEventListener('submit', handleAddAnnouncement);
  }

  // ── Event delegation on the table body ───────────────────────────────────
  const tbody = document.getElementById('announcement-table-body');
  if (tbody) {
    tbody.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const id     = button.dataset.id;
      if (!id) return;
      if (action === 'edit')   await handleEditAnnouncement(id);
      if (action === 'delete') await handleDeleteAnnouncement(id);
      if (action === 'verify') await handleVerifyAnnouncement(id, 'verify');
      if (action === 'reject') await handleVerifyAnnouncement(id, 'reject');
    });
  }

  // ── Session expired handler ───────────────────────────────────────────────
  document.addEventListener('session-expired', () => {
    showToast('Your session has expired. Please log in again.', 'warning');
    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
  });

  console.log('admin.js: Admin dashboard ready.');
}


// ─── Private helper: update backend status pill ───────────────────────────────
function _updateStatusPill(isLive) {
  const pill = document.getElementById('backend-status-pill');
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (!pill) return;
  if (isLive) {
    pill.className = 'status-pill status-live';
    if (dot)  dot.className  = 'status-dot dot-live';
    if (text) text.textContent = 'Live Connected';
  } else {
    pill.className = 'status-pill status-demo';
    if (dot)  dot.className  = 'status-dot dot-demo';
    if (text) text.textContent = 'Demo Mode';
  }
}
