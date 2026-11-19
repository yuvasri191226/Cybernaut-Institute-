/**
 * pdf-viewer.js
 * -------------
 * PDF and Attachment Handling Module for Cybernaut Institute of Technology
 * Announcement System.
 *
 * This module creates the UI elements needed to display, open, and download
 * PDF attachments linked to announcements.
 *
 * IMPORTANT RULES:
 *  - NEVER generate or guess PDF links. Only use URLs provided by the backend.
 *  - NEVER use innerHTML with user-supplied data. Use textContent only.
 *  - Always validate URLs before displaying them (using isValidUrl from utils.js).
 *  - Never bypass access controls or open URLs that are not valid http/https links.
 *
 * Exports: renderAttachmentInfo, renderMultipleAttachments, createPDFButton
 */

// Import the URL validator from utils.js (written by another team member)
import { isValidUrl } from './utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Safely check that a value is a non-empty string
// ─────────────────────────────────────────────────────────────────────────────
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. createPDFButton
// ─────────────────────────────────────────────────────────────────────────────
/**
 * createPDFButton(url, label)
 *
 * Creates and returns a styled button/anchor element for opening a PDF.
 * Returns null if the URL is not a valid http/https URL.
 *
 * Usage:
 *   const btn = createPDFButton('https://example.com/file.pdf', 'Open PDF');
 *   if (btn) container.appendChild(btn);
 *
 * @param {string} url   - The URL to the PDF file.
 * @param {string} label - The visible text label for the button.
 * @returns {HTMLAnchorElement|null} An anchor element, or null if URL is invalid.
 */
