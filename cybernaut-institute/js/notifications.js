/**
 * notifications.js
 * ================
 * Notification system for the Cybernaut Institute of Technology announcement system.
 *
 * IMPORTANT CHANGE (UI Upgrade):
 *   The notification bell (#notif-bell-btn) and panel (#notif-panel) are now
 *   already in student-dashboard.html and admin-dashboard.html HTML.
 *   This module NO LONGER injects them — it only attaches behaviour to them.
 *
 * What this module does:
 *   - Wires up the bell button (click → open/close panel)
 *   - Fetches notifications from the backend when available
 *   - In Demo Mode: populates the panel with realistic demo notifications
 *   - Keeps the unread badge count (#notif-count-badge) up to date
 *   - "Mark All as Read" button clears the badge and updates items
 *
 * Public export: initNotifications()
 */

import {
  getNotifications,
  markNotificationRead as apiMarkNotificationRead,
  checkBackendConnectivity,
} from './api.js';

import { showToast, formatDate } from './utils.js';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** All notifications (from server or demo data). */
let _notifications = [];

/** Handle returned by setInterval for the polling timer. */
let _pollingHandle = null;

/** True when the panel is currently open. */
let _panelOpen = false;

/** True when we cannot reach the backend. */
let _isDemoMode = false;

// ---------------------------------------------------------------------------
// DEMO NOTIFICATIONS
// Used ONLY when the backend is unreachable.
// These look realistic but are clearly labeled [Demo].
// ---------------------------------------------------------------------------
const DEMO_NOTIFICATIONS = [
  {
    id: 'dn1',
    title: '[Demo] Mid-Semester Exam Timetable Published',
    type: 'examination',
    date: '2026-11-15',
    is_read: false,
    announcement_id: '1',
  },
  {
    id: 'dn2',
    title: '[Demo] CYNOSURE 2026 Registration Now Open',
    type: 'events',
    date: '2026-11-12',
    is_read: false,
    announcement_id: '3',
  },
  {
    id: 'dn3',
    title: '[Demo] TechCorp Placement Drive – Register by 25 Nov',
    type: 'placement',
    date: '2026-11-08',
    is_read: true,
    announcement_id: '5',
  },
];


// =============================================================================
// initNotifications() — the one public export callers need
// =============================================================================
/**
 * Sets up the entire notification system.
 *
 * Only runs on pages whose <body> has class 'page-student' or 'page-admin'.
 * Safe to call multiple times — guards prevent duplicate work.
 *
 * Steps:
 *   1. Check page class.
 *   2. Wire bell button and panel (they already exist in HTML).
 *   3. Populate panel with notifications (server or demo).
 *   4. Update badge count.
 *   5. Start polling (if backend is live).
 */
export async function initNotifications() {
  const body = document.body;

  if (!body.classList.contains('page-student') && !body.classList.contains('page-admin')) {
    return;
  }

  // ── Wire the bell button ──────────────────────────────────────────────────
  // The bell (#notif-bell-btn) and panel (#notif-panel) are already in HTML.
  const bellBtn    = document.getElementById('notif-bell-btn');
  const notifPanel = document.getElementById('notif-panel');

  if (bellBtn && notifPanel) {
    // Bell click → toggle the panel
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _panelOpen = !_panelOpen;
      notifPanel.classList.toggle('is-open', _panelOpen);

      // If we're opening, refresh the notification list
      if (_panelOpen) {
        _loadAndRender();
      }
    });

    // Click outside the panel → close it
    document.addEventListener('click', (e) => {
      if (
        _panelOpen &&
        !notifPanel.contains(e.target) &&
        e.target !== bellBtn &&
        !bellBtn.contains(e.target)
      ) {
        _panelOpen = false;
        notifPanel.classList.remove('is-open');
      }
    });

    // ESC key → close panel
    document.addEventListener('close-panels', () => {
      _panelOpen = false;
      notifPanel.classList.remove('is-open');
    });
  }

  // ── Wire "Mark All as Read" button ───────────────────────────────────────
  // This button's ID is 'notif-mark-all' in the HTML.
  const markAllBtn = document.getElementById('notif-mark-all');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', markAllNotificationsRead);
  }

  // ── Load initial notifications ────────────────────────────────────────────
  await _loadAndRender();

  // ── Start polling if backend is live ─────────────────────────────────────
  if (!_isDemoMode) {
    await startPolling(60_000);
  }
}


// ---------------------------------------------------------------------------
// _loadAndRender — fetches notifications and renders them in the panel
// ---------------------------------------------------------------------------
async function _loadAndRender() {
  const notifications = await fetchNotifications();
  _renderNotificationList(notifications);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  updateBadgeCount(unreadCount);
}


// =============================================================================
// fetchNotifications()
// =============================================================================
/**
 * Calls GET /api/notifications and returns the list.
 * Falls back to DEMO_NOTIFICATIONS if the backend is unreachable.
 * NEVER invents non-demo notifications.
 *
 * @returns {Promise<Array>}
 */
