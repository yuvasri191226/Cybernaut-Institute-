// =============================================================================
// filters.js – Filter & Sort State Manager
// Cybernaut Institute of Technology – Announcement System
// Written by Member 3
//
// Keeps track of ALL active filter settings.
// Updated to support:
//  - showBookmarkedOnly (quick filter tab: Bookmarked)
//  - showUpdatedOnly    (quick filter tab: Updated)
//  - target_year field  (new JSON format uses target_year instead of year)
//  - published_date field (new JSON format uses published_date instead of date)
// =============================================================================

import { getReadSet, getBookmarkSet } from './bookmarks.js';

// ---------------------------------------------------------------------------
// FilterState — the single source of truth for all active filters
// ---------------------------------------------------------------------------
const FilterState = {
  search:            '',        // Text typed in the search box
  category:         'all',     // Category dropdown value
  department:       'all',     // Department dropdown value
  year:             'all',     // Year dropdown value
  sort:             'newest',  // Sort order
  showImportantOnly: false,    // Quick tab: ⭐ Important
  showUnreadOnly:    false,    // Quick tab: 🆕 Unread
  showBookmarkedOnly: false,   // Quick tab: 🔖 Bookmarked
  showUpdatedOnly:   false,    // Quick tab: 🔄 Updated
};

// ---------------------------------------------------------------------------
// applyFilters(announcements)
// ---------------------------------------------------------------------------
// Takes the full array of announcement objects, applies all filters from
// FilterState, then sorts and returns the matching subset.
//
// Announcement fields supported (both old format and new JSON format):
//   title, description, category, department
//   year / target_year  → both accepted
//   date / published_date → both accepted for sorting
//   updated_at          → used for 'updated' sort and showUpdatedOnly
//   is_important, is_updated, is_demo

export function applyFilters(announcements) {
  // Get current read & bookmark sets
  let readSet, bookmarkSet;
  try { readSet = getReadSet(); } catch { readSet = new Set(); }
  try { bookmarkSet = getBookmarkSet(); } catch { bookmarkSet = new Set(); }

  const searchTerm = FilterState.search.trim().toLowerCase();

  // ── STEP 1: Filter ────────────────────────────────────────────────────────
  let filtered = announcements.filter((ann) => {

    // --- Search filter ---
    // Case-insensitive search across title, description, category, department
    if (searchTerm !== '') {
      const inTitle       = (ann.title       || '').toLowerCase().includes(searchTerm);
      const inDescription = (ann.description || '').toLowerCase().includes(searchTerm);
      const inCategory    = (ann.category    || '').toLowerCase().includes(searchTerm);
      const inDepartment  = (ann.department  || '').toLowerCase().includes(searchTerm);
      // Also search Tamil fields if present
      const inTamilTitle  = (ann.tamil_title || '').toLowerCase().includes(searchTerm);
      if (!inTitle && !inDescription && !inCategory && !inDepartment && !inTamilTitle) {
        return false;
      }
    }

    // --- Category filter ---
    if (FilterState.category !== 'all') {
      if ((ann.category || '').toLowerCase() !== FilterState.category.toLowerCase()) {
        return false;
      }
    }

    // --- Department filter ---
    if (FilterState.department !== 'all') {
      const annDept = (ann.department || 'all');
      // 'all' in the announcement means it applies to everyone → always pass
      if (annDept !== 'all' && annDept.toLowerCase() !== FilterState.department.toLowerCase()) {
        return false;
      }
    }

    // --- Year filter ---
    // Supports both 'year' (old) and 'target_year' (new JSON format)
    if (FilterState.year !== 'all') {
      const annYear = String(ann.target_year || ann.year || 'all');
      // 'all' in the announcement → applies to every year → always pass
      if (annYear !== 'all' && !annYear.includes(FilterState.year)) {
        return false;
      }
    }

    // --- Show Important Only (quick tab) ---
    if (FilterState.showImportantOnly && !ann.is_important) {
      return false;
    }

    // --- Show Unread Only (quick tab) ---
    if (FilterState.showUnreadOnly && readSet.has(String(ann.id))) {
      return false; // This one has been read → exclude
    }

    // --- Show Bookmarked Only (quick tab) ---
    if (FilterState.showBookmarkedOnly && !bookmarkSet.has(String(ann.id))) {
      return false;
    }

    // --- Show Updated Only (quick tab) ---
    if (FilterState.showUpdatedOnly && !ann.is_updated) {
      return false;
    }

    return true; // Passed all checks
  });

  // ── STEP 2: Sort ──────────────────────────────────────────────────────────
  filtered = sortAnnouncements(filtered);

  return filtered;
}

