/**
 * =============================================================================
 * js/script.js  –  MAIN ENTRY POINT
 * Cybernaut Institute of Technology – College Announcement System
 * =============================================================================
 *
 * This is the ONE script file linked in ALL four HTML pages.
 * It detects which page it is on (by reading the <body> class) and calls
 * the right initialisation functions for that page.
 *
 * =============================================================================
 * ⚠️  IMPORTANT — ES modules require a web server  ⚠️
 * =============================================================================
 * This file uses ES module `import` statements. These only work over
 * http:// or https://, NOT over file:// (double-clicking in Explorer).
 *
 * To run a local web server:
 *   - VS Code: install "Live Server" extension → click "Go Live"
 *   - Terminal: cd into the project folder, run: npx serve .
 *
 * The <script> tag in every HTML file must be:
 *   <script type="module" src="js/script.js"></script>
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// 1. IMPORTS
// ---------------------------------------------------------------------------
import { initLoginPage }        from './auth.js';
import { initStudentDashboard } from './announcements.js';
import { initAdminDashboard }   from './admin.js';
import { initNotifications }    from './notifications.js';
import { checkBackendConnectivity, getAnnouncements } from './api.js';
import { showToast } from './utils.js';


// ---------------------------------------------------------------------------
// 2. CATEGORY LABEL HELPER  (used on the home page preview cards)
// ---------------------------------------------------------------------------
function getCategoryLabel(value) {
  const labels = {
    examination: 'Examination Notifications',
    circular:    'College Circulars',
    events:      'Events and Workshops',
    results:     'Results',
    placement:   'Placement Announcements',
  };
  return labels[value] || 'General';
}


// ---------------------------------------------------------------------------
// 3. FORMAT DATE HELPER  (used on the home page preview cards)
// ---------------------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return 'Date not available';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Date not available';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return 'Date not available';
  }
}


// ---------------------------------------------------------------------------
// 4. HOME PAGE INITIALISATION
// ---------------------------------------------------------------------------
async function initHomePage() {
  const announcementList = document.getElementById('announcement-list');
  if (!announcementList) return;

  try {
    const data = await getAnnouncements({ limit: 3, sort: 'latest' });
    const announcements = Array.isArray(data)
      ? data
      : (data && Array.isArray(data.announcements) ? data.announcements : null);

    if (announcements && announcements.length > 0) {
      announcementList.innerHTML = '';
      announcements.forEach(function (item) {
        const card = document.createElement('article');
        card.className = 'announcement-card';
        card.dataset.id       = item.id       || '';
        card.dataset.category = item.category || '';

        const title = document.createElement('h3');
        title.className = 'announcement-title';
        title.textContent = item.title || 'Untitled Announcement';

        const date = document.createElement('p');
        date.className = 'announcement-date';
        date.textContent = formatDate(item.published_date || item.date || item.created_at);

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'announcement-category';
        categoryBadge.textContent = getCategoryLabel(item.category);

        const description = document.createElement('p');
        description.className = 'announcement-description';
        description.textContent = item.summary || item.description
          || (item.body ? item.body.slice(0, 120) + '…' : 'No description available.');

        const link = document.createElement('a');
        link.href = 'student-dashboard.html';
        link.className = 'view-details-link';
        link.textContent = 'View Details';

        card.appendChild(title);
        card.appendChild(date);
        card.appendChild(categoryBadge);
        card.appendChild(description);
        card.appendChild(link);
        announcementList.appendChild(card);
      });
    } else {
      addDemoNote(announcementList);
    }
  } catch (error) {
    console.warn('[script.js] Could not fetch announcements from backend:', error.message);
    addDemoNote(announcementList);
  }
}

function addDemoNote(container) {
  if (container.querySelector('.demo-note')) return;
  const note = document.createElement('p');
  note.className = 'demo-note';
  note.textContent = '(Showing sample announcements – live data unavailable)';
  note.style.cssText = 'font-size:0.8rem;color:#888;margin-top:0.5rem;text-align:center;';
  container.appendChild(note);
}


// ---------------------------------------------------------------------------
// 5. FLOATING AI CHAT WIDGET  (student-dashboard.html only)
// ---------------------------------------------------------------------------
/**
 * initAiChatWidget()
 * ------------------
 * Wires up the floating AI chat widget that lives in student-dashboard.html.
 * Elements already exist in HTML — this function just attaches behaviour.
 *
 * Features:
 *   - FAB button opens/closes the chat drawer
 *   - Quick prompt chips populate the input field
 *   - Send button (and Enter key) sends a message
 *   - Voice input via Web Speech API (SpeechRecognition)
 *   - Demo-mode smart answers when backend is offline
 */
