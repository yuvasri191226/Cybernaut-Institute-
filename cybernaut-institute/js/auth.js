/**
 * auth.js
 * -------
 * Handles login form validation and authentication for the
 * Cybernaut Institute of Technology announcement system.
 *
 * This file is used on login.html only.
 * It imports helper functions from api.js and utils.js.
 *
 * Exported functions:
 *   - initLoginPage()   : call this once on page load
 */

// ─── Imports ──────────────────────────────────────────────────────────────────
// api.js provides login(), setAuthToken(), getAuthToken()
import { login, setAuthToken, getAuthToken } from './api.js';
// utils.js provides showToast() for small pop-up notifications
import { showToast } from './utils.js';


// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * validateLoginForm
 * -----------------
 * Checks that the email/username and password fields are filled in correctly.
 *
 * @param {string} emailId       - The id of the email/username input element
 * @param {string} passwordId    - The id of the password input element
 * @param {string} emailErrorId  - The id of the span that shows email errors
 * @param {string} passwordErrorId - The id of the span that shows password errors
 * @returns {boolean} true if the form is valid, false if there are errors
 */
function validateLoginForm(emailId, passwordId, emailErrorId, passwordErrorId) {
  // Grab the input elements and error display spans from the page
  const emailInput    = document.getElementById(emailId);
  const passwordInput = document.getElementById(passwordId);
  const emailError    = document.getElementById(emailErrorId);
  const passwordError = document.getElementById(passwordErrorId);

  // Clear any previous error messages before we start checking
  emailError.textContent    = '';
  passwordError.textContent = '';

  // Track whether everything looks good
  let isValid = true;

  // --- Check the email/username field ---
  const emailValue = emailInput.value.trim();

  if (emailValue === '') {
    // Field is completely empty
    emailError.textContent = 'Please enter your username or email.';
    isValid = false;
  } else if (emailValue.includes('@')) {
    // The user typed something that looks like an email address.
    // Apply a basic email format check (must have text@text.text).
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      emailError.textContent = 'Please enter a valid email address (e.g. student@cit.edu).';
      isValid = false;
    }
  }
  // If it does not contain '@', we treat it as a plain username — no format check needed.

  // --- Check the password field ---
  const passwordValue = passwordInput.value;

  if (passwordValue === '') {
    passwordError.textContent = 'Please enter your password.';
    isValid = false;
  }

  return isValid;
}


/**
 * setLoginLoading
 * ---------------
 * Disables or re-enables the submit button to show that a request is in progress.
 *
 * @param {HTMLFormElement} form      - The login form element
 * @param {boolean}         isLoading - true = show loading state, false = restore
 */
function setLoginLoading(form, isLoading) {
  // Find the submit button inside this form
  const button = form.querySelector('.login-button');
  if (!button) return;

  if (isLoading) {
    // Remember the original button text so we can restore it later
    // We store it on the button element itself as a custom property
    button._originalText = button.textContent;
    button.textContent   = 'Logging in…';
    button.disabled      = true;
  } else {
    // Put the original text back and allow clicks again
    button.textContent = button._originalText || 'Login';
    button.disabled    = false;
  }
}


/**
 * showFormMessage
 * ---------------
 * Displays a success or error message below the login form.
 *
 * @param {string}  messageId - The id of the message <span> element
 * @param {string}  text      - The message to show
 * @param {boolean} isError   - true = red (error), false = green (success)
 */
function showFormMessage(messageId, text, isError) {
  const messageSpan = document.getElementById(messageId);
  if (!messageSpan) return;

  // Set message text safely — never use innerHTML here
  messageSpan.textContent = text;

  // Apply colour styling inline
  messageSpan.style.color = isError ? '#d32f2f' : '#388e3c';
}


/**
 * addPasswordToggle
 * -----------------
 * Injects a "Show / Hide password" button directly after the given
 * password input so users can check what they typed.
 *
 * @param {string} passwordId - The id of the password <input> element
 */
function addPasswordToggle(passwordId) {
  const passwordInput = document.getElementById(passwordId);
  if (!passwordInput) return;

  // Create the toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.type        = 'button';           // important: prevent form submission
  toggleBtn.textContent = 'Show password';
  toggleBtn.className   = 'password-toggle-btn';
  toggleBtn.setAttribute('aria-label', 'Show or hide password');

  // Insert the button right after the password input in the DOM
  passwordInput.insertAdjacentElement('afterend', toggleBtn);

  // When the button is clicked, switch between showing and hiding the password
  toggleBtn.addEventListener('click', function () {
    if (passwordInput.type === 'password') {
      // Show the password as plain text
      passwordInput.type    = 'text';
      toggleBtn.textContent = 'Hide password';
    } else {
      // Hide it again
      passwordInput.type    = 'password';
      toggleBtn.textContent = 'Show password';
    }
  });
}


// ─── Login Handlers ───────────────────────────────────────────────────────────

/**
 * handleStudentLogin
 * ------------------
 * Called when the student login form is submitted.
 * Validates the fields, sends credentials to the backend,
 * saves the returned token, and redirects to the student dashboard.
 *
 * IMPORTANT: Passwords are NEVER stored anywhere. Only the JWT token
 * returned by the server is saved (in sessionStorage via api.setAuthToken).
 *
 * @param {Event} event - The form submit event
 */
