/**
 * api.js — API Service Module
 * ============================
 * Cybernaut Institute of Technology — Announcement System
 *
 * This module is the SINGLE place where all communication with the backend
 * Flask server (Member 5's server) happens. Every time the page needs to
 * fetch data from the server, it goes through the functions defined here.
 *
 * WHY A SEPARATE FILE?
 *   Keeping all API calls in one file makes it easy to:
 *     - Change the server address in one place.
 *     - Add authentication headers everywhere at once.
 *     - Handle errors consistently across the whole app.
 *
 * HOW TO USE:
 *   Import just what you need at the top of any JS file:
 *   import { login, getAnnouncements, showToast } from './api.js';
 *
 * DEMO MODE:
 *   If the backend server is not running, IS_DEMO_MODE will be true.
 *   Other modules check this flag and show sample data instead.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The base URL of Member 5's Flask backend server.
 *
 * ⚠️  IMPORTANT: Change this to match Member 5's server address if it is
 *     running on a different host or port!
 *
 * Examples:
 *   'http://localhost:5000'          (default — local development)
 *   'http://192.168.1.42:5000'       (another machine on the same network)
 *   'https://cit-announcements.example.com' (production deployment)
 *
 * @type {string}
 */
export const API_BASE_URL = 'http://localhost:5000'; // Change this to match Member 5's server address

// ─────────────────────────────────────────────────────────────────────────────
// DEMO MODE FLAG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IS_DEMO_MODE is set to true when the backend cannot be reached.
 *
 * We determine this by calling checkBackendConnectivity() once when the
 * module loads. Other modules (announcements.js, etc.) import this flag
 * and fall back to showing hard-coded demo data when it is true.
 *
 * Because the connectivity check is asynchronous, we export a promise
 * (`connectivityReady`) that resolves once the check finishes, as well as
 * a plain boolean (`IS_DEMO_MODE`) that reflects the final result.
 *
 * Usage in another module:
 *   import { connectivityReady, IS_DEMO_MODE } from './api.js';
 *   await connectivityReady;
 *   if (IS_DEMO_MODE) { ... }
 *
 * @type {boolean}
 */
export let IS_DEMO_MODE = false; // Will be updated by the connectivity check below.

/**
 * A Promise that resolves when the connectivity check is complete.
 * Await this before reading IS_DEMO_MODE to make sure it has been set.
 *
 * @type {Promise<void>}
 */