// ---------------------------------------------------------------------------
// sortAnnouncements(list) — internal helper
// ---------------------------------------------------------------------------
// Returns a NEW sorted array. Does not mutate the input.
// Uses published_date if available; falls back to date for older API responses.

function sortAnnouncements(list) {
  const result = [...list]; // shallow copy to avoid mutating allAnnouncements

  // Helper: get the best available date timestamp for an announcement
  function getDateMs(ann) {
    const d = ann.published_date || ann.date;
    return d ? new Date(d).getTime() : 0;
  }

  switch (FilterState.sort) {

    case 'newest':
      // Most recent published_date first. No date → goes to the end (0 is treated as very old).
      result.sort((a, b) => getDateMs(b) - getDateMs(a));
      break;

    case 'oldest':
      // Oldest published_date first. No date → goes to the end (Infinity sorts last).
      result.sort((a, b) => {
        const dateA = (a.published_date || a.date) ? new Date(a.published_date || a.date).getTime() : Infinity;
        const dateB = (b.published_date || b.date) ? new Date(b.published_date || b.date).getTime() : Infinity;
        return dateA - dateB;
      });
      break;

    case 'updated':
      // Most recently updated first. Falls back to published_date if no updated_at.
      result.sort((a, b) => {
        const tsA = a.updated_at ? new Date(a.updated_at).getTime() : getDateMs(a);
        const tsB = b.updated_at ? new Date(b.updated_at).getTime() : getDateMs(b);
        return tsB - tsA;
      });
      break;

    case 'alphabetical':
      // Title A → Z (case-insensitive)
      result.sort((a, b) => {
        const tA = (a.title || '').toLowerCase();
        const tB = (b.title || '').toLowerCase();
        if (tA < tB) return -1;
        if (tA > tB) return  1;
        return 0;
      });
      break;

    case 'important':
      // Important announcements first, then sort by newest within each group.
      result.sort((a, b) => {
        const impA = a.is_important ? 1 : 0;
        const impB = b.is_important ? 1 : 0;
        if (impB !== impA) return impB - impA;
        return getDateMs(b) - getDateMs(a);
      });
      break;

    default:
      // Unknown sort → default to newest
      result.sort((a, b) => getDateMs(b) - getDateMs(a));
      break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// updateFilter(key, value)
// ---------------------------------------------------------------------------
// Updates a single property in FilterState.
// key must be one of the properties defined in FilterState above.

export function updateFilter(key, value) {
  if (Object.prototype.hasOwnProperty.call(FilterState, key)) {
    FilterState[key] = value;
  } else {
    console.warn('[filters.js] updateFilter: Unknown filter key "' + key + '"');
  }
}

// ---------------------------------------------------------------------------
// resetFilters()
// ---------------------------------------------------------------------------
// Resets ALL filter settings back to their defaults.

export function resetFilters() {
  FilterState.search            = '';
  FilterState.category          = 'all';
  FilterState.department        = 'all';
  FilterState.year              = 'all';
  FilterState.sort              = 'newest';
  FilterState.showImportantOnly  = false;
  FilterState.showUnreadOnly     = false;
  FilterState.showBookmarkedOnly = false;
  FilterState.showUpdatedOnly    = false;
}

// ---------------------------------------------------------------------------
// getFilterState()
// ---------------------------------------------------------------------------
// Returns a COPY of FilterState (read-only snapshot).

export function getFilterState() {
  return { ...FilterState };
}

// Export FilterState itself for direct read-only access by other modules.
export { FilterState };