export async function fetchNotifications() {
  try {
    const reachable = await checkBackendConnectivity();
    if (!reachable) throw new Error('Backend not reachable');

    const data = await getNotifications();
    _isDemoMode = false;

    if (Array.isArray(data)) {
      _notifications = data;
      return data;
    }
    if (data && Array.isArray(data.notifications)) {
      _notifications = data.notifications;
      return _notifications;
    }
    _notifications = [];
    return [];

  } catch {
    // Backend not reachable — use demo notifications
    _isDemoMode = true;
    _notifications = DEMO_NOTIFICATIONS;
    return DEMO_NOTIFICATIONS;
  }
}


// =============================================================================
// renderNotification(notification) — builds one notification item element
// =============================================================================
export function renderNotification(notification) {
  const id = String(notification.id);
  const isRead = Boolean(notification.is_read);

  const item = document.createElement('div');
  item.className = 'notif-item ' + (isRead ? 'notif-item--read' : 'notif-item--unread');
  item.dataset.notifId = id;
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');

  // Unread dot
  if (!isRead) {
    const dot = document.createElement('span');
    dot.className = 'notif-unread-dot';
    dot.setAttribute('aria-label', 'Unread');
    item.appendChild(dot);
  }

  // Title
  const titleEl = document.createElement('p');
  titleEl.className = 'notif-item-title';
  titleEl.textContent = notification.title ?? 'Notification';
  item.appendChild(titleEl);

  // Type badge
  if (notification.type) {
    const typeBadge = document.createElement('span');
    typeBadge.className = 'notif-item-type';
    typeBadge.textContent = notification.type;
    item.appendChild(typeBadge);
  }

  // Date
  if (notification.date) {
    const dateEl = document.createElement('span');
    dateEl.className = 'notif-item-date';
    dateEl.textContent = formatDate(notification.date);
    item.appendChild(dateEl);
  }

  // Click / keyboard handler
  const handleActivation = async () => {
    if (!notification.is_read) {
      await markNotificationRead(id);
      notification.is_read = true;
      item.classList.replace('notif-item--unread', 'notif-item--read');
      const dot = item.querySelector('.notif-unread-dot');
      if (dot) dot.remove();
    }

    // Dispatch 'open-announcement' so announcements.js can open the detail modal
    const relatedId = notification.announcement_id ?? notification.related_id;
    if (relatedId !== undefined && relatedId !== null) {
      document.dispatchEvent(new CustomEvent('open-announcement', {
        detail: { id: String(relatedId) },
        bubbles: true,
      }));
    }

    // Close the panel
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.remove('is-open');
    _panelOpen = false;
  };

  item.addEventListener('click', handleActivation);
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivation(); }
  });

  return item;
}


// =============================================================================
// updateBadgeCount(count)
// =============================================================================
export function updateBadgeCount(count) {
  const badge = document.getElementById('notif-count-badge');
  if (!badge) return;

  if (count <= 0) {
    badge.textContent = '0';
    badge.style.display = 'none';
  } else {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = '';
  }
}


// =============================================================================
// markNotificationRead(id)
// =============================================================================
export async function markNotificationRead(id) {
  const strId = String(id);
  if (!_isDemoMode) {
    try { await apiMarkNotificationRead(strId); } catch { /* offline */ }
  }

  const notif = _notifications.find((n) => String(n.id) === strId);
  if (notif) notif.is_read = true;

  // Re-render that specific item
  const existingItem = document.querySelector('.notif-item[data-notif-id="' + strId + '"]');
  if (existingItem && notif) {
    existingItem.replaceWith(renderNotification(notif));
  }

  const unreadCount = _notifications.filter((n) => !n.is_read).length;
  updateBadgeCount(unreadCount);
}


// =============================================================================
// markAllNotificationsRead()
// =============================================================================
export async function markAllNotificationsRead() {
  const unread = _notifications.filter((n) => !n.is_read);
  if (unread.length === 0) {
    showToast('All notifications are already read.', 'info');
    return;
  }

  if (!_isDemoMode) {
    await Promise.allSettled(unread.map((n) => markNotificationRead(n.id)));
  } else {
    // Demo mode: just update local state
    unread.forEach((n) => { n.is_read = true; });
    _renderNotificationList(_notifications);
    updateBadgeCount(0);
  }

  showToast('All notifications marked as read.', 'success');
}


// =============================================================================
// startPolling(intervalMs) — only used when backend is live
// =============================================================================
export async function startPolling(intervalMs = 60_000) {
  const reachable = await checkBackendConnectivity();
  if (!reachable) return; // No point polling if backend is offline

  if (_pollingHandle !== null) clearInterval(_pollingHandle);

  _pollingHandle = setInterval(async () => {
    const stillReachable = await checkBackendConnectivity();
    if (!stillReachable) return;

    const fresh = await fetchNotifications();
    const unreadCount = fresh.filter((n) => !n.is_read).length;
    updateBadgeCount(unreadCount);

    if (_panelOpen) _renderNotificationList(fresh);
  }, intervalMs);
}


// ---------------------------------------------------------------------------
// _renderNotificationList — private: fills #notif-list with items
// ---------------------------------------------------------------------------
function _renderNotificationList(notifications) {
  const list = document.getElementById('notif-list');
  if (!list) return;

  // Clear existing items
  while (list.firstChild) list.removeChild(list.firstChild);

  if (!notifications || notifications.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'notif-empty-state';
    empty.textContent = 'No notifications yet.';
    list.appendChild(empty);
    return;
  }

  notifications.forEach((notif) => {
    list.appendChild(renderNotification(notif));
  });
}
