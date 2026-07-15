/**
 * Configuration object for Google API and Identity Services
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
  CLIENT_ID:
    "490984369209-u5nicrtt86llfeb6p9270f02s3mr5vsb.apps.googleusercontent.com",
  DISCOVERY_DOCS: [
    "https://sheets.googleapis.com/$discovery/rest?version=v4",
    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
  ],
  SCOPES:
    "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
};

// Variables
let tokenClient;
let gapiInitialized = false;
let gisInitialized = false;
let currentUser = null;

/**
 * Initializes the Google API client library
 */
function initGapi() {
  gapi.load("client", async () => {
    try {
      await gapi.client.init({
        discoveryDocs: CONFIG.DISCOVERY_DOCS,
      });
      gapiInitialized = true;
      checkInitialization();
      window.expenseManager.utils.logSuccess("Google API client initialized");
    } catch (error) {
      window.expenseManager.utils.logError(
        "Failed to initialize Google API client",
        error,
      );
    }
  });
}

/**
 * Initializes Google Identity Services with OAuth2
 */
function initGis() {
  // Initialize token client for OAuth2 flow
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: handleTokenResponse,
  });

  DOM.googleSignInBtn.onclick = function () {
    tokenClient.requestAccessToken();
  };

  gisInitialized = true;
  checkInitialization();
  window.expenseManager.utils.logSuccess("Google OAuth2 client initialized");
}

/**
 * Handles the token response from OAuth2 flow
 * This receives the access token directly after user grants permission
 */
function handleTokenResponse(tokenResponse) {
  if (tokenResponse.error) {
    window.expenseManager.utils.logError(
      "Failed to get access token",
      tokenResponse.error,
    );
    return;
  }

  if (tokenResponse.access_token) {
    window.expenseManager.utils.logSuccess(
      "Access token received, setting up GAPI client",
    );

    // Set the token in gapi client for API calls
    gapi.client.setToken(tokenResponse);

    // Store token for persistence
    const tokenInfo = {
      access_token: tokenResponse.access_token,
      expires_in: tokenResponse.expires_in,
      scope: tokenResponse.scope,
      token_type: tokenResponse.token_type || "Bearer",
      expires_at: Date.now() + tokenResponse.expires_in * 1000,
    };
    localStorage.setItem("oauthToken", JSON.stringify(tokenInfo));

    // Get user information and complete the sign-in process
    getUserInfoAndComplete(tokenResponse.access_token);
  }
}

/**
 * Gets user information using the access token and completes sign-in
 */
async function getUserInfoAndComplete(accessToken) {
  try {
    // Get basic user info for display
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      currentUser = {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        id: userInfo.id,
      };

      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      localStorage.setItem("userSignInTime", Date.now().toString());

      window.expenseManager.utils.logSuccess(
        "Single-prompt sign-in completed successfully",
      );

      // Show user as fully logged in and initialize app
      showUserAsLoggedIn();
      initializeApp();
    } else {
      throw new Error("Failed to fetch user info");
    }
  } catch (error) {
    window.expenseManager.utils.logError("Error getting user info", error);

    // Even if user info fails, we still have the token, so show basic logged-in state
    showUserAsLoggedIn();
    initializeApp();
  }
}

/**
 * Checks if both GAPI and GIS are initialized
 */
function checkInitialization() {
  if (gapiInitialized && gisInitialized) {
    // Check if user is already authenticated
    checkExistingAuth();
  }
}

/**
 * Restores OAuth token from localStorage if available and valid
 */
function restoreOAuthToken() {
  const storedToken = localStorage.getItem("oauthToken");

  if (storedToken) {
    try {
      const tokenInfo = JSON.parse(storedToken);

      // Check if token is still valid (not expired)
      if (tokenInfo.expires_at && Date.now() < tokenInfo.expires_at) {
        // Restore token to gapi client
        gapi.client.setToken({
          access_token: tokenInfo.access_token,
          expires_in: Math.floor((tokenInfo.expires_at - Date.now()) / 1000),
          scope: tokenInfo.scope,
          token_type: tokenInfo.token_type,
        });

        window.expenseManager.utils.logSuccess(
          "OAuth token restored from storage",
        );
        return true;
      } else {
        window.expenseManager.utils.logSuccess(
          "Stored OAuth token expired, clearing...",
        );
        localStorage.removeItem("oauthToken");
      }
    } catch (error) {
      window.expenseManager.utils.logError(
        "Failed to parse stored OAuth token",
        error,
      );
      localStorage.removeItem("oauthToken");
    }
  } else {
    window.expenseManager.utils.logSuccess("No stored OAuth token found");
  }

  return false;
}

/**
 * Restores user session from localStorage if available
 */
function restoreUserSession() {
  const storedUser = localStorage.getItem("currentUser");
  const signInTime = localStorage.getItem("userSignInTime");

  if (storedUser && signInTime) {
    // Check if session is not too old (24 hours)
    const sessionAge = Date.now() - parseInt(signInTime);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge < maxAge) {
      try {
        currentUser = JSON.parse(storedUser);
        window.expenseManager.utils.logSuccess(
          "User session restored from storage",
        );
        return true;
      } catch (error) {
        window.expenseManager.utils.logError(
          "Failed to parse stored user data",
          error,
        );
        // Clear invalid data
        localStorage.removeItem("currentUser");
        localStorage.removeItem("userSignInTime");
      }
    } else {
      window.expenseManager.utils.logSuccess(
        "Stored session expired, clearing...",
      );
      // Clear expired session
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userSignInTime");
    }
  }

  return false;
}

/**
 * Checks for existing authentication and validates token
 */
async function checkExistingAuth() {
  try {
    // First, try to restore user session from localStorage
    const sessionRestored = restoreUserSession();

    // Try to restore OAuth token
    const tokenRestored = restoreOAuthToken();

    // If both session and token are restored, validate and initialize
    if (sessionRestored && tokenRestored) {
      const token = gapi.client.getToken();
      if (token) {
        // User is already authenticated with valid token
        window.expenseManager.utils.logSuccess(
          "Session and token restored successfully",
        );
        showUserAsLoggedIn();
        initializeApp();
        return;
      }
    }
  } catch (error) {
    window.expenseManager.utils.logError("Auth check failed", error);
  }
}

/**
 * Shows user as fully connected to Google Sheets
 */
function showUserAsLoggedIn() {
  DOM.googleSignInBtn.style.display = "none";
  if (currentUser) {
    DOM.userInfo.style.display = "flex";
    DOM.userPicture.src = currentUser.picture;
    DOM.userName.textContent = currentUser.name;

    // Update drawer subtitle
    const drawerSubtitle = document.querySelector(".mdc-drawer__subtitle");
    if (drawerSubtitle) {
      drawerSubtitle.textContent = currentUser.email;
    }
  }
}

// Make callback functions available globally for script loading
window.gapiLoaded = initGapi;
window.gisLoaded = initGis;
