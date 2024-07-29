/**
 * @typedef {Object} DOMElements
 * @property {HTMLElement} loginButton - The login button element
 * @property {HTMLElement} logoutButton - The logout button element
 * @property {HTMLElement} snackbar - The snackbar container element
 * @property {HTMLElement} addExpenseBtn - FAB for adding Expense element
 */

/**
 * @type {DOMElements}
 */
const DOM = {
  loginButton: document.getElementById("login_button"),
  logoutButton: document.getElementById("logout_button"),
  snackbar: mdc.snackbar.MDCSnackbar.attachTo(document.querySelector('.mdc-snackbar')),
  fab: document.getElementById("add-button"),
  dialog: document.getElementById("dialog"),
  closeBtn: document.getElementById("close"),
};

/**
 * @typedef {Object} Utils
 * @property {function(HTMLElement): void} showElement - Show an element
 * @property {function(HTMLElement): void} hideElement - Hide an element
 * @property {function(string): void} showSnackbar - Show a snackbar message
 * @property {function(string): void} logSuccess - Log a success message
 * @property {function(string, Error): void} logError - Log an error message
 * @property {function(string, string[]): Object} appendRequestObj - Generate append request object - Docs: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/append
 * @property {function(string, string[]): Object} batchGetRequestObj - Generate batchGet request object - Docs: https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
 * @property {function(string): string} wrapInOption - Wrap a string in an HTML option tag
 */

/**
 * @type {Utils}
 */
const utilities = {
  showElement: (el) => (el.style.display = "block"),
  hideElement: (el) => (el.style.display = "none"),
  showSnackbar: (message) => {
    DOM.snackbar.labelText = message;
    DOM.snackbar.open();
  },
  logSuccess: (message) => {
    console.log(`✅ ${message}`);
    utilities.showSnackbar(message);
  },
  logError: (message, error) => {
    console.error(`❌ ${message}`, error);
    utilities.showSnackbar(`Error: ${message}`);
  },
  appendRequestObj: (spreadsheetId, values) => ({
    spreadsheetId,
    range: "Expenses!A1",
    includeValuesInResponse: true,
    responseValueRenderOption: "FORMATTED_VALUE",
    responseDateTimeRenderOption: "FORMATTED_STRING",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    resource: { values },
  }),
  batchGetRequestObj: (spreadsheetId, ranges) => ({
    spreadsheetId,
    ranges,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
    majorDimension: "COLUMNS",
  }),
  wrapInOption: (option) => `<option value='${option}'>${option}</option>`,
};

// Expose utils to the global scope
window.expenseManager = window.expenseManager || {};
window.expenseManager.utils = utilities;
