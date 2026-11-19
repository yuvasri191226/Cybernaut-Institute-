/**
 * bookmarks.js
 * ============
 * Manages bookmarks and read/unread tracking for the
 * Cybernaut Institute of Technology announcement system.
 *
 * Uses ES module syntax (import/export).
 * Talks to the backend API when available; falls back to
 * sessionStorage so the page keeps working offline.
 *
 * Imported helpers:
 *   - apiFetch, markRead, markUnread, getBookmarks,
 *     addBookmark as apiAddBookmark, removeBookmark as apiRemoveBookmark
 *     from ./api.js
 *   - showToast, formatDate, sanitizeText from ./utils.js
 */

import {
  apiFetch,
  markRead,
  markUnread,
  getBookmarks,
  addBookmark  as apiAddBookmark,
  removeBookmark as apiRemoveBookmark,
  getMe,
} from './api.js';

import { showToast, formatDate, sanitizeText } from './utils.js';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/**
 * readSet – keeps the IDs of announcements the user has already read.
 * We use a Set so checking membership is O(1).
 * sessionStorage key: 'cit_read_ids'  (a JSON array of ID strings)
 */
let readSet = new Set();

/**
 * bookmarkSet – keeps the IDs of bookmarked announcements.
 * Acts as a quick look-up and is synced to sessionStorage when the
 * API is not available.
 * sessionStorage key: 'cit_bookmark_ids'
 */
let bookmarkSet = new Set();

// ---------------------------------------------------------------------------
// sessionStorage helpers
// ---------------------------------------------------------------------------

/** Save readSet to sessionStorage so it survives page navigation. */
function persistReadSet() {
  try {
    sessionStorage.setItem('cit_read_ids', JSON.stringify([...readSet]));
  } catch {
    // sessionStorage unavailable (private mode / full quota) – silently skip.
  }
}

/** Save bookmarkSet IDs to sessionStorage as a fallback. */
function persistBookmarkSet() {
  try {
    sessionStorage.setItem('cit_bookmark_ids', JSON.stringify([...bookmarkSet]));
  } catch {
    // Silently skip if storage is unavailable.
  }
}

// ---------------------------------------------------------------------------
// 1. loadReadState
// ---------------------------------------------------------------------------

/**
 * loadReadState()
 * ---------------
 * Loads the set of read announcement IDs.
 *
 * Steps:
 *  1. Read the saved IDs from sessionStorage into readSet.
 *  2. Try GET /api/me to get the server-side list of read IDs.
 *  3. Merge the server list into readSet so we never lose local data.
 *
 * @returns {Set<string>} the populated readSet
 */
export async function loadReadState() {
  // Step 1 – restore from sessionStorage (works offline).
  try {
    const stored = sessionStorage.getItem('cit_read_ids');
    if (stored) {
      const ids = JSON.parse(stored);
      ids.forEach(id => readSet.add(String(id)));
    }
  } catch {
    // JSON parse error or no storage – start with an empty set.
  }

  // Step 2 & 3 – merge server-side read list (may fail if offline).
  try {
    const me = await getMe();
    // The server returns something like { read_ids: [1, 2, 3] }
    if (me && Array.isArray(me.read_ids)) {
      me.read_ids.forEach(id => readSet.add(String(id)));
      persistReadSet(); // keep sessionStorage up to date
    }
  } catch {
    // Backend not reachable – that's fine; we continue with local data.
  }

  return readSet;
}

// ---------------------------------------------------------------------------
// 2. markAsRead
// ---------------------------------------------------------------------------

/**
 * markAsRead(announcementId)
 * --------------------------
 * Marks a single announcement as read.
 *
 * - Adds ID to readSet.
 * - Calls POST /api/announcements/{id}/read (silent fail).
 * - Saves to sessionStorage.
 * - Updates the matching card's CSS classes on the page.
 *
 * @param {string|number} announcementId
 */
