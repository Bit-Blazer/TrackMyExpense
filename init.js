/**
 * @typedef {Object} Config
 * @property {string} CLIENT_ID - The Google OAuth 2.0 client ID
 * @property {string} API_KEY - The Google API key
 * @property {string[]} DISCOVERY_DOCS - URLs for API discovery
 * @property {string} SCOPES - OAuth 2.0 scopes for the application
 */

/**
 * @type {Config}
 */
const CONFIG = {
  CLIENT_ID: "199896734762-4v1iljba22eglf9uiit3cmik36gspm6e.apps.googleusercontent.com",
  API_KEY: "AIzaSyDu-qTR9Dr6Un5BCGE56hzPZcIUTY_uBZo",
  DISCOVERY_DOCS: [
    "https://sheets.googleapis.com/$discovery/rest?version=v4",
    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
  ],
  SCOPES: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
};

// Variables
let tokenClient;
let gapiInitialized = false;
let gisInitialized = false;

/**
 * Initializes the Google API client library
 */
function initGapi() {
  gapi.load("client", async () => {
    try {
      await gapi.client.init({
        apiKey: CONFIG.API_KEY,
        discoveryDocs: CONFIG.DISCOVERY_DOCS,
      });
      gapiInitialized = true;
      checkInitialization();
      window.expenseManager.utils.logSuccess("Google API client initialized");
    } catch (error) {
      window.expenseManager.utils.logError("Failed to initialize Google API client", error);
    }
  });
}

/**
 * Initializes Google Identity Services
 */
function initGis() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: handleAuthResponse,
  });
  gisInitialized = true;
  checkInitialization();
  window.expenseManager.utils.logSuccess("Google Identity Services initialized");
}

/**
 * Checks if both GAPI and GIS are initialized
 */
function checkInitialization() {
  if (gapiInitialized && gisInitialized) {
    window.expenseManager.utils.showElement(DOM.loginButton);
  }
}

/**
 * Handles the authentication response
 * @param {Object} response - The authentication response object
 */
function handleAuthResponse(response) {
  if (response.error) {
    window.expenseManager.utils.logError("Authentication failed", response.error);
    return;
  }
  window.expenseManager.utils.logSuccess("Authentication successful");
  initializeApp();
}

/**
 * Handles the login process
 */
function handleLogin() {
  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    tokenClient.requestAccessToken({ prompt: "" });
  }
}

/**
 * Handles the logout process
 */
function handleLogout() {
  const token = gapi.client.getToken();
  if (token) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken("");
    window.expenseManager.utils.showElement(DOM.loginButton);
    window.expenseManager.utils.hideElement(DOM.logoutButton);
    window.expenseManager.utils.logSuccess("Logged out successfully");
  }
}

// Initialization
window.gapiLoaded = initGapi;
window.gisLoaded = initGis;
