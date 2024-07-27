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
  SCOPES: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly",
};

/**
 * @typedef {Object} DOMElements
 * @property {HTMLElement} loginButton - The login button element
 * @property {HTMLElement} logoutButton - The logout button element
 * @property {HTMLElement} forms - The forms container element
 * @property {HTMLElement} formLoader - The form loader element
 * @property {HTMLElement} snackbar - The snackbar container element
 */

/**
 * @type {DOMElements}
 */
const DOM = {
  loginButton: document.getElementById("login_button"),
  logoutButton: document.getElementById("logout_button"),
  forms: document.getElementById("forms"),
  formLoader: document.getElementById("form-loader"),
  snackbar: document.getElementById("toast-container"),

  expenseForm: document.getElementById("expense-form"),
  transferForm: document.getElementById("transfer-form"),

  expensedescription: document.getElementById("expense-description"),
  transferdescription: document.getElementById("transfer-description"),

  expensedate: document.getElementById("expense-date"),
  transferdate: document.getElementById("transfer-date"),

  accountEl: document.getElementById("expense-account"),
  categoryEl: document.getElementById("expense-category"),

  expenseamount: document.getElementById("expense-amount"),
  transferamount: document.getElementById("transfer-amount"),

  isIncomeEl: document.getElementById("is-income"),
  addExpenseBtn: document.getElementById("add-expense"),
  fromAccountEl: document.getElementById("transfer-from-account"),
  toAccountEl: document.getElementById("transfer-to-account"),
  saveBtn: document.getElementById("save"),
};

// Initialize Material Components
mdc.autoInit();

// Variables
let tokenClient;
let gapiInitialized = false;
let gisInitialized = false;

const utils = window.expenseManager.utils;

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
      utils.logSuccess("Google API client initialized");
    } catch (error) {
      utils.logError("Failed to initialize Google API client", error);
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
  utils.logSuccess("Google Identity Services initialized");
}

/**
 * Checks if both GAPI and GIS are initialized
 */
function checkInitialization() {
  if (gapiInitialized && gisInitialized) {
    utils.showElement(DOM.loginButton);
  }
}

/**
 * Handles the authentication response
 * @param {Object} response - The authentication response object
 */
function handleAuthResponse(response) {
  if (response.error) {
    utils.logError("Authentication failed", response.error);
    return;
  }
  utils.logSuccess("Authentication successful");
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
    utils.showLoader();
    utils.showElement(DOM.loginButton);
    utils.hideElement(DOM.logoutButton);
    utils.logSuccess("Logged out successfully");
  }
}

/**
 * Initializes the application
 */
async function initializeApp() {
  utils.hideElement(DOM.loginButton);
  utils.showElement(DOM.logoutButton);
  utils.hideLoader();

  try {
    const sheetId = await getOrCreateSheet();
    const { accounts, categories } = await fetchSheetData(sheetId);
    initializeForms(sheetId, accounts, categories);
    utils.logSuccess("App initialized successfully");
  } catch (error) {
    utils.logError("Failed to initialize app", error);
  }
}

/**
 * Gets or creates a sheet
 * @returns {Promise<string>} The sheet ID
 */
async function getOrCreateSheet() {
  try {
    const sheetId = await findSheet();
    utils.logSuccess("Existing sheet found");
    return sheetId;
  } catch {
    utils.logError("Sheet Not Found...");
    utils.logSuccess("Creating new sheet");
    return createSheet();
  }
}

/**
 * Finds an existing sheet
 * @returns {Promise<string>} The sheet ID
 */
function findSheet() {
  return new Promise((resolve, reject) => {
    gapi.client.drive.files
      .list({
        q: `name='Expense Sheet' and mimeType='application/vnd.google-apps.spreadsheet'`,
      })
      .then((response) => {
        if (response.result.files.length === 0) reject();
        else resolve(response.result.files[0].id);
      })
      .catch(reject);
  });
}

/**
 * Creates a new sheet
 * @returns {Promise<string>} The new sheet ID
 */
function createSheet() {
  return new Promise((resolve, reject) => {
    gapi.client.sheets.spreadsheets
      .create({
        properties: { title: "Expense Sheet" },
        sheets: [
          {
            properties: {
              title: "Expenses",
              gridProperties: { columnCount: 4, frozenRowCount: 1 },
            },
            data: [
              {
                rowData: [
                  {
                    values: [
                      { userEnteredValue: { stringValue: "Description" } },
                      { userEnteredValue: { stringValue: "Amount" } },
                      { userEnteredValue: { stringValue: "Category" } },
                      { userEnteredValue: { stringValue: "Date" } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
      .then((response) => {
        const sheetId = response.result.spreadsheetId;
        utils.logSuccess(`New sheet created with ID: ${sheetId}`);
        resolve(sheetId);
      })
      .catch(reject);
  });
}

/**
 * Fetches sheet data
 * @param {string} sheetId - The sheet ID
 * @returns {Promise<{accounts: string[], categories: string[]}>} The fetched data
 */
async function fetchSheetData(sheetId) {
  const ACCOUNT_RANGE = "Data!A2:A50";
  const CATEGORY_RANGE = "Data!E2:E50";
  const response = await gapi.client.sheets.spreadsheets.values.batchGet(
    window.expenseManager.utils.batchGetRequestObj(sheetId, [ACCOUNT_RANGE, CATEGORY_RANGE])
  );
  return {
    accounts: response.result.valueRanges[0].values[0],
    categories: response.result.valueRanges[1].values[0],
  };
}

/**
 * Initializes the forms
 * @param {string} sheetId - The sheet ID
 * @param {string[]} accounts - List of account names
 * @param {string[]} categories - List of expense categories
 */
function initializeForms(sheetId, accounts, categories) {
  window.expenseManager.expenseForm.init(sheetId, accounts, categories);
  window.expenseManager.transferForm.init(sheetId, accounts);
  utils.logSuccess("Forms initialized");
}

// Initialization
window.gapiLoaded = initGapi;
window.gisLoaded = initGis;

const drawer = mdc.drawer.MDCDrawer.attachTo(document.querySelector('.mdc-drawer'));
const topAppBar = mdc.topAppBar.MDCTopAppBar.attachTo(document.querySelector('.mdc-top-app-bar'));
topAppBar.setScrollTarget(document.getElementById('main-content'));
topAppBar.listen('MDCTopAppBar:nav', () => {
  drawer.open = !drawer.open;
});

const drawerList = document.querySelector('.mdc-drawer .mdc-list');
drawerList.addEventListener('click', () => {
  drawer.open = false;
});