export async function markAsRead(announcementId) {
  const id = String(announcementId);

  // Add to our local set right away (optimistic update).
  readSet.add(id);
  persistReadSet();

  // Update the visual card immediately so the user sees instant feedback.
  _updateCardReadCSS(id, true);

  // Try to tell the backend – not a problem if it fails.
  try {
    await markRead(id);
  } catch {
    // Offline or server error – local state is already updated above.
  }
}

// ---------------------------------------------------------------------------
// 3. markAsUnread
// ---------------------------------------------------------------------------

/**
 * markAsUnread(announcementId)
 * ----------------------------
 * Marks a single announcement as unread.
 *
 * - Removes ID from readSet.
 * - Calls DELETE /api/announcements/{id}/read (silent fail).
 * - Saves to sessionStorage.
 * - Updates the matching card's CSS classes.
 *
 * @param {string|number} announcementId
 */
export async function markAsUnread(announcementId) {
  const id = String(announcementId);

  readSet.delete(id);
  persistReadSet();

  _updateCardReadCSS(id, false);

  try {
    await markUnread(id);
  } catch {
    // Offline or server error – ignore silently.
  }
}

// ---------------------------------------------------------------------------
// 4. isRead
// ---------------------------------------------------------------------------

/**
 * isRead(id)
 * ----------
 * Returns true if the announcement has been read, false otherwise.
 *
 * @param {string|number} id
 * @returns {boolean}
 */
export function isRead(id) {
  return readSet.has(String(id));
}

// ---------------------------------------------------------------------------
// 5. loadBookmarks
// ---------------------------------------------------------------------------

/**
 * loadBookmarks()
 * ---------------
 * Fetches the user's bookmarked announcements.
 *
 * Tries GET /api/bookmarks first.
 * If the API is unavailable, reads the saved IDs from sessionStorage
 * and returns them as minimal objects so the UI can still display them.
 *
 * @returns {Promise<Array>} array of announcement objects (or minimal stubs)
 */
export async function loadBookmarks() {
  try {
    // Happy path – API is reachable.
    const bookmarks = await getBookmarks();

    // Keep bookmarkSet in sync with what the server returned.
    bookmarkSet.clear();
    if (Array.isArray(bookmarks)) {
      bookmarks.forEach(b => {
        const id = String(b.id ?? b.announcement_id);
        bookmarkSet.add(id);
      });
      persistBookmarkSet();
      return bookmarks;
    }
    return [];
  } catch {
    // Fallback – restore IDs from sessionStorage.
    try {
      const stored = sessionStorage.getItem('cit_bookmark_ids');
      if (stored) {
        const ids = JSON.parse(stored);
        ids.forEach(id => bookmarkSet.add(String(id)));
        // Return minimal stub objects so callers can at least show the IDs.
        return ids.map(id => ({ id: String(id), title: 'Bookmarked (offline)', category: '', date: '' }));
      }
    } catch {
      // sessionStorage also failed – return empty array.
    }
    return [];
  }
}

// ---------------------------------------------------------------------------
// 6. addBookmark
// ---------------------------------------------------------------------------

/**
 * addBookmark(announcement)
 * -------------------------
 * Bookmarks an announcement.
 *
 * - Checks for duplicates before doing anything.
 * - Calls POST /api/bookmarks.
 * - On API failure, saves ID to sessionStorage as a fallback.
 * - Updates bookmarkSet.
 * - Updates the counter element #stat-bookmarked.
 * - Adds .is-bookmarked class to the card.
 * - Shows a "Bookmarked!" toast.
 *
 * @param {{ id: string|number, [key: string]: any }} announcement
 */
export async function addBookmark(announcement) {
  const id = String(announcement.id ?? announcement.announcement_id);

  // Guard against duplicates.
  if (bookmarkSet.has(id)) {
    showToast('Already bookmarked!', 'info');
    return;
  }

  // Optimistic update so the UI responds instantly.
  bookmarkSet.add(id);
  persistBookmarkSet();
  _updateCardBookmarkCSS(id, true);
  _updateBookmarkCounter(+1);

  try {
    await apiAddBookmark(id);
  } catch {
    // API unavailable – the sessionStorage fallback is already saved above.
    // The user can still see it as bookmarked locally.
  }

  showToast('Bookmarked!', 'success');
}