export const connectivityReady = checkBackendConnectivity().then((reachable) => {
  IS_DEMO_MODE = !reachable;
  if (IS_DEMO_MODE) {
    console.warn(
      '[CIT API] Backend is not reachable. IS_DEMO_MODE = true. ' +
      'Sample data will be shown instead of live data.'
    );
  } else {
    console.info('[CIT API] Backend is reachable. IS_DEMO_MODE = false.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION TOKEN HELPERS
// ─────────────────────────────────────────────────────────────────────────────
// When a student logs in, the Flask server gives back a JWT (JSON Web Token).
// We store this token in sessionStorage so it persists across page navigations
// but is automatically cleared when the browser tab/window is closed.
//
// The key used in sessionStorage is 'cit_auth_token'.

/**
 * Reads the JWT authentication token from sessionStorage.
 * Returns null if the user is not logged in (no token stored).
 *
 * @returns {string|null} The JWT token string, or null if not logged in.
 */
export function getAuthToken() {
  return sessionStorage.getItem('cit_auth_token');
}

/**
 * Saves the JWT authentication token to sessionStorage.
 * Call this right after a successful login.
 *
 * @param {string} token - The JWT token returned by the server on login.
 */
export function setAuthToken(token) {
  sessionStorage.setItem('cit_auth_token', token);
}

/**
 * Removes the JWT token from sessionStorage.
 * Call this when the user logs out, or when a 401 Unauthorized error occurs.
 */
export function clearAuthToken() {
  sessionStorage.removeItem('cit_auth_token');
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE FETCH WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * apiFetch(endpoint, options) — The core HTTP request function.
 *
 * All API calls in this file go through apiFetch(). It automatically:
 *   1. Builds the full URL by prepending API_BASE_URL.
 *   2. Sets the Content-Type header to JSON.
 *   3. Adds an Authorization header with the stored JWT token (if logged in).
 *   4. Parses the JSON response and returns it on success.
 *   5. Throws a descriptive Error on network failure.
 *   6. Throws a descriptive Error on HTTP error status (4xx / 5xx).
 *   7. On a 401 Unauthorized response, clears the token and fires a
 *      'session-expired' custom event so the page can redirect to login.
 *
 * @param {string} endpoint - API path, e.g. '/api/announcements'.
 *                            Must start with '/'.
 * @param {RequestInit} [options={}] - Standard fetch() options object.
 *                                     (method, body, signal, etc.)
 * @returns {Promise<any>} Parsed JSON response from the server.
 * @throws {Error} If the network request fails or the server returns an error.
 */
export async function apiFetch(endpoint, options = {}) {
  // Build the complete URL, e.g. "http://localhost:5000/api/announcements".
  const url = `${API_BASE_URL}${endpoint}`;

  // Build the request headers.
  const headers = {
    'Content-Type': 'application/json', // Tell the server we're sending JSON.
    ...options.headers,                 // Allow callers to add extra headers.
  };

  // If the user is logged in, attach their JWT token.
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;

  try {
    // Make the actual HTTP request using the browser's built-in fetch API.
    response = await fetch(url, {
      ...options,     // Spread caller-supplied options (method, body, signal…)
      headers,        // Apply our merged headers (overwrites any duplicate keys).
    });
  } catch (networkError) {
    // fetch() itself threw — this usually means the server is unreachable
    // (e.g. the Flask server is not running, no internet connection, etc.).
    throw new Error(
      `Network error — could not connect to the server at ${API_BASE_URL}. ` +
      `Please make sure Member 5's Flask server is running. ` +
      `(Original error: ${networkError.message})`
    );
  }

  // ── Handle 401 Unauthorized ──────────────────────────────────────────────
  // This means the JWT token has expired or is invalid.
  if (response.status === 401) {
    // Clear the stale token so the user is treated as logged out.
    clearAuthToken();

    // Fire a custom DOM event so other parts of the app can react
    // (e.g. showing a "session expired" message and redirecting to login).
    window.dispatchEvent(new CustomEvent('session-expired', {
      detail: { message: 'Your session has expired. Please log in again.' }
    }));

    throw new Error('Session expired. Please log in again.');
  }

  // ── Handle other HTTP errors (400, 403, 404, 500, etc.) ─────────────────
  if (!response.ok) {
    // Try to read an error message from the response body (the Flask server
    // may return JSON like { "error": "Announcement not found" }).
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      // Use the server's message if available, otherwise fall back to status.
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch {
      // Response body was not valid JSON — that's fine, we already have a message.
    }
    throw new Error(errorMessage);
  }

  // ── Success: parse and return the JSON response body ────────────────────
  // For DELETE requests (or any response with no body), return null gracefully.
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return null; // No JSON body — return null to indicate success with no data.
  }

  return response.json(); // Parse JSON and return the resulting object/array.
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTIVITY CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkBackendConnectivity()
 *
 * Attempts a quick GET request to /api/announcements to see if the Flask
 * server is reachable. Uses a 3-second timeout so it fails fast.
 *
 * Returns:
 *   true  — Server responded (status code anything, even 4xx counts as "reachable").
 *   false — Request timed out or threw a network error.
 *
 * This is called once at module load time to set IS_DEMO_MODE.
 *
 * @returns {Promise<boolean>} true if reachable, false if not.
 */
export async function checkBackendConnectivity() {
  // AbortController lets us cancel the fetch() after the timeout.
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 3000); // 3-second timeout

  try {
    // We use a HEAD or GET request to the announcements endpoint.
    // Any HTTP response (even 401 or 403) means the server IS running.
    await fetch(`${API_BASE_URL}/api/announcements`, {
      method: 'GET',
      signal: controller.signal, // Allow the timeout to cancel this request.
    });
    clearTimeout(timeoutId);
    return true; // Server responded — we are connected!
  } catch {
    // fetch threw (timeout, DNS failure, connection refused, etc.)
    clearTimeout(timeoutId);
    return false; // Server is not reachable.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ── AUTHENTICATION API ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * login(username, password)
 * Sends login credentials to the server and returns the response.
 * On success, the caller should use setAuthToken() to save the token.
 *
 * Example response: { token: "eyJ...", user: { name: "Alice", role: "student" } }
 *
 * @param {string} username - The student/admin username.
 * @param {string} password - The user's password.
 * @returns {Promise<{token: string, user: object}>}
 */
export async function login(username, password) {
  return apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/**
 * logout()
 * Tells the server to invalidate the current session/token.
 * Always call clearAuthToken() after this, regardless of success/failure.
 *
 * @returns {Promise<any>}
 */
export async function logout() {
  return apiFetch('/api/logout', { method: 'POST' });
}

/**
 * getMe()
 * Fetches the currently logged-in user's profile from the server.
 * Useful to verify the token is still valid and get the user's name/role.
 *
 * Example response: { id: 1, name: "Alice", role: "student", department: "CSE" }
 *
 * @returns {Promise<object>} The current user's profile object.
 */
export async function getMe() {
  return apiFetch('/api/me', { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
// ── ANNOUNCEMENTS API ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getAnnouncements(params)
 * Fetches the list of announcements from the server.
 * Supports filtering and sorting via query parameters.
 *
 * @param {object} [params={}] - Optional filter/sort parameters:
 *   @param {string} [params.category]   - Filter by category (e.g. "examination").
 *   @param {string} [params.department] - Filter by department (e.g. "CSE").
 *   @param {string} [params.year]       - Filter by academic year (e.g. "2026").
 *   @param {string} [params.search]     - Full-text search query.
 *   @param {string} [params.sort]       - Sort order: "newest" | "oldest" | "title" | "important".
 * @returns {Promise<object[]>} Array of announcement objects.
 */
export async function getAnnouncements(params = {}) {
  // Build a query string from the params object.
  // URLSearchParams automatically handles URL-encoding of special characters.
  const query = new URLSearchParams();

  // Only add a parameter to the query string if a value was actually provided.
  if (params.category)   query.set('category',   params.category);
  if (params.department) query.set('department', params.department);
  if (params.year)       query.set('year',       params.year);
  if (params.search)     query.set('search',     params.search);
  if (params.sort)       query.set('sort',       params.sort);

  // Build the final endpoint, e.g. "/api/announcements?category=examination&sort=newest"
  const queryString = query.toString();
  const endpoint    = queryString
    ? `/api/announcements?${queryString}`
    : '/api/announcements';

  return apiFetch(endpoint, { method: 'GET' });
}

/**
 * getAnnouncementById(id)
 * Fetches a single announcement's full details by its ID.
 *
 * @param {number|string} id - The unique ID of the announcement.
 * @returns {Promise<object>} The full announcement object.
 */
export async function getAnnouncementById(id) {
  return apiFetch(`/api/announcements/${id}`, { method: 'GET' });
}

/**
 * getAnnouncementSummary(id)
 * Requests an AI-generated summary of the announcement text.
 * The summary is generated by Member 5's backend (Python + AI model).
 *
 * @param {number|string} id - The ID of the announcement to summarise.
 * @returns {Promise<{summary: string}>} Object containing the summary text.
 */
export async function getAnnouncementSummary(id) {
  return apiFetch(`/api/announcements/${id}/summary`, { method: 'GET' });
}

/**
 * translateAnnouncement(id, lang)
 * Requests a translation of the announcement text into the given language.
 *
 * @param {number|string} id   - The ID of the announcement to translate.
 * @param {string}        lang - Target language code (e.g. "en" for English, "ta" for Tamil).
 * @returns {Promise<{translated_text: string, language: string}>}
 */
export async function translateAnnouncement(id, lang) {
  return apiFetch(`/api/announcements/${id}/translate?lang=${encodeURIComponent(lang)}`, {
    method: 'GET',
  });
}

/**
 * markRead(id)
 * Records that the current user has read this announcement.
 * Affects the read/unread badge counts on the dashboard.
 *
 * @param {number|string} id - The ID of the announcement.
 * @returns {Promise<any>}
 */
export async function markRead(id) {
  return apiFetch(`/api/announcements/${id}/read`, { method: 'POST' });
}

/**
 * markUnread(id)
 * Marks a previously-read announcement as unread again.
 *
 * @param {number|string} id - The ID of the announcement.
 * @returns {Promise<any>}
 */
export async function markUnread(id) {
  return apiFetch(`/api/announcements/${id}/read`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────────────────────────────
// ── BOOKMARKS API ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getBookmarks()
 * Fetches the list of announcements bookmarked by the current user.
 *
 * @returns {Promise<object[]>} Array of bookmarked announcement objects.
 */
export async function getBookmarks() {
  return apiFetch('/api/bookmarks', { method: 'GET' });
}

/**
 * addBookmark(announcementId)
 * Bookmarks an announcement for the current user.
 *
 * @param {number|string} announcementId - The ID of the announcement to bookmark.
 * @returns {Promise<any>}
 */
export async function addBookmark(announcementId) {
  return apiFetch('/api/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ announcement_id: announcementId }),
  });
}

/**
 * removeBookmark(id)
 * Removes a bookmark by its bookmark record ID (not the announcement ID).
 *
 * @param {number|string} id - The bookmark record ID to remove.
 * @returns {Promise<any>}
 */
export async function removeBookmark(id) {
  return apiFetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────────────────────────────
// ── NOTIFICATIONS API ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * getNotifications()
 * Fetches the notification inbox for the current user.
 * Notifications are created by the system when new announcements are posted.
 *
 * @returns {Promise<object[]>} Array of notification objects.
 */
export async function getNotifications() {
  return apiFetch('/api/notifications', { method: 'GET' });
}

/**
 * markNotificationRead(id)
 * Marks a specific notification as read (removes the "new" badge).
 *
 * @param {number|string} id - The ID of the notification.
 * @returns {Promise<any>}
 */
export async function markNotificationRead(id) {
  return apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
}

// ─────────────────────────────────────────────────────────────────────────────
// ── AI ASSISTANT API ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * askAssistant(question, announcementId)
 * Sends a text question to the AI assistant and returns its answer.
 * Optionally links the question to a specific announcement for context.
 *
 * @param {string}             question       - The user's question text.
 * @param {number|string|null} [announcementId] - Optional ID of the announcement
 *                                               the question is about.
 * @returns {Promise<{answer: string}>} Object containing the assistant's answer.
 */
export async function askAssistant(question, announcementId = null) {
  return apiFetch('/api/assistant/ask', {
    method: 'POST',
    body: JSON.stringify({
      question,
      announcement_id: announcementId, // null is fine — the server ignores it.
    }),
  });
}

/**
 * submitVoiceQuery(audioText)
 * Submits a voice query that has already been transcribed to text by the
 * browser's Speech Recognition API (Member 2's responsibility).
 *
 * @param {string} audioText - The transcribed text from the voice input.
 * @returns {Promise<{answer: string}>} The assistant's response.
 */
export async function submitVoiceQuery(audioText) {
  return apiFetch('/api/assistant/voice', {
    method: 'POST',
    body: JSON.stringify({ text: audioText }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ── ADMIN API ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// These functions are only usable by logged-in admin users.
// The server will return 403 Forbidden if a regular student tries to call them.

/**
 * adminGetAnnouncements()
 * Fetches ALL announcements for the admin panel, including pending/unverified ones.
 * (Regular students only see verified announcements via getAnnouncements().)
 *
 * @returns {Promise<object[]>} Array of all announcement objects including unverified.
 */
export async function adminGetAnnouncements() {
  return apiFetch('/api/admin/announcements', { method: 'GET' });
}

/**
 * adminUpdateAnnouncement(id, data)
 * Updates an existing announcement's details (title, description, etc.).
 *
 * @param {number|string} id   - The ID of the announcement to update.
 * @param {object}        data - Object with the fields to update.
 * @returns {Promise<object>} The updated announcement object.
 */
export async function adminUpdateAnnouncement(id, data) {
  return apiFetch(`/api/admin/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * adminDeleteAnnouncement(id)
 * Permanently deletes an announcement from the system.
 * This action cannot be undone — always confirm with the user first!
 *
 * @param {number|string} id - The ID of the announcement to delete.
 * @returns {Promise<any>}
 */
export async function adminDeleteAnnouncement(id) {
  return apiFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
}

/**
 * adminVerifyAnnouncement(id, status, note)
 * Sets the verification status of an announcement (approve or reject).
 * Only verified announcements are shown to students.
 *
 * @param {number|string} id     - The ID of the announcement.
 * @param {string}        status - New status: "verified" | "rejected" | "pending".
 * @param {string}        [note] - Optional admin note explaining the decision.
 * @returns {Promise<any>}
 */
export async function adminVerifyAnnouncement(id, status, note = '') {
  return apiFetch(`/api/admin/announcements/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ status, note }),
  });
}

/**
 * adminGetScrapingLogs()
 * Retrieves the logs from the web-scraping process that collects announcements
 * from the college website automatically.
 *
 * @returns {Promise<object[]>} Array of scraping log entry objects.
 */
export async function adminGetScrapingLogs() {
  return apiFetch('/api/admin/scraping-logs', { method: 'GET' });
}

/**
 * adminGetStatistics()
 * Fetches aggregate statistics for the admin dashboard:
 * total announcements, reads, bookmarks, users, etc.
 *
 * @returns {Promise<object>} Statistics object.
 */
export async function adminGetStatistics() {
  return apiFetch('/api/admin/statistics', { method: 'GET' });
}
