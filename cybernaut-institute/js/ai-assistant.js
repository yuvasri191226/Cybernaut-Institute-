/**
 * ai-assistant.js
 * ----------------
 * Frontend AI Feature Integration for Cybernaut Institute of Technology
 * Announcement System.
 *
 * This module handles displaying AI-powered results (summaries, translations,
 * Q&A) fetched from Member 5's Flask backend via api.js.
 *
 * IMPORTANT RULES:
 *  - NEVER invent, hardcode, or fake AI results.
 *  - ALWAYS fetch results from the backend only.
 *  - If the backend fails, show a clear, honest error message.
 *  - NEVER use innerHTML with user-supplied data. Use textContent only.
 *
 * Exports: createAIPanelButtons, initVoiceInput
 */

// Import API functions from api.js (Member 5's backend calls)
import {
  getAnnouncementSummary,
  translateAnnouncement,
  askAssistant,
} from './api.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Clear a container and return it ready for new content
// ─────────────────────────────────────────────────────────────────────────────
function clearContainer(container) {
  // Remove all child nodes from the container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Create a simple loading indicator paragraph
// ─────────────────────────────────────────────────────────────────────────────
function createLoadingIndicator(message) {
  const p = document.createElement('p');
  p.className = 'ai-loading-indicator';
  p.textContent = message || 'Loading…'; // textContent only – never innerHTML
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Create a styled "Back" or toggle button
// ─────────────────────────────────────────────────────────────────────────────
function createTextButton(label, onClick) {
  const btn = document.createElement('button');
  btn.className = 'ai-back-button';
  btn.textContent = label; // textContent – never innerHTML
  btn.addEventListener('click', onClick);
  return btn;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. showSummarizePanel
// ─────────────────────────────────────────────────────────────────────────────
/**
 * showSummarizePanel(announcementId, container)
 *
 * Displays an AI-generated summary of the given announcement inside `container`.
 * The summary is ALWAYS fetched from the backend. If it fails, an error
 * message is shown — a fake summary is NEVER displayed.
 *
 * @param {string|number} announcementId - The ID of the announcement.
 * @param {HTMLElement}   container      - The DOM element to render into.
 */
export async function showSummarizePanel(announcementId, container) {
  // Step 1: Clear anything previously shown
  clearContainer(container);

  // Step 2: Show a loading message so the user knows we are working
  const loadingEl = createLoadingIndicator('Generating summary…');
  container.appendChild(loadingEl);

  try {
    // Step 3: Call the backend API to get the AI summary
    // getAnnouncementSummary calls GET /api/announcements/{id}/summary
    const data = await getAnnouncementSummary(announcementId);

    // Step 4: Remove loading indicator
    clearContainer(container);

    // Step 5: Show the summary heading
    const heading = document.createElement('h3');
    heading.className = 'ai-panel-heading';
    heading.textContent = 'AI Summary';
    container.appendChild(heading);

    // Step 6: Display the actual summary text from the backend
    // We use textContent so no HTML injection is possible
    const summaryText = document.createElement('p');
    summaryText.className = 'ai-summary-text';
    // data.summary is the field returned by Member 5's API
    summaryText.textContent = data.summary || 'No summary available.';
    container.appendChild(summaryText);

    // Step 7: "Back to full announcement" button
    const backBtn = createTextButton('← Back to full announcement', () => {
      clearContainer(container);
    });
    container.appendChild(backBtn);

  } catch (error) {
    // Step 8: Backend failed — show honest error. NEVER show a fake summary.
    clearContainer(container);
    const errorEl = document.createElement('p');
    errorEl.className = 'ai-error-message';
    errorEl.textContent =
      'Summary could not be generated. Please try again later.';
    container.appendChild(errorEl);

    // Also add a back button so the user is not stuck
    const backBtn = createTextButton('← Back to full announcement', () => {
      clearContainer(container);
    });
    container.appendChild(backBtn);

    // Log the actual error to the developer console for debugging
    console.error('[ai-assistant] showSummarizePanel error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. showTranslatePanel
// ─────────────────────────────────────────────────────────────────────────────
/**
 * showTranslatePanel(announcementId, language, originalContent, container)
 *
 * Fetches and displays a translated version of the announcement.
 * Translation is ALWAYS from the backend. NEVER hardcoded.
 *
 * @param {string|number} announcementId  - The announcement ID.
 * @param {string}        language        - 'ta' for Tamil, 'en' for English.
 * @param {string}        originalContent - The original text (used for "Show original" toggle).
 * @param {HTMLElement}   container       - The DOM element to render into.
 */
export async function showTranslatePanel(
  announcementId,
  language,
  originalContent,
  container
) {
  // Step 1: Clear the container and show loading
  clearContainer(container);
  const loadingEl = createLoadingIndicator('Translating…');
  container.appendChild(loadingEl);

  try {
    // Step 2: Fetch translation from backend
    // translateAnnouncement calls GET /api/announcements/{id}/translate?lang={language}
    const data = await translateAnnouncement(announcementId, language);

    // Step 3: Remove loading indicator
    clearContainer(container);

    // Step 4: Show heading that tells the user the current view
    const heading = document.createElement('h3');
    heading.className = 'ai-panel-heading';
    heading.textContent =
      language === 'ta' ? 'Tamil Translation' : 'English Translation';
    container.appendChild(heading);

    // Step 5: Display translated text from backend using textContent
    const translatedText = document.createElement('p');
    translatedText.className = 'ai-translated-text';
    // data.translated_text is the field returned by the backend
    translatedText.textContent =
      data.translated_text || 'Translation not available.';
    container.appendChild(translatedText);

    // Step 6: "Show original" toggle button — lets user switch back to original text
    let showingOriginal = false;
    const toggleBtn = createTextButton('Show original', () => {
      if (!showingOriginal) {
        // Switch to showing the original content
        translatedText.textContent = originalContent || '';
        toggleBtn.textContent = 'Show translation';
        showingOriginal = true;
      } else {
        // Switch back to translated content from the backend
        translatedText.textContent =
          data.translated_text || 'Translation not available.';
        toggleBtn.textContent = 'Show original';
        showingOriginal = false;
      }
    });
    container.appendChild(toggleBtn);

    // Step 7: Back button
    const backBtn = createTextButton('← Back to full announcement', () => {
      clearContainer(container);
    });
    container.appendChild(backBtn);

  } catch (error) {
    // Step 8: Backend failed — honest error. NEVER show a hardcoded translation.
    clearContainer(container);
    const errorEl = document.createElement('p');
    errorEl.className = 'ai-error-message';
    errorEl.textContent = 'Translation is not available at this time.';
    container.appendChild(errorEl);

    const backBtn = createTextButton('← Back to full announcement', () => {
      clearContainer(container);
    });
    container.appendChild(backBtn);

    console.error('[ai-assistant] showTranslatePanel error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. showQAPanel
// ─────────────────────────────────────────────────────────────────────────────
/**
 * showQAPanel(announcementId, container)
 *
 * Creates a Q&A chat-style interface where the user can type a question about
 * the announcement. The answer is fetched from the backend.
 *
 * IMPORTANT: This function NEVER invents answers. If the backend says the
 * answer is not found, an honest message is shown.
 *
 * @param {string|number} announcementId - The announcement ID for context.
 * @param {HTMLElement}   container      - The DOM element to render into.
 */
export function showQAPanel(announcementId, container) {
  // Step 1: Clear container
  clearContainer(container);

  // Step 2: Panel heading
  const heading = document.createElement('h3');
  heading.className = 'ai-panel-heading';
  heading.textContent = 'Ask a Question';
  container.appendChild(heading);

  // Step 3: Instruction text
  const instruction = document.createElement('p');
  instruction.className = 'ai-qa-instruction';
  instruction.textContent =
    'Type your question about this announcement and click Ask.';
  container.appendChild(instruction);

  // Step 4: Text input for the user's question
  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'ai-qa-input-wrapper';

  const questionInput = document.createElement('input');
  questionInput.type = 'text';
  questionInput.className = 'ai-qa-input';
  questionInput.placeholder = 'e.g. What is the last date to apply?';
  // Allow pressing Enter to submit
  questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      askBtn.click();
    }
  });
  inputWrapper.appendChild(questionInput);

  // Step 5: Voice input button (optional, using initVoiceInput)
  const voiceWrapper = document.createElement('span');
  inputWrapper.appendChild(voiceWrapper);

  container.appendChild(inputWrapper);

  // Step 6: "Ask" submit button
  const askBtn = document.createElement('button');
  askBtn.className = 'ai-ask-button';
  askBtn.textContent = 'Ask';
  container.appendChild(askBtn);

  // Step 7: Response area — where the answer will appear
  const responseArea = document.createElement('div');
  responseArea.className = 'ai-qa-response';
  container.appendChild(responseArea);

  // Step 8: Set up voice input for the question box (if supported)
  initVoiceInput(questionInput, (recognizedText) => {
    // When voice input returns a result, automatically click Ask
    if (recognizedText && recognizedText.trim().length > 0) {
      askBtn.click();
    }
  }, voiceWrapper);

  // Step 9: Handle Ask button click
  askBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();

    // Validate: don't send an empty question
    if (!question) {
      clearContainer(responseArea);
      const warn = document.createElement('p');
      warn.className = 'ai-qa-warning';
      warn.textContent = 'Please type a question before clicking Ask.';
      responseArea.appendChild(warn);
      return;
    }

    // Show searching indicator
    clearContainer(responseArea);
    const searchingEl = createLoadingIndicator('Searching for answer…');
    responseArea.appendChild(searchingEl);

    // Disable button while loading
    askBtn.disabled = true;

    try {
      // Call backend: POST /api/assistant/ask with {question, announcement_id}
      const data = await askAssistant(question, announcementId);

      clearContainer(responseArea);

      // Check if backend says no answer was found
      // The backend may return { found: false } or similar
      if (data.found === false || data.answer === null || data.answer === undefined) {
        const notFoundEl = document.createElement('p');
        notFoundEl.className = 'ai-qa-not-found';
        notFoundEl.textContent =
          'This information is not mentioned in the announcement. ' +
          'Please verify with the official source.';
        responseArea.appendChild(notFoundEl);
      } else {
        // Show the real answer from the backend
        const answerLabel = document.createElement('strong');
        answerLabel.textContent = 'Answer:';
        responseArea.appendChild(answerLabel);

        const answerText = document.createElement('p');
        answerText.className = 'ai-qa-answer';
        // Always use textContent — never innerHTML
        answerText.textContent = data.answer;
        responseArea.appendChild(answerText);

        // Optional: read answer aloud if speech synthesis is available
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(data.answer);
          utterance.lang = 'en-IN';
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      // Backend failed — honest error message
      clearContainer(responseArea);
      const errorEl = document.createElement('p');
      errorEl.className = 'ai-error-message';
      errorEl.textContent =
        'Could not get an answer at this time. Please try again later.';
      responseArea.appendChild(errorEl);
      console.error('[ai-assistant] showQAPanel ask error:', error);
    } finally {
      // Re-enable the button
      askBtn.disabled = false;
    }
  });

  // Step 10: Back button
  const backBtn = createTextButton('← Back to full announcement', () => {
    clearContainer(container);
  });
  container.appendChild(backBtn);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. initVoiceInput
// ─────────────────────────────────────────────────────────────────────────────
/**
 * initVoiceInput(inputElement, onResult, buttonContainer)
 *
 * Sets up a microphone button that fills `inputElement` with recognized speech.
 * Uses the browser's Web Speech API (SpeechRecognition).
 *
 * @param {HTMLInputElement} inputElement   - The text field to fill with recognized speech.
 * @param {Function}         onResult       - Callback called with the recognized text string.
 * @param {HTMLElement}      [buttonContainer] - Where to attach the mic button. Defaults to after inputElement.
 */
export function initVoiceInput(inputElement, onResult, buttonContainer) {
  // Step 1: Check if the browser supports Speech Recognition
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    // Not supported — show a friendly message near the input
    const unsupportedMsg = document.createElement('p');
    unsupportedMsg.className = 'ai-voice-unsupported';
    unsupportedMsg.textContent =
      'Voice input is not supported in this browser.';

    // Insert message after the input element if no buttonContainer given
    if (buttonContainer) {
      buttonContainer.appendChild(unsupportedMsg);
    } else if (inputElement.parentNode) {
      inputElement.parentNode.insertBefore(
        unsupportedMsg,
        inputElement.nextSibling
      );
    }
    return; // Stop here — nothing more to do
  }

  // Step 2: Create a microphone button
  const micBtn = document.createElement('button');
  micBtn.type = 'button';
  micBtn.className = 'ai-mic-button';
  micBtn.title = 'Click to speak your question';
  micBtn.textContent = '🎤'; // Mic emoji as label

  // Attach button to container or after the input
  if (buttonContainer) {
    buttonContainer.appendChild(micBtn);
  } else if (inputElement.parentNode) {
    inputElement.parentNode.insertBefore(micBtn, inputElement.nextSibling);
  }

  // Step 3: Create a status label that shows "Listening…" / "Processing…"
  const statusLabel = document.createElement('span');
  statusLabel.className = 'ai-voice-status';
  statusLabel.textContent = ''; // Empty until we start listening
  if (micBtn.parentNode) {
    micBtn.parentNode.insertBefore(statusLabel, micBtn.nextSibling);
  }

  // Step 4: Wire up the button click to start speech recognition
  micBtn.addEventListener('click', () => {
    // Create a new SpeechRecognition instance each time
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';          // Indian English locale
    recognition.interimResults = false;  // We only want final results
    recognition.maxAlternatives = 1;     // Best single guess

    // Show "Listening…" state
    statusLabel.textContent = 'Listening…';
    micBtn.disabled = true;

    recognition.start();

    // Step 5: Handle successful recognition
    recognition.addEventListener('result', (event) => {
      statusLabel.textContent = 'Processing…';

      // Get the best-guess transcript
      const transcript = event.results[0][0].transcript;

      // Fill the input field with recognized text
      inputElement.value = transcript;

      // Call the callback with the recognized text
      if (typeof onResult === 'function') {
        onResult(transcript);
      }

      statusLabel.textContent = '';
      micBtn.disabled = false;
    });

    // Step 6: Handle recognition ending (normal end)
    recognition.addEventListener('end', () => {
      micBtn.disabled = false;
      if (statusLabel.textContent === 'Listening…') {
        statusLabel.textContent = ''; // Clear if no result came
      }
    });

    // Step 7: Handle errors gracefully
    recognition.addEventListener('error', (event) => {
      micBtn.disabled = false;

      if (event.error === 'not-allowed') {
        // User denied microphone permission
        statusLabel.textContent =
          'Microphone access denied. Please allow microphone in browser settings.';
      } else if (event.error === 'no-speech') {
        statusLabel.textContent = 'No speech detected. Please try again.';
      } else {
        statusLabel.textContent = 'Voice input failed. Please try again.';
      }

      console.error('[ai-assistant] SpeechRecognition error:', event.error);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. createAIPanelButtons
// ─────────────────────────────────────────────────────────────────────────────
/**
 * createAIPanelButtons(announcementId, container)
 *
 * Renders a row of AI action buttons (Summarize, Translate, Ask a Question)
 * into `container`. Each button calls the appropriate function above when
 * clicked.
 *
 * @param {string|number} announcementId - The announcement ID.
 * @param {HTMLElement}   container      - The DOM element to place buttons and panels in.
 */
export function createAIPanelButtons(announcementId, container) {
  // ── Button row wrapper ──────────────────────────────────────────────────
  const buttonRow = document.createElement('div');
  buttonRow.className = 'ai-button-row';

  // ── Panel area: AI output will appear here ──────────────────────────────
  // We create a separate inner panel div inside the container so buttons stay
  const panelArea = document.createElement('div');
  panelArea.className = 'ai-panel-area';

  // ── Helper: grab the original announcement text for translation toggle ──
  // We look for a known class used in the announcement detail view
  function getOriginalText() {
    const bodyEl =
      container.closest('.announcement-detail')?.querySelector('.announcement-body');
    return bodyEl ? bodyEl.textContent : '';
  }

  // ── 1. Summarize button ─────────────────────────────────────────────────
  const summarizeBtn = document.createElement('button');
  summarizeBtn.className = 'ai-action-button ai-summarize-button';
  summarizeBtn.textContent = '✦ Summarize';
  summarizeBtn.addEventListener('click', () => {
    showSummarizePanel(announcementId, panelArea);
  });
  buttonRow.appendChild(summarizeBtn);

  // ── 2. Translate to Tamil button ────────────────────────────────────────
  const translateTaBtn = document.createElement('button');
  translateTaBtn.className = 'ai-action-button ai-translate-button';
  translateTaBtn.textContent = '🌐 Translate to Tamil';
  translateTaBtn.addEventListener('click', () => {
    showTranslatePanel(announcementId, 'ta', getOriginalText(), panelArea);
  });
  buttonRow.appendChild(translateTaBtn);

  // ── 3. Show in English button ───────────────────────────────────────────
  const translateEnBtn = document.createElement('button');
  translateEnBtn.className = 'ai-action-button ai-translate-button';
  translateEnBtn.textContent = '🌐 Show in English';
  translateEnBtn.addEventListener('click', () => {
    showTranslatePanel(announcementId, 'en', getOriginalText(), panelArea);
  });
  buttonRow.appendChild(translateEnBtn);

  // ── 4. Ask a Question button ────────────────────────────────────────────
  const qaBtn = document.createElement('button');
  qaBtn.className = 'ai-action-button ai-qa-button';
  qaBtn.textContent = '❓ Ask a Question';
  qaBtn.addEventListener('click', () => {
    showQAPanel(announcementId, panelArea);
  });
  buttonRow.appendChild(qaBtn);

  // ── Attach everything to the container ─────────────────────────────────
  container.appendChild(buttonRow);
  container.appendChild(panelArea);
}