function initAiChatWidget() {
  const fabBtn      = document.getElementById('ai-fab-btn');
  const drawer      = document.getElementById('ai-chat-drawer');
  const closeBtn    = document.getElementById('ai-chat-close');
  const chatBody    = document.getElementById('ai-chat-body');
  const chatInput   = document.getElementById('ai-chat-input');
  const sendBtn     = document.getElementById('ai-send-btn');
  const voiceBtn    = document.getElementById('ai-voice-btn');
  const voiceStatus = document.getElementById('ai-voice-status');
  const voiceText   = document.getElementById('voice-status-text');
  const chipsEl     = document.getElementById('ai-prompt-chips');

  // Guard: if the drawer doesn't exist (not on this page), skip
  if (!fabBtn || !drawer) return;

  // ── Open / Close drawer ───────────────────────────────────────────────────
  fabBtn.addEventListener('click', () => {
    const isOpen = drawer.style.display !== 'none';
    drawer.style.display = isOpen ? 'none' : 'flex';
    fabBtn.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen && chatInput) chatInput.focus();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      drawer.style.display = 'none';
      fabBtn.setAttribute('aria-expanded', 'false');
    });
  }

  // ── Quick prompt chips ────────────────────────────────────────────────────
  if (chipsEl) {
    chipsEl.querySelectorAll('.prompt-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        if (chatInput) {
          chatInput.value = chip.dataset.prompt || chip.textContent;
          chatInput.focus();
        }
      });
    });
  }

  // ── Send message ──────────────────────────────────────────────────────────
  function sendMessage() {
    if (!chatInput) return;
    const question = chatInput.value.trim();
    if (!question) return;

    // Add user message bubble
    _addChatBubble(chatBody, question, 'user');
    chatInput.value = '';

    // Add thinking indicator
    const thinkingId = 'thinking-' + Date.now();
    _addChatBubble(chatBody, '…', 'ai', thinkingId);

    // Get answer (demo fallback if backend not connected)
    _getChatAnswer(question).then((answer) => {
      const thinking = document.getElementById(thinkingId);
      if (thinking) thinking.remove();
      _addChatBubble(chatBody, answer, 'ai');
      chatBody.scrollTop = chatBody.scrollHeight;
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // ── Voice input ───────────────────────────────────────────────────────────
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (voiceBtn) {
    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      let isListening = false;

      voiceBtn.addEventListener('click', () => {
        if (isListening) {
          recognition.stop();
          return;
        }
        recognition.start();
      });

      recognition.addEventListener('start', () => {
        isListening = true;
        voiceBtn.classList.add('listening');
        if (voiceStatus) voiceStatus.style.display = 'flex';
        if (voiceText) voiceText.textContent = 'Listening…';
      });

      recognition.addEventListener('result', (e) => {
        const transcript = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join('');
        if (chatInput) chatInput.value = transcript;
        if (voiceText) voiceText.textContent = 'Heard: "' + transcript + '"';
      });

      recognition.addEventListener('end', () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        if (voiceStatus) voiceStatus.style.display = 'none';
      });

      recognition.addEventListener('error', (e) => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        if (voiceStatus) voiceStatus.style.display = 'none';
        showToast('Voice recognition error: ' + e.error, 'error');
      });

    } else {
      // Browser does not support Web Speech API
      voiceBtn.disabled = true;
      voiceBtn.title = 'Voice input not supported in this browser. Try Chrome.';
    }
  }
}