// ---------------------------------------------------------------------------
// 7. removeBookmark
// ---------------------------------------------------------------------------

/**
 * removeBookmark(announcementId)
 * ------------------------------
 * Removes a bookmark.
 *
 * - Calls DELETE /api/bookmarks/{id}.
 * - Updates bookmarkSet.
 * - Updates the card's CSS.
 * - Shows a "Bookmark removed" toast.
 *
 * @param {string|number} announcementId
 */
export async function removeBookmark(announcementId) {
  const id = String(announcementId);

  // Optimistic update.
  bookmarkSet.delete(id);
  persistBookmarkSet();
  _updateCardBookmarkCSS(id, false);
  _updateBookmarkCounter(-1);

  try {
    await apiRemoveBookmark(id);
  } catch {
    // Offline – local state already reflects the removal.
  }

  showToast('Bookmark removed', 'info');
}

// ---------------------------------------------------------------------------
// 8. isBookmarked
// ---------------------------------------------------------------------------

/**
 * isBookmarked(id)
 * ----------------
 * Returns true if the announcement is bookmarked, false otherwise.
 *
 * @param {string|number} id
 * @returns {boolean}
 */
export function isBookmarked(id) {
  return bookmarkSet.has(String(id));
}

// ---------------------------------------------------------------------------
// 9. renderBookmarksSection
// ---------------------------------------------------------------------------

/**
 * renderBookmarksSection()
 * ------------------------
 * Renders the bookmarked announcements in #bookmarks-section.
 *
 * - Creates #bookmarks-section if it does not exist yet, and inserts it
 *   before the <footer>.
 * - Fetches bookmarks (tries API, falls back to sessionStorage).
 * - Shows an empty-state message if no bookmarks exist.
 * - Each bookmark card shows the title, category, date, and a remove button.
 */
export async function renderBookmarksSection() {
  // Find or create the container element.
  let section = document.getElementById('bookmarks-section');
  if (!section) {
    section = document.createElement('section');
    section.id = 'bookmarks-section';
    section.className = 'bookmarks-section';

    // Insert before the <footer> (or append to <main> as a fallback).
    const footer = document.querySelector('footer');
    const main = document.querySelector('main') || document.body;
    if (footer) {
      main.insertBefore(section, footer);
    } else {
      main.appendChild(section);
    }
  }

  // Heading
  section.innerHTML = '';
  const heading = document.createElement('h2');
  heading.textContent = 'My Bookmarks';
  section.appendChild(heading);

  // Fetch bookmarks
  const bookmarks = await loadBookmarks();

  if (!bookmarks || bookmarks.length === 0) {
    // Empty state
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'You have no bookmarked announcements yet.';
    section.appendChild(empty);
    return;
  }

  // Render one card per bookmark
  const list = document.createElement('div');
  list.className = 'bookmarks-list';

  bookmarks.forEach(announcement => {
    const id = String(announcement.id ?? announcement.announcement_id);

    const card = document.createElement('div');
    card.className = 'announcement-card is-bookmarked';
    card.dataset.id = id;

    // Title
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = sanitizeText(announcement.title ?? 'Untitled');
    card.appendChild(title);

    // Category
    if (announcement.category) {
      const cat = document.createElement('span');
      cat.className = 'card-category';
      cat.textContent = sanitizeText(announcement.category);
      card.appendChild(cat);
    }

    // Date
    if (announcement.date) {
      const date = document.createElement('span');
      date.className = 'card-date';
      date.textContent = formatDate(announcement.date);
      card.appendChild(date);
    }

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-bookmark';
    removeBtn.textContent = '✕ Remove bookmark';
    removeBtn.addEventListener('click', async () => {
      await removeBookmark(id);
      card.remove(); // remove from DOM instantly
      // If the list is now empty, show the empty state
      if (list.children.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'You have no bookmarked announcements yet.';
        section.appendChild(empty);
      }
    });
    card.appendChild(removeBtn);

    list.appendChild(card);
  });

  section.appendChild(list);
}