export function createPDFButton(url, label) {
  // Step 1: Validate the URL using isValidUrl from utils.js
  // If the URL is not a valid http/https link, return null — never create a fake link
  if (!isNonEmptyString(url) || !isValidUrl(url)) {
    return null; // Invalid URL — caller should handle this case
  }

  // Step 2: Create an anchor element styled as a button
  const link = document.createElement('a');
  link.href = url;

  // Open in a new tab safely
  // 'noopener' prevents the new page from accessing window.opener (security)
  // 'noreferrer' prevents passing the referrer header (privacy)
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  // Set the visible text using textContent (never innerHTML)
  link.textContent = isNonEmptyString(label) ? label : 'Open PDF';

  // Add CSS classes for styling (Member 2's CSS will style these)
  link.className = 'pdf-open-button';

  return link;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. renderAttachmentInfo
// ─────────────────────────────────────────────────────────────────────────────
/**
 * renderAttachmentInfo(announcement, container)
 *
 * Builds and injects the attachment UI for a single announcement into
 * `container`. Shows the PDF filename, an Open button, and a Download link
 * — but ONLY if the announcement has a valid PDF URL.
 *
 * If there is no PDF URL at all: shows "No attachment available".
 * If the URL exists but is invalid:  shows "Attachment link is unavailable".
 *
 * @param {Object}      announcement         - The announcement object from the backend.
 * @param {string}      [announcement.pdf_url]  - URL of the PDF attachment.
 * @param {string}      [announcement.pdf_name] - Display name for the PDF file.
 * @param {HTMLElement} container            - The DOM element to render into.
 */
export function renderAttachmentInfo(announcement, container) {
  // Step 1: Clear any existing content in the container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Step 2: Create a wrapper section for the attachment UI
  const section = document.createElement('div');
  section.className = 'pdf-attachment-section';

  // Step 3: Section heading
  const heading = document.createElement('h4');
  heading.className = 'pdf-attachment-heading';
  heading.textContent = 'Attachment';
  section.appendChild(heading);

  // Step 4: Check if the announcement object has a pdf_url
  const pdfUrl = announcement && announcement.pdf_url;

  if (!pdfUrl || !isNonEmptyString(pdfUrl)) {
    // Case A: No PDF URL provided at all
    const noAttachment = document.createElement('p');
    noAttachment.className = 'pdf-no-attachment';
    noAttachment.textContent = 'No attachment available'; // textContent only
    section.appendChild(noAttachment);
    container.appendChild(section);
    return; // Done
  }

  // Step 5: We have a URL — validate it
  if (!isValidUrl(pdfUrl)) {
    // Case B: URL is present but malformed or not http/https
    // NEVER open an invalid URL — show an honest message
    const invalidMsg = document.createElement('p');
    invalidMsg.className = 'pdf-invalid-link';
    invalidMsg.textContent = 'Attachment link is unavailable'; // textContent only
    section.appendChild(invalidMsg);
    container.appendChild(section);
    return; // Done
  }

  // Step 6: Valid URL — show filename, Open button, and Download link
  // ── Filename display ──────────────────────────────────────────────────
  const fileNameDisplay = document.createElement('p');
  fileNameDisplay.className = 'pdf-filename';

  // Use the provided pdf_name, or fall back to the last part of the URL path
  let displayName = announcement.pdf_name;
  if (!isNonEmptyString(displayName)) {
    // Try to extract filename from URL path (e.g. "/uploads/notice.pdf" → "notice.pdf")
    try {
      const urlObj = new URL(pdfUrl);
      const pathParts = urlObj.pathname.split('/');
      displayName = pathParts[pathParts.length - 1] || 'document.pdf';
    } catch {
      displayName = 'document.pdf';
    }
  }

  fileNameDisplay.textContent = displayName; // textContent — never innerHTML
  section.appendChild(fileNameDisplay);

  // ── Button row for Open and Download ──────────────────────────────────
  const buttonRow = document.createElement('div');
  buttonRow.className = 'pdf-button-row';

  // ── "Open PDF" button ─────────────────────────────────────────────────
  // Opens the PDF in a new browser tab
  const openBtn = createPDFButton(pdfUrl, 'Open PDF');
  if (openBtn) {
    // createPDFButton already validates the URL and sets target + rel
    buttonRow.appendChild(openBtn);
  }

  // ── "Download" link ───────────────────────────────────────────────────
  // The `download` attribute tells the browser to download instead of preview
  const downloadLink = document.createElement('a');
  downloadLink.href = pdfUrl;
  downloadLink.download = displayName; // Suggests the filename for saving
  downloadLink.rel = 'noopener noreferrer';
  downloadLink.className = 'pdf-download-link';
  downloadLink.textContent = '⬇ Download'; // textContent only
  // Note: We do NOT set target="_blank" on the download link so the
  // download dialog appears in the same tab (better UX for downloads).

  buttonRow.appendChild(downloadLink);

  section.appendChild(buttonRow);
  container.appendChild(section);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. renderMultipleAttachments
// ─────────────────────────────────────────────────────────────────────────────
/**
 * renderMultipleAttachments(attachments, container)
 *
 * Handles an array of attachment objects from the backend and renders each
 * one into `container`. Each attachment has {name, url}.
 *
 * Example attachment array:
 *   [
 *     { name: "Exam Schedule.pdf", url: "https://example.com/exam.pdf" },
 *     { name: "Result Sheet.pdf",  url: "https://example.com/result.pdf" }
 *   ]
 *
 * @param {Array<{name: string, url: string}>} attachments - Array of attachment objects.
 * @param {HTMLElement}                        container   - The DOM element to render into.
 */
export function renderMultipleAttachments(attachments, container) {
  // Step 1: Clear any existing content
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Step 2: Check if we have a valid non-empty array
  if (!Array.isArray(attachments) || attachments.length === 0) {
    // No attachments at all
    const noAttachment = document.createElement('p');
    noAttachment.className = 'pdf-no-attachment';
    noAttachment.textContent = 'No attachment available';
    container.appendChild(noAttachment);
    return;
  }

  // Step 3: Section heading (only once, above all attachments)
  const heading = document.createElement('h4');
  heading.className = 'pdf-attachment-heading';
  heading.textContent = 'Attachments';
  container.appendChild(heading);

  // Step 4: Render each attachment
  attachments.forEach((attachment, index) => {
    // Create a wrapper for this single attachment
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'pdf-attachment-item';

    // If there are multiple attachments, add a small numbered label
    if (attachments.length > 1) {
      const itemLabel = document.createElement('span');
      itemLabel.className = 'pdf-item-label';
      itemLabel.textContent = `${index + 1}.`; // e.g. "1." "2."
      itemWrapper.appendChild(itemLabel);
    }

    // Build a minimal announcement-like object so we can reuse renderAttachmentInfo
    // The attachment object has {name, url}, which maps to {pdf_name, pdf_url}
    const attachmentAsAnnouncement = {
      pdf_url: attachment.url,
      pdf_name: attachment.name,
    };

    // Use renderAttachmentInfo logic — but we need an inner container
    // Create a temporary container for this single attachment's details
    const innerContainer = document.createElement('div');
    innerContainer.className = 'pdf-attachment-inner';

    // ── Validate and render this attachment ───────────────────────────────
    const url = attachment.url;
    const name = isNonEmptyString(attachment.name) ? attachment.name : null;

    if (!url || !isNonEmptyString(url)) {
      // No URL for this attachment
      const noUrl = document.createElement('p');
      noUrl.className = 'pdf-no-attachment';
      noUrl.textContent = isNonEmptyString(name)
        ? `${name}: No link available`
        : 'No attachment available';
      innerContainer.appendChild(noUrl);
    } else if (!isValidUrl(url)) {
      // Invalid URL for this attachment
      const invalidMsg = document.createElement('p');
      invalidMsg.className = 'pdf-invalid-link';
      invalidMsg.textContent = isNonEmptyString(name)
        ? `${name}: Attachment link is unavailable`
        : 'Attachment link is unavailable';
      innerContainer.appendChild(invalidMsg);
    } else {
      // Valid URL — show filename, Open, and Download
      // Determine display filename
      let displayName = name;
      if (!displayName) {
        try {
          const urlObj = new URL(url);
          const parts = urlObj.pathname.split('/');
          displayName = parts[parts.length - 1] || 'document.pdf';
        } catch {
          displayName = 'document.pdf';
        }
      }

      // Filename
      const fileNameEl = document.createElement('p');
      fileNameEl.className = 'pdf-filename';
      fileNameEl.textContent = displayName; // textContent only

      // Button row
      const btnRow = document.createElement('div');
      btnRow.className = 'pdf-button-row';

      // Open button
      const openBtn = createPDFButton(url, 'Open PDF');
      if (openBtn) {
        btnRow.appendChild(openBtn);
      }

      // Download link
      const dlLink = document.createElement('a');
      dlLink.href = url;
      dlLink.download = displayName;
      dlLink.rel = 'noopener noreferrer';
      dlLink.className = 'pdf-download-link';
      dlLink.textContent = '⬇ Download'; // textContent only
      btnRow.appendChild(dlLink);

      innerContainer.appendChild(fileNameEl);
      innerContainer.appendChild(btnRow);
    }

    itemWrapper.appendChild(innerContainer);
    container.appendChild(itemWrapper);
  });
}