/**
 * _addChatBubble — appends a message bubble to the chat body
 * @param {HTMLElement} chatBody
 * @param {string} text
 * @param {'user'|'ai'} role
 * @param {string} [id]
 */
function _addChatBubble(chatBody, text, role, id) {
  if (!chatBody) return;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-' + role;
  if (id) bubble.id = id;
  bubble.textContent = text;
  chatBody.appendChild(bubble);
  chatBody.scrollTop = chatBody.scrollHeight;
}

/**
 * _getChatAnswer — returns a demo answer or calls the backend
 * Uses the globally available DEMO_ANNOUNCEMENTS from announcements.js via
 * a simple keyword match — clearly labeled as demo, never presented as real AI.
 *
 * @param {string} question
 * @returns {Promise<string>}
 */
async function _getChatAnswer(question) {
  const q = question.toLowerCase().trim();

  // Try the backend first
  try {
    const { askAssistant } = await import('./api.js');
    const result = await askAssistant(question);
    return result.answer || result.text || 'No answer from server.';
  } catch {
    // Backend offline → demo fallback answers
  }

  // ── Demo fallback: keyword-based answers ──────────────────────────────────
  // These use keywords to give relevant-sounding answers about college notices.
  // They are NOT real AI — they are clearly labeled as demo responses.

  if (q.includes('exam') || q.includes('timetable') || q.includes('schedule')) {
    return '📝 Demo AI: Mid-semester exams run 25 Nov – 05 Dec 2026. Practical exams start 22 Nov. Hall tickets are available at department offices. (This is a demo answer — connect the backend for real AI responses.)';
  }
  if (q.includes('placement') || q.includes('job') || q.includes('drive') || q.includes('techcorp')) {
    return '💼 Demo AI: TechCorp Solutions is hiring Product Engineers on 28 Nov 2026. Package: ₹8.5 LPA. Eligible: Final year CSE/IT/ECE with CGPA ≥ 7.0. Register with Placement Cell by 25 Nov. (Demo mode)';
  }
  if (q.includes('result') || q.includes('marks') || q.includes('grade')) {
    return '📊 Demo AI: Odd semester results for I, III, V, VII semesters are published. View on the student portal. Grade cards available from 20 Nov. Re-exam registration deadline: 10 Dec 2026. (Demo mode)';
  }
  if (q.includes('important') || q.includes('urgent') || q.includes('critical')) {
    return '⭐ Demo AI: Currently important notices include: (1) Mid-Semester Exam Schedule, (2) Campus Placement Drive – TechCorp, (3) CYNOSURE 2026 Symposium, (4) Odd Semester Results. Click the ⭐ Important quick filter to see all. (Demo mode)';
  }
  if (q.includes('cynosure') || q.includes('symposium') || q.includes('event') || q.includes('fest')) {
    return '🎓 Demo AI: CYNOSURE 2026 is on 10–11 December 2026. 12 technical events, team registration (2–4 members) for ₹200. Last date: 30 November 2026. Guest speakers from Google, Microsoft, Infosys. (Demo mode)';
  }
  if (q.includes('scholarship') || q.includes('merit') || q.includes('fee')) {
    return '🏅 Demo AI: Merit Scholarship applications are open for 2026–27. Requires CGPA ≥ 8.5. Covers 50% tuition fee. Apply online by 15 December 2026. (Demo mode)';
  }
  if (q.includes('hostel') || q.includes('mess') || q.includes('food')) {
    return '🏠 Demo AI: Mess Committee elections are on 22 Nov 2026. Submit nominations to the Chief Warden by 19 Nov. New winter menu feedback due by 20 Nov via the student portal. (Demo mode)';
  }
  if (q.includes('summarize') || q.includes('summary') || q.includes('latest') || q.includes('new')) {
    return '📋 Demo AI: Latest 3 notices:\n1. Mid-Semester Exam Schedule (25 Nov – 05 Dec)\n2. CYNOSURE 2026 Symposium registration (deadline 30 Nov)\n3. TechCorp Placement Drive (28 Nov, CSE/IT/ECE final year)\n(Demo mode — connect backend for real-time summaries)';
  }

  // Generic fallback
  return '🤖 Demo AI: I searched through the sample announcements but couldn\'t find a specific answer for "' + question + '". Try asking about exams, placements, results, or events. For real AI answers, the Flask backend must be connected. (Demo mode)';
}