// ---------------------------------------------------------------------------
// 9b. toggleBookmark
// ---------------------------------------------------------------------------

/**
 * toggleBookmark(announcementId)
 * --------------------------------
 * Convenience wrapper: adds the bookmark if not already bookmarked,
 * removes it if it is. Returns the new bookmarked state (true = bookmarked).
 *
 * This is used by the card's bookmark button for a single-click toggle.
 *
 * @param {string|number} announcementId
 * @returns {boolean} true if now bookmarked, false if removed
 */
export function toggleBookmark(announcementId) {
  const id = String(announcementId);
  if (bookmarkSet.has(id)) {
    // Remove bookmark (synchronous local update; API call in background)
    bookmarkSet.delete(id);
    persistBookmarkSet();
    _updateCardBookmarkCSS(id, false);
    _updateBookmarkCounter(-1);
    // Try API in background (don't await — keep UI instant)
    apiRemoveBookmark(id).catch(() => {});
    return false;
  } else {
    // Add bookmark
    bookmarkSet.add(id);
    persistBookmarkSet();
    _updateCardBookmarkCSS(id, true);
    _updateBookmarkCounter(+1);
    apiAddBookmark(id).catch(() => {});
    return true;
  }
}

// ---------------------------------------------------------------------------
// 10 & 11. Getters
// ---------------------------------------------------------------------------

/**
 * getReadSet()
 * ------------
 * Returns the current readSet (Set of string IDs).
 *
 * @returns {Set<string>}
 */
export function getReadSet() {
  return readSet;
}

/**
 * getBookmarkSet()
 * ----------------
 * Returns the current bookmarkSet (Set of string IDs).
 *
 * @returns {Set<string>}
 */
export function getBookmarkSet() {
  return bookmarkSet;
}

// ---------------------------------------------------------------------------
// Private CSS helpers (not exported – used internally only)
// ---------------------------------------------------------------------------

/**
 * _updateCardReadCSS(id, isReadNow)
 * ----------------------------------
 * Adds or removes the 'is-read' class from every card matching the ID.
 *
 * @param {string} id
 * @param {boolean} isReadNow
 */
function _updateCardReadCSS(id, isReadNow) {
  // Cards are expected to have a data-id attribute (e.g. <div class="announcement-card" data-id="42">)
  document.querySelectorAll(`.announcement-card[data-id="${CSS.escape(id)}"]`).forEach(card => {
    if (isReadNow) {
      card.classList.add('is-read');
      card.classList.remove('is-unread');
    } else {
      card.classList.remove('is-read');
      card.classList.add('is-unread');
    }
  });
}

/**
 * _updateCardBookmarkCSS(id, isBookmarkedNow)
 * --------------------------------------------
 * Adds or removes the 'is-bookmarked' class from every card matching the ID.
 *
 * @param {string} id
 * @param {boolean} isBookmarkedNow
 */
function _updateCardBookmarkCSS(id, isBookmarkedNow) {
  document.querySelectorAll(`.announcement-card[data-id="${CSS.escape(id)}"]`).forEach(card => {
    if (isBookmarkedNow) {
      card.classList.add('is-bookmarked');
    } else {
      card.classList.remove('is-bookmarked');
    }
  });
}

/**
 * _updateBookmarkCounter(delta)
 * ------------------------------
 * Increments or decrements the #stat-bookmarked counter by delta (+1 or -1).
 *
 * @param {number} delta  +1 to increment, -1 to decrement
 */
function _updateBookmarkCounter(delta) {
  const el = document.getElementById('stat-bookmarked');
  if (!el) return; // element not present on this page – that's fine

  const current = parseInt(el.textContent, 10) || 0;
  const next = Math.max(0, current + delta); // never go below 0
  el.textContent = String(next);
}
