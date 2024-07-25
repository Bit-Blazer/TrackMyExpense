//new code
/**
 * @typedef {Object} Utils
 * @property {function(HTMLElement): void} showElement - Show an element
 * @property {function(HTMLElement): void} hideElement - Hide an element
 * @property {function(): void} showLoader - Show the loader
 * @property {function(): void} hideLoader - Hide the loader
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
  showLoader: () => {
    utils.hideElement(DOM.forms);
    utils.showElement(DOM.formLoader);
  },
  hideLoader: () => {
    utils.showElement(DOM.forms);
    utils.hideElement(DOM.formLoader);
  },
  showSnackbar: (message) => {
    // TODO: Fix the error
    // DOM.snackbar.MaterialSnackbar.showSnackbar({ message });
  },
  logSuccess: (message) => {
    console.log(`✅ ${message}`);
    utils.showSnackbar(message);
  },
  logError: (message, error) => {
    console.error(`❌ ${message}`, error);
    utils.showSnackbar(`Error: ${message}`);
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
