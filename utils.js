/**
 * @typedef {Object} DOMElements
 * @property {HTMLElement} loginButton - The login button element
 * @property {HTMLElement} logoutButton - The logout button element
 * @property {HTMLElement} drawer - The drawer element
 * @property {HTMLElement} drawerList - The list inside the drawer
 * @property {HTMLElement} topAppBar - The top app bar element
 * @property {HTMLElement} fab - The floating action button element for adding Expense
 * @property {HTMLElement} snackbar - The snackbar container element 
 * @property {HTMLElement} dialog - The dialog element
 * @property {HTMLElement} closeBtn - The close button element
 */

/**
 * @type {DOMElements}
 */
const DOM = {
  loginButton: document.getElementById("login_button"),
  logoutButton: document.getElementById("logout_button"),
  drawer: mdc.drawer.MDCDrawer.attachTo(document.querySelector(".mdc-drawer")),
  drawerList: document.querySelector(".mdc-drawer .mdc-list"),
  topAppBar: mdc.topAppBar.MDCTopAppBar.attachTo(document.querySelector(".mdc-top-app-bar")),
  fab: document.getElementById("add-button"),
  snackbar: mdc.snackbar.MDCSnackbar.attachTo(document.querySelector('.mdc-snackbar')),
  dialog: document.getElementById("dialog"),
  closeBtn: document.getElementById("close"),
};

/**
 * Utility functions
 * @typedef {Object} Utils
 * @property {function(HTMLElement): void} showElement - Show an element
 * @property {function(HTMLElement): void} hideElement - Hide an element
 * @property {function(string): void} showSnackbar - Show a snackbar message
 * @property {function(string): void} logSuccess - Log a success message
 * @property {function(string, Error): void} logError - Log an error message
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
};

// Expose utils to the global scope
window.expenseManager = window.expenseManager || {};
window.expenseManager.utils = utilities;