async function handleStudentLogin(event) {
  // Stop the browser from refreshing the page on submit
  event.preventDefault();

  const form = document.getElementById('student-login-form');

  // Clear any old form-level message
  showFormMessage('student-login-message', '', true);

  // Run client-side validation first; stop if invalid
  const isValid = validateLoginForm(
    'student-email',
    'student-password',
    'student-email-error',
    'student-password-error'
  );
  if (!isValid) return;

  // Read the field values
  const username = document.getElementById('student-email').value.trim();
  const password = document.getElementById('student-password').value;
  // NOTE: 'password' is only held in this local variable for the duration
  // of the network request. It is never stored in localStorage / sessionStorage.

  // Show loading state so the user knows something is happening
  setLoginLoading(form, true);

  try {
    // Send credentials to the backend (api.js handles the fetch call)
    const response = await login(username, password);

    // The backend should return an object containing a JWT token
    if (response && response.token) {
      // Save the token securely (sessionStorage only — cleared when tab closes)
      setAuthToken(response.token);

      // Confirm success to the user
      showFormMessage('student-login-message', 'Login successful! Redirecting…', false);

      // Redirect to the student dashboard after a short pause
      setTimeout(function () {
        window.location.href = 'student-dashboard.html';
      }, 800);
    } else {
      // Backend responded but did not send a token — treat as failure
      showFormMessage(
        'student-login-message',
        'Login failed: unexpected server response. Please try again.',
        true
      );
    }
  } catch (error) {
    // Network error or HTTP 4xx/5xx — show the server's message if available
    showFormMessage(
      'student-login-message',
      error.message || 'Login failed. Please check your credentials and try again.',
      true
    );
    showToast('Student login failed. Please try again.', 'error');
  } finally {
    // Always restore the button, whether the request succeeded or failed
    setLoginLoading(form, false);
  }
}


/**
 * handleAdminLogin
 * ----------------
 * Same flow as handleStudentLogin but redirects to admin-dashboard.html.
 * Also checks the 'role' field returned by the API to confirm admin access.
 *
 * @param {Event} event - The form submit event
 */
async function handleAdminLogin(event) {
  event.preventDefault();

  const form = document.getElementById('admin-login-form');

  // Clear any old message
  showFormMessage('admin-login-message', '', true);

  // Validate the admin form fields
  const isValid = validateLoginForm(
    'admin-email',
    'admin-password',
    'admin-email-error',
    'admin-password-error'
  );
  if (!isValid) return;

  const username = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  // NOTE: password is only used for the network call and is never stored.

  setLoginLoading(form, true);

  try {
    const response = await login(username, password);

    if (response && response.token) {
      // Optional extra check: confirm the user actually has an admin role
      const role = response.role || '';
      if (role && role !== 'admin' && role !== 'administrator') {
        // The backend authenticated them but they are not an admin
        showFormMessage(
          'admin-login-message',
          'Access denied: this account does not have admin privileges.',
          true
        );
        return; // Do NOT save the token or redirect
      }

      // Save the token (sessionStorage only — cleared when tab closes)
      setAuthToken(response.token);

      showFormMessage('admin-login-message', 'Login successful! Redirecting…', false);

      setTimeout(function () {
        window.location.href = 'admin-dashboard.html';
      }, 800);
    } else {
      showFormMessage(
        'admin-login-message',
        'Login failed: unexpected server response. Please try again.',
        true
      );
    }
  } catch (error) {
    showFormMessage(
      'admin-login-message',
      error.message || 'Login failed. Please check your credentials and try again.',
      true
    );
    showToast('Admin login failed. Please try again.', 'error');
  } finally {
    setLoginLoading(form, false);
  }
}


// ─── Page Initialisation ──────────────────────────────────────────────────────

/**
 * checkAlreadyLoggedIn
 * --------------------
 * If the user already has a valid auth token and visits login.html,
 * redirect them straight to the correct dashboard so they do not have
 * to log in again.
 *
 * We cannot know the role from the token alone without decoding JWT,
 * so we redirect to student-dashboard.html by default.
 * (The dashboard pages themselves will redirect admins if needed.)
 */
function checkAlreadyLoggedIn() {
  const token = getAuthToken();

  if (token) {
    // A token exists — the user is probably still logged in.
    // Redirect them away from the login page.
    // We use student-dashboard.html as the safe default; admin users
    // will be redirected again by admin-dashboard.html if necessary.
    window.location.href = 'student-dashboard.html';
  }
}


/**
 * initLoginPage
 * -------------
 * The main entry point for this module.
 * Call this once when the page loads.
 *
 * It:
 *   1. Checks whether the user is already logged in (and redirects if so)
 *   2. Attaches submit handlers to both login forms
 *   3. Injects "Show/Hide password" toggle buttons
 *
 * Only runs on pages whose <body> has the class "page-login".
 */
function initLoginPage() {
  // Guard: only run on the login page
  if (!document.body.classList.contains('page-login')) {
    return;
  }

  // If a token already exists, skip the login page entirely
  checkAlreadyLoggedIn();

  // --- Wire up the Student login form ---
  const studentForm = document.getElementById('student-login-form');
  if (studentForm) {
    studentForm.addEventListener('submit', handleStudentLogin);
  }

  // --- Wire up the Admin login form ---
  const adminForm = document.getElementById('admin-login-form');
  if (adminForm) {
    adminForm.addEventListener('submit', handleAdminLogin);
  }

  // --- Add Show/Hide password toggles to both forms ---
  addPasswordToggle('student-password');
  addPasswordToggle('admin-password');
}


// ─── Exports ──────────────────────────────────────────────────────────────────
// Only initLoginPage is exported because that is the only function
// other files need to call. All other functions are internal helpers.
export { initLoginPage };
