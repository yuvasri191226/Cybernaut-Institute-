/**
 * utils.js — Utility / Helper Functions
 * ======================================
 * Cybernaut Institute of Technology — Announcement System
 *
 * This module contains small, reusable helper functions used across the
 * entire project (student dashboard, admin panel, login page, etc.).
 *
 * HOW TO USE:
 *   Import the functions you need at the top of any JS file like this:
 *   import { formatDate, sanitizeText, showToast } from './utils.js';
 *
 * All functions are exported so they can be imported anywhere in the project.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. formatDate(dateStr)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an ISO date string (or any recognisable date string) into a
 * human-friendly format: "DD Month YYYY".
 *
 * Examples:
 *   formatDate("2026-11-15")        → "15 November 2026"
 *   formatDate("2026-11-15T10:30Z") → "15 November 2026"
 *   formatDate(null)                → "Date not available"
 *   formatDate("not-a-date")        → "Date not available"
 *
 * @param {string|null|undefined} dateStr - The date string to format.
 * @returns {string} A formatted date like "15 November 2026", or
 *                   "Date not available" if the input is invalid.
 */
export function formatDate(dateStr) {
  // If nothing was passed in, immediately return the fallback text.
  if (!dateStr) {
    return 'Date not available';
  }

  // Try to create a JavaScript Date object from the string.
  const date = new Date(dateStr);

  // Date objects created from invalid strings will return NaN when you call
  // .getTime(). We use isNaN() to detect that situation.
  if (isNaN(date.getTime())) {
    return 'Date not available';
  }

  // Use Intl.DateTimeFormat to get the parts we need in the right locale.
  // We request the day as a 2-digit number, the full month name, and a
  // 4-digit year — all in English.
  const options = { day: '2-digit', month: 'long', year: 'numeric' };
  const formatted = date.toLocaleDateString('en-GB', options);
  // en-GB gives "15 November 2026" which is exactly what we want.
  return formatted;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. sanitizeText(str)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips HTML tags from a string and trims surrounding whitespace.
 * This is important for security — it prevents malicious HTML from being
 * accidentally rendered on the page.
 *
 * IMPORTANT: This function NEVER uses innerHTML. It uses a DOMParser so
 * the browser parses HTML in a safe, sandboxed document.
 *
 * Examples:
 *   sanitizeText("<b>Hello</b>  ")       → "Hello"
 *   sanitizeText("<script>alert(1)</script>Hi") → "Hi"
 *   sanitizeText("  Normal text  ")      → "Normal text"
 *   sanitizeText(null)                   → ""
 *
 * @param {string|null|undefined} str - Raw string that may contain HTML.
 * @returns {string} Plain-text string with all HTML tags removed and whitespace trimmed.
 */
export function sanitizeText(str) {
  // Guard: if nothing was passed in, return an empty string.
  if (str === null || str === undefined) {
    return '';
  }

  // Convert to string in case a number or boolean was passed.
  const raw = String(str);

  // Use the browser's built-in DOMParser to parse the HTML safely.
  // The result is a document object — we then read .body.textContent
  // which gives us just the visible text with no HTML tags.
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const plainText = doc.body.textContent || '';

  // Remove extra whitespace from the beginning and end.
  return plainText.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. getCategoryLabel(value)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a category value (the internal code stored in the database)
 * into a friendly display label shown to the user.
 *
 * Examples:
 *   getCategoryLabel("examination") → "Examination Notifications"
 *   getCategoryLabel("placement")   → "Placement Announcements"
 *   getCategoryLabel("unknown")     → "General"
 *   getCategoryLabel(null)          → "General"
 *
 * @param {string} value - The internal category code (e.g. "examination").
 * @returns {string} A human-readable label for display on the UI.
 */
export function getCategoryLabel(value) {
  // A lookup table (object) mapping internal codes to display names.
  const labels = {
    examination: 'Examination Notifications',
    circular:    'College Circulars',
    events:      'Events and Workshops',
    results:     'Results',
    placement:   'Placement Announcements',
  };

  // Look up the value. If it's not in the table, return "General".
  // We use optional chaining + nullish coalescing for safety.
  return labels[value] ?? 'General';
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. getDepartmentLabel(value)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a short department code into its full department name.
 * "all" maps to "All Departments" (used when no specific department is selected).
 *
 * Examples:
 *   getDepartmentLabel("IT")    → "Information Technology"
 *   getDepartmentLabel("CSE")   → "Computer Science & Engineering"
 *   getDepartmentLabel("all")   → "All Departments"
 *   getDepartmentLabel("XYZ")   → "XYZ"   (unknown code returned as-is)
 *
 * @param {string} value - Short department code (e.g. "CSE", "IT", "all").
 * @returns {string} Full department name, or the original value if not recognised.
 */
export function getDepartmentLabel(value) {
  // Mapping of short codes to full department names.
  const labels = {
    all:   'All Departments',
    IT:    'Information Technology',
    CSE:   'Computer Science & Engineering',
    ECE:   'Electronics & Communication Engineering',
    MECH:  'Mechanical Engineering',
    Civil: 'Civil Engineering',
    EEE:   'Electrical & Electronics Engineering',
  };

  // Return the mapped label, or fall back to the original value if unknown.
  return labels[value] ?? value;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. showToast(message, type)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shows a brief "toast" notification at the bottom of the screen.
 * Toasts disappear automatically after 4 seconds.
 *
 * The notification is added to a container element with id="toast-container".
 * If that element doesn't exist on the page yet, this function creates it.
 *
 * IMPORTANT: This function uses textContent (not innerHTML) to add the
 * message text, preventing any HTML injection attacks.
 *
 * Usage:
 *   showToast("Login successful!", "success");
 *   showToast("Network error. Please try again.", "error");
 *   showToast("New announcements available.", "info");
 *   showToast("Your session will expire soon.", "warning");
 *
 * @param {string} message - The notification message to display.
 * @param {'success'|'error'|'info'|'warning'} [type='info'] - Visual style.
 */
export function showToast(message, type = 'info') {
  // ── Step 1: Find or create the toast container ──────────────────────────
  // The container holds all active toasts and is typically positioned at the
  // bottom-right of the screen via CSS.
  let container = document.getElementById('toast-container');

  if (!container) {
    // The container doesn't exist yet — create it and add it to the page.
    container = document.createElement('div');
    container.id = 'toast-container';
    // Add CSS classes for positioning (the actual styles live in style.css).
    container.classList.add('toast-container');
    document.body.appendChild(container);
  }

  // ── Step 2: Create the individual toast element ──────────────────────────
  const toast = document.createElement('div');

  // Add base class plus a type-specific class (e.g. "toast-success").
  toast.classList.add('toast', `toast-${type}`);

  // Set the message text safely using textContent (never innerHTML).
  toast.textContent = message;

  // Add an ARIA role so screen-readers announce the notification.
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  // ── Step 3: Append the toast to the container ────────────────────────────
  container.appendChild(toast);

  // Trigger the CSS "visible" state on the next animation frame so any
  // CSS transition (fade-in) plays correctly.
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // ── Step 4: Auto-remove after 4 seconds ─────────────────────────────────
  setTimeout(() => {
    // Start a fade-out by removing the visible class (CSS handles animation).
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');

    // After the fade-out animation (assume 400 ms), remove from the DOM.
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 400);
  }, 4000);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. showLoading(container)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inserts a loading spinner inside the given container element.
 * Call this before starting a network request so the user sees feedback.
 *
 * The spinner div has the class "loading-spinner" so you can style it in CSS.
 * Call hideLoading(container) when the request finishes to remove it.
 *
 * Usage:
 *   const list = document.getElementById('announcement-list');
 *   showLoading(list);         // show spinner
 *   await loadAnnouncements(); // do the work
 *   hideLoading(list);         // hide spinner
 *
 * @param {HTMLElement} container - The DOM element to insert the spinner into.
 */
export function showLoading(container) {
  // Safety check: if no container was provided, do nothing.
  if (!container) return;

  // Don't add a second spinner if one already exists inside this container.
  if (container.querySelector('.loading-spinner')) return;

  // Create the spinner wrapper div.
  const spinner = document.createElement('div');
  spinner.classList.add('loading-spinner');

  // Add the visible "Loading…" text safely using textContent.
  spinner.textContent = 'Loading…';

  // Insert it at the beginning of the container.
  container.prepend(spinner);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. hideLoading(container)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Removes the loading spinner that was added by showLoading().
 * Safe to call even if no spinner is present (it simply does nothing).
 *
 * @param {HTMLElement} container - The DOM element that contains the spinner.
 */
export function hideLoading(container) {
  // Safety check.
  if (!container) return;

  // Find the spinner inside this container and remove it, if present.
  const spinner = container.querySelector('.loading-spinner');
  if (spinner) {
    container.removeChild(spinner);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. debounce(fn, delay)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a "debounced" version of a function.
 *
 * A debounced function only executes AFTER the user has stopped calling it
 * for `delay` milliseconds. This is very useful for search boxes — without
 * debouncing, every single keystroke would fire a network request; with
 * debouncing we wait until the user pauses typing before searching.
 *
 * Usage:
 *   const debouncedSearch = debounce(searchAnnouncements, 400);
 *   searchInput.addEventListener('input', debouncedSearch);
 *   // Now searchAnnouncements() runs 400 ms after the last keystroke.
 *
 * @param {Function} fn    - The function to debounce.
 * @param {number}   delay - Wait time in milliseconds (e.g. 300 or 400).
 * @returns {Function} A new function that is the debounced version of `fn`.
 */
export function debounce(fn, delay) {
  // `timer` holds the ID of the pending timeout between calls.
  let timer = null;

  // Return a new function that wraps `fn`.
  return function (...args) {
    // Every time this wrapper is called, cancel the previously scheduled call.
    clearTimeout(timer);

    // Schedule a new call to `fn` after `delay` milliseconds.
    // If the wrapper is called again before the delay expires, the previous
    // schedule is cancelled (see above) and a fresh one starts.
    timer = setTimeout(() => {
      fn.apply(this, args); // Call the original function with the same arguments.
    }, delay);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. generateId()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a simple unique string identifier.
 * Combines the current timestamp (milliseconds since epoch) with a random
 * number to make collisions extremely unlikely.
 *
 * This is NOT a cryptographic ID — it's intended for things like giving
 * temporary DOM elements unique IDs, or creating client-side keys for lists.
 *
 * Example output: "cit_1731659412345_0.72381946"
 *
 * @returns {string} A unique-ish string identifier.
 */
export function generateId() {
  const timestamp = Date.now();               // milliseconds since 1 Jan 1970
  const random    = Math.random().toString(36).slice(2); // e.g. "k3f8yz"
  return `cit_${timestamp}_${random}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. isValidUrl(str)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a string is a valid URL that starts with http:// or https://.
 *
 * This uses the browser's built-in URL constructor which is very reliable.
 * We only accept http and https protocols for security reasons.
 *
 * Examples:
 *   isValidUrl("https://example.com/page")  → true
 *   isValidUrl("http://localhost:5000/api")  → true
 *   isValidUrl("ftp://files.example.com")   → false  (not http/https)
 *   isValidUrl("not a url at all")           → false
 *   isValidUrl(null)                         → false
 *
 * @param {string} str - The string to validate.
 * @returns {boolean} true if the string is a valid http/https URL, false otherwise.
 */
export function isValidUrl(str) {
  // Guard: null, undefined, or empty string cannot be a URL.
  if (!str || typeof str !== 'string') return false;

  try {
    // The URL constructor throws a TypeError if the string is not a valid URL.
    const url = new URL(str);

    // Even if parsing succeeds, we only allow http and https.
    // (The protocol property includes the colon, e.g. "https:")
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    // URL constructor threw — the string is not a valid URL.
    return false;
  }
}