// ---------------------------------------------------------------------------
// 6. GLOBAL KEYBOARD HANDLER
// ---------------------------------------------------------------------------
function initGlobalKeyboardHandler() {
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;

    // Close any open modals
    const openModals = document.querySelectorAll(
      '.modal-overlay.modal-open, .modal[style*="display: flex"], .modal[style*="display:flex"]'
    );
    openModals.forEach(function (modal) {
      modal.classList.remove('modal-open');
      modal.setAttribute('aria-hidden', 'true');
    });

    // Close the AI chat drawer
    const aiDrawer = document.getElementById('ai-chat-drawer');
    if (aiDrawer && aiDrawer.style.display !== 'none') {
      aiDrawer.style.display = 'none';
      const fab = document.getElementById('ai-fab-btn');
      if (fab) fab.setAttribute('aria-expanded', 'false');
    }

    // Close the notification panel
    const notifPanel = document.getElementById('notif-panel');
    if (notifPanel) notifPanel.classList.remove('is-open');

    // Let other modules know panels should close
    document.dispatchEvent(new CustomEvent('close-panels', {
      bubbles: true,
      detail: { source: 'escape-key' },
    }));
  });
}


// ---------------------------------------------------------------------------
// 7. ARIA CURRENT-PAGE CHECK  (accessibility helper)
// ---------------------------------------------------------------------------
function verifyAriaCurrentPage() {
  const currentLink = document.querySelector('nav a[aria-current="page"]');
  if (!currentLink) {
    console.warn(
      '[script.js] No nav link has aria-current="page". ' +
      'Add aria-current="page" to the correct <a> tag in this page\'s HTML.'
    );
  }
}


// ---------------------------------------------------------------------------
// 8. SESSION-EXPIRED HANDLER
// ---------------------------------------------------------------------------
function initSessionExpiredHandler() {
  document.addEventListener('session-expired', function () {
    showSimpleToast('Your session has expired. Please log in again.');
    setTimeout(function () {
      window.location.href = 'login.html';
    }, 2000);
  });
}

function showSimpleToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    Object.assign(container.style, {
      position: 'fixed', top: '1rem', right: '1rem',
      zIndex: '9999', display: 'flex', flexDirection: 'column', gap: '0.5rem',
    });
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast toast-info';
  toast.textContent = message;
  Object.assign(toast.style, {
    background: '#1a56db', color: '#fff',
    padding: '0.75rem 1.25rem', borderRadius: '0.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: '0.95rem', maxWidth: '320px',
  });
  container.appendChild(toast);
  setTimeout(function () {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 4000);
}


// ---------------------------------------------------------------------------
// 9. MAIN IIFE
// ---------------------------------------------------------------------------
(async function main() {

  // Register global handlers first (they should work on every page)
  initGlobalKeyboardHandler();
  initSessionExpiredHandler();

  const bodyClass = document.body.classList;

  try {

    if (bodyClass.contains('page-home')) {
      // HOME PAGE (index.html)
      verifyAriaCurrentPage();
      await initHomePage();

    } else if (bodyClass.contains('page-login')) {
      // LOGIN PAGE (login.html)
      verifyAriaCurrentPage();
      initLoginPage();

    } else if (bodyClass.contains('page-student')) {
      // STUDENT DASHBOARD (student-dashboard.html)
      await initStudentDashboard();
      await initNotifications();
      initAiChatWidget();         // ← floating AI chat widget

    } else if (bodyClass.contains('page-admin')) {
      // ADMIN DASHBOARD (admin-dashboard.html)
      await initAdminDashboard();
      await initNotifications();

    } else {
      console.info('[script.js] No known page class found on <body>. No module initialised.');
    }

  } catch (error) {
    console.error('[script.js] Error during page initialisation:', error);
  }

})();


// ---------------------------------------------------------------------------
// END OF FILE — This file exports nothing; it is the entry point.
// ---------------------------------------------------------------------------
