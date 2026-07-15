// Initialize Material Components
mdc.autoInit();

/**
 * Initializes the application
 */
async function initializeApp() {
  try {
    currentSheetId = await fetchOrCopySheet();
    await fetchSheetData(currentSheetId);
    sortExpenseData(0, false); // Sort expenses by recent date
    sortIncomeData(0, false); // Sort income by recent date
    renderCurrentExpensePage();
    renderCurrentIncomePage();
    window.expenseManager.utils.logSuccess("App initialized successfully");
  } catch (error) {
    window.expenseManager.utils.logError("Failed to initialize app", error);
  }
}

/**
 * Gets or creates a sheet
 * @returns {Promise<string>} The sheet ID
 */
async function fetchOrCopySheet() {
  try {
    const sheetId = await fetchSheet();
    window.expenseManager.utils.logSuccess("Existing sheet found", sheetId);
    return sheetId;
  } catch {
    window.expenseManager.utils.logError("Sheet Not Found...");
    window.expenseManager.utils.logSuccess("Creating new sheet");
    return copySheet();
  }
}

/**
 * Finds an existing sheet
 * @returns {Promise<string>} The sheet ID
 */
function fetchSheet() {
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
 * Copies the template Sheet to user's Drive and returns the new sheet ID.
 *
 * @returns {Promise<string>} - The new sheet ID.
 */
async function copySheet() {
  try {
    // Load the gapi client
    await gapi.client.load("drive", "v3");

    // Copy the file
    const copyResponse = await gapi.client.drive.files.copy({
      fileId: window.expenseManager.utils.TEMPLATE_SPREADSHEET_ID,
      resource: {
        name: "Expense Sheet",
        mimeType: "application/vnd.google-apps.spreadsheet",
      },
    });

    const newSheetId = copyResponse.result.id;
    window.expenseManager.utils.logSuccess("New Sheet ID:", newSheetId);
    return newSheetId;
  } catch (error) {
    window.expenseManager.utils.logError("Error copying the sheet:", error);
    throw error;
  }
}

/**
 * Fetches sheet data from Google Sheets
 * @param {string} sheetId - The sheet ID
 * @returns {Promise<{income: string[], expense: string[]}>} The fetched data
 */
async function fetchSheetData(sheetId) {
  const INCOME_RANGE = "Records!C8:F";
  const EXPENSE_RANGE = "Records!I8:L";
  try {
    const response = await gapi.client.sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: [INCOME_RANGE, EXPENSE_RANGE],
      majorDimension: "ROWS",
    });

    // Fetch income data
    incomeRecords = response.result.valueRanges[0].values || [];
    incomeTotalRows = incomeRecords.length;

    // Fetch expense data
    expenseRecords = response.result.valueRanges[1].values || [];
    expenseTotalRows = expenseRecords.length;
    window.expenseManager.utils.logSuccess("Sheet data fetched successfully");
  } catch (error) {
    window.expenseManager.utils.logError("Error fetching sheet data", error);
  }
}

/**
 * Adds a new record to the Google Sheet
 * @param {string} type - "income" or "expense"
 * @param {Array} recordData - Array of values [date, category, description, amount]
 */
async function addRecordToSheet(type, recordData) {
  try {
    // Find the next empty row by checking current data length
    const currentRecords = type === "income" ? incomeRecords : expenseRecords;
    const nextRow = 8 + currentRecords.length; // Starting from row 8 plus current data length
    const range =
      type === "income"
        ? `Records!C${nextRow}:F${nextRow}`
        : `Records!I${nextRow}:L${nextRow}`;

    const response = await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: currentSheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [recordData],
      },
    });

    window.expenseManager.utils.logSuccess(`${type} record added successfully`);
    return response;
  } catch (error) {
    window.expenseManager.utils.logError(`Error adding ${type} record`, error);
    throw error;
  }
}

/**
 * Refreshes data from Google Sheets after operations
 */
async function refreshSheetData() {
  try {
    await fetchSheetData(currentSheetId);
    renderCurrentExpensePage();
    renderCurrentIncomePage();
    updateCards();
    window.expenseManager.utils.logSuccess("Data refreshed from Google Sheets");
  } catch (error) {
    window.expenseManager.utils.logError("Error refreshing data", error);
    window.expenseManager.utils.showSnackbar(
      "Warning: Data may not be up to date. Please refresh the page.",
    );
  }
}

/**
 * Updates an existing record in the Google Sheet
 * @param {string} type - "income" or "expense"
 * @param {number} rowIndex - The row index to update
 * @param {Array} recordData - Array of values [date, category, description, amount]
 */
async function updateRecordInSheet(type, rowIndex, recordData) {
  try {
    const baseRange = type === "income" ? "Records!C" : "Records!I";
    const startRow = 8 + rowIndex; // Starting from row 8 as per your template
    const endRow = startRow;
    const range = `${baseRange}${startRow}:${
      type === "income" ? "F" : "L"
    }${endRow}`;

    const response = await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: currentSheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [recordData],
      },
    });

    window.expenseManager.utils.logSuccess(
      `${type} record updated successfully`,
    );

    // Refresh data from Google Sheets to ensure consistency
    await refreshSheetData();

    return response;
  } catch (error) {
    window.expenseManager.utils.logError(
      `Error updating ${type} record`,
      error,
    );
    throw error;
  }
}

/**
 * Gets the sheet ID for a given sheet name
 * @param {string} sheetName - The name of the sheet
 * @returns {Promise<number>} The sheet ID
 */
async function getSheetIdByName(sheetName) {
  try {
    const response = await gapi.client.sheets.spreadsheets.get({
      spreadsheetId: currentSheetId,
    });

    const sheet = response.result.sheets.find(
      (s) => s.properties.title === sheetName,
    );
    return sheet ? sheet.properties.sheetId : 0; // Default to 0 if not found
  } catch (error) {
    window.expenseManager.utils.logError("Error getting sheet ID", error);
    return 0; // Default to 0 if error
  }
}

/**
 * Deletes a record from the Google Sheet
 * @param {string} type - "income" or "expense"
 * @param {number} rowIndex - The row index to delete
 */
async function deleteRecordFromSheet(type, rowIndex) {
  try {
    const sheetId = await getSheetIdByName("Records");
    const actualRowIndex = 7 + rowIndex; // Starting from row 8 (0-indexed becomes 7)

    const response = await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: currentSheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: actualRowIndex,
                endIndex: actualRowIndex + 1,
              },
            },
          },
        ],
      },
    });

    window.expenseManager.utils.logSuccess(
      `${type} record deleted successfully`,
    );

    // Refresh data from Google Sheets to ensure consistency
    await refreshSheetData();

    return response;
  } catch (error) {
    window.expenseManager.utils.logError(
      `Error deleting ${type} record`,
      error,
    );
    throw error;
  }
}

DOM.topAppBar.setScrollTarget(document.querySelector(".main-content"));
DOM.topAppBar.listen("MDCTopAppBar:nav", () => {
  DOM.drawer.open = !DOM.drawer.open;
});

DOM.drawerList.listen("MDCList:action", () => {
  DOM.drawer.open = false;
});

// Pagination variables
// Expense table variables
let expenseCurrentPage = 1;
let expenseRowsPerPage = 10;
let expenseTotalRows = 0;
let expenseRecords = [];

// Income table variables
let incomeCurrentPage = 1;
let incomeRowsPerPage = 10;
let incomeTotalRows = 0;
let incomeRecords = [];

// Current active tab (0 = expenses, 1 = income)
let activeTab = 0;

// Dialog state
let currentSheetId = null;
let dialogActiveTab = 0; // 0 = expense, 1 = income
let isEditMode = false;
let editingRowIndex = -1;

// Attach MDC DataTable component to the tables
const expenseDataTable = mdc.dataTable.MDCDataTable.attachTo(
  document.querySelector("#expense-tab .mdc-data-table"),
);
const incomeDataTable = mdc.dataTable.MDCDataTable.attachTo(
  document.querySelector("#income-tab .mdc-data-table"),
);
const expenseTableBody = document.getElementById("expenses-table-content");
const incomeTableBody = document.getElementById("income-table-content");

// Pagination button elements for expenses
const expenseFirstPageBtn = document.getElementById("expense-first-pageBtn");
const expensePrevPageBtn = document.getElementById("expense-prev-pageBtn");
const expenseNextPageBtn = document.getElementById("expense-next-pageBtn");
const expenseLastPageBtn = document.getElementById("expense-last-pageBtn");
const expensePaginationTotal = document.getElementById(
  "expense-pagination-total",
);

// Pagination button elements for income
const incomeFirstPageBtn = document.getElementById("income-first-pageBtn");
const incomePrevPageBtn = document.getElementById("income-prev-pageBtn");
const incomeNextPageBtn = document.getElementById("income-next-pageBtn");
const incomeLastPageBtn = document.getElementById("income-last-pageBtn");
const incomePaginationTotal = document.getElementById(
  "income-pagination-total",
);

// Attach MDC Select component to the rows per page select elements
const expenseRowsPerPageSelect = mdc.select.MDCSelect.attachTo(
  document.querySelector("#expense-tab .mdc-select"),
);
const incomeRowsPerPageSelect = mdc.select.MDCSelect.attachTo(
  document.querySelector("#income-tab .mdc-select"),
);

// Event listeners for expense pagination buttons
expenseFirstPageBtn.addEventListener("click", () => {
  expenseDataTable.showProgress();
  expenseCurrentPage = 1;
  renderCurrentExpensePage();
});

expensePrevPageBtn.addEventListener("click", () => {
  expenseDataTable.showProgress();
  expenseCurrentPage--;
  renderCurrentExpensePage();
});

expenseNextPageBtn.addEventListener("click", () => {
  expenseDataTable.showProgress();
  expenseCurrentPage++;
  renderCurrentExpensePage();
});

expenseLastPageBtn.addEventListener("click", () => {
  expenseDataTable.showProgress();
  expenseCurrentPage = Math.ceil(expenseTotalRows / expenseRowsPerPage);
  renderCurrentExpensePage();
});

// Event listener for expense rows per page select
expenseRowsPerPageSelect.listen("MDCSelect:change", () => {
  expenseDataTable.showProgress();
  expenseRowsPerPage = parseInt(expenseRowsPerPageSelect.value);
  expenseCurrentPage = 1;
  renderCurrentExpensePage();
});

// Event listeners for income pagination buttons
incomeFirstPageBtn.addEventListener("click", () => {
  incomeDataTable.showProgress();
  incomeCurrentPage = 1;
  renderCurrentIncomePage();
});

incomePrevPageBtn.addEventListener("click", () => {
  incomeDataTable.showProgress();
  incomeCurrentPage--;
  renderCurrentIncomePage();
});

incomeNextPageBtn.addEventListener("click", () => {
  incomeDataTable.showProgress();
  incomeCurrentPage++;
  renderCurrentIncomePage();
});

incomeLastPageBtn.addEventListener("click", () => {
  incomeDataTable.showProgress();
  incomeCurrentPage = Math.ceil(incomeTotalRows / incomeRowsPerPage);
  renderCurrentIncomePage();
});

// Event listener for income rows per page select
incomeRowsPerPageSelect.listen("MDCSelect:change", () => {
  incomeDataTable.showProgress();
  incomeRowsPerPage = parseInt(incomeRowsPerPageSelect.value);
  incomeCurrentPage = 1;
  renderCurrentIncomePage();
});

// Render the current expense page
function renderCurrentExpensePage() {
  const startIndex = (expenseCurrentPage - 1) * expenseRowsPerPage;
  const endIndex = Math.min(startIndex + expenseRowsPerPage, expenseTotalRows);
  renderExpenseTableRows(expenseRecords.slice(startIndex, endIndex));
  updateExpensePagination();
  updateCards();
}

// Render the current income page
function renderCurrentIncomePage() {
  const startIndex = (incomeCurrentPage - 1) * incomeRowsPerPage;
  const endIndex = Math.min(startIndex + incomeRowsPerPage, incomeTotalRows);
  renderIncomeTableRows(incomeRecords.slice(startIndex, endIndex));
  updateIncomePagination();
  updateCards();
}

// Update MDC cards for totals and balance
function updateCards() {
  // Helper function to extract numeric value from currency string
  const parseAmount = (amountStr) => {
    if (!amountStr) return 0;
    // Remove currency symbols, spaces, and commas, then parse
    const numericStr = amountStr.toString().replace(/[₹$\s,]/g, "");
    const parsed = parseFloat(numericStr);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Calculate totals
  const totalIncome = incomeRecords.reduce(
    (sum, row) => sum + parseAmount(row[3]),
    0,
  );
  const totalExpenses = expenseRecords.reduce(
    (sum, row) => sum + parseAmount(row[3]),
    0,
  );
  const currentBalance = totalIncome - totalExpenses;

  // Update card values
  document.getElementById("card-total-income").textContent =
    `₹${totalIncome.toLocaleString()}`;
  document.getElementById("card-total-expenses").textContent =
    `₹${totalExpenses.toLocaleString()}`;
  document.getElementById("card-current-balance").textContent =
    `₹${currentBalance.toLocaleString()}`;
}

// Render expense table rows with the given data
function renderExpenseTableRows(data) {
  expenseTableBody.innerHTML = "";
  data.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.classList.add("mdc-data-table__row");

    // Add data cells
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.classList.add("mdc-data-table__cell");
      td.textContent = cell;
      tr.appendChild(td);
    });

    // Add action buttons cell
    const actionTd = document.createElement("td");
    actionTd.classList.add("mdc-data-table__cell");

    const editBtn = document.createElement("button");
    editBtn.className = "mdc-icon-button material-icons";
    editBtn.textContent = "edit";
    editBtn.title = "Edit";
    editBtn.onclick = () =>
      editRecord(
        "expense",
        row,
        (expenseCurrentPage - 1) * expenseRowsPerPage + index,
      );

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "mdc-icon-button material-icons";
    deleteBtn.textContent = "delete";
    deleteBtn.title = "Delete";
    deleteBtn.onclick = () =>
      deleteRecord(
        "expense",
        (expenseCurrentPage - 1) * expenseRowsPerPage + index,
      );

    actionTd.appendChild(editBtn);
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);

    expenseTableBody.appendChild(tr);
  });
}

// Render income table rows with the given data
function renderIncomeTableRows(data) {
  incomeTableBody.innerHTML = "";
  data.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.classList.add("mdc-data-table__row");

    // Add data cells
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.classList.add("mdc-data-table__cell");
      td.textContent = cell;
      tr.appendChild(td);
    });

    // Add action buttons cell
    const actionTd = document.createElement("td");
    actionTd.classList.add("mdc-data-table__cell");

    const editBtn = document.createElement("button");
    editBtn.className = "mdc-icon-button material-icons";
    editBtn.textContent = "edit";
    editBtn.title = "Edit";
    editBtn.onclick = () =>
      editRecord(
        "income",
        row,
        (incomeCurrentPage - 1) * incomeRowsPerPage + index,
      );

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "mdc-icon-button material-icons";
    deleteBtn.textContent = "delete";
    deleteBtn.title = "Delete";
    deleteBtn.onclick = () =>
      deleteRecord(
        "income",
        (incomeCurrentPage - 1) * incomeRowsPerPage + index,
      );

    actionTd.appendChild(editBtn);
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);

    incomeTableBody.appendChild(tr);
  });
}

// Update expense pagination buttons and display current page information
function updateExpensePagination() {
  expenseFirstPageBtn.disabled = expenseCurrentPage === 1;
  expensePrevPageBtn.disabled = expenseCurrentPage === 1;
  expenseNextPageBtn.disabled =
    expenseCurrentPage === Math.ceil(expenseTotalRows / expenseRowsPerPage);
  expenseLastPageBtn.disabled =
    expenseCurrentPage === Math.ceil(expenseTotalRows / expenseRowsPerPage);

  const start = (expenseCurrentPage - 1) * expenseRowsPerPage + 1;
  const end = Math.min(start + expenseRowsPerPage - 1, expenseTotalRows);
  expensePaginationTotal.textContent = `${start}-${end} of ${expenseTotalRows}`;
  expenseDataTable.hideProgress();
}

// Update income pagination buttons and display current page information
function updateIncomePagination() {
  incomeFirstPageBtn.disabled = incomeCurrentPage === 1;
  incomePrevPageBtn.disabled = incomeCurrentPage === 1;
  incomeNextPageBtn.disabled =
    incomeCurrentPage === Math.ceil(incomeTotalRows / incomeRowsPerPage);
  incomeLastPageBtn.disabled =
    incomeCurrentPage === Math.ceil(incomeTotalRows / incomeRowsPerPage);

  const start = (incomeCurrentPage - 1) * incomeRowsPerPage + 1;
  const end = Math.min(start + incomeRowsPerPage - 1, incomeTotalRows);
  incomePaginationTotal.textContent = `${start}-${end} of ${incomeTotalRows}`;
  incomeDataTable.hideProgress();
}

// Initial sort direction
let expenseIsAsc = false;
let incomeIsAsc = false;

// Function to sort the expense data
function sortExpenseData(columnIndex, expenseIsAsc) {
  expenseRecords.sort((a, b) => {
    const valueA = a[columnIndex];
    const valueB = b[columnIndex];
    if (columnIndex === 0) {
      // Date column
      return expenseIsAsc
        ? new Date(valueA) - new Date(valueB)
        : new Date(valueB) - new Date(valueA);
    } else if (columnIndex === 3) {
      // Amount column
      return expenseIsAsc
        ? parseFloat(valueA) - parseFloat(valueB)
        : parseFloat(valueB) - parseFloat(valueA);
    }
  });
}

// Function to sort the income data
function sortIncomeData(columnIndex, incomeIsAsc) {
  incomeRecords.sort((a, b) => {
    const valueA = a[columnIndex];
    const valueB = b[columnIndex];
    if (columnIndex === 0) {
      // Date column
      return incomeIsAsc
        ? new Date(valueA) - new Date(valueB)
        : new Date(valueB) - new Date(valueA);
    } else if (columnIndex === 3) {
      // Amount column
      return incomeIsAsc
        ? parseFloat(valueA) - parseFloat(valueB)
        : parseFloat(valueB) - parseFloat(valueA);
    }
  });
}

// Event listeners for sortable headers
document
  .querySelectorAll("#expense-tab .mdc-data-table__header-cell--with-sort")
  .forEach((headerCell) => {
    headerCell.addEventListener("click", () => {
      const columnIndex = headerCell.dataset.columnId === "date" ? 0 : 3;

      // Toggle sort direction
      expenseIsAsc = !expenseIsAsc;

      // Sort the data and re-render the table
      sortExpenseData(columnIndex, expenseIsAsc);
      expenseCurrentPage = 1;
      renderCurrentExpensePage();
    });
  });

document
  .querySelectorAll("#income-tab .mdc-data-table__header-cell--with-sort")
  .forEach((headerCell) => {
    headerCell.addEventListener("click", () => {
      const columnIndex = headerCell.dataset.columnId === "date" ? 0 : 3;

      // Toggle sort direction
      incomeIsAsc = !incomeIsAsc;

      // Sort the data and re-render the table
      sortIncomeData(columnIndex, incomeIsAsc);
      incomeCurrentPage = 1;
      renderCurrentIncomePage();
    });
  });

// Event listener for the FAB to open the dialog
DOM.fab.addEventListener("click", () => {
  DOM.dialog.open();
});

// Event listener for tab change
DOM.mainTabBar.listen("MDCTabBar:activated", (event) => {
  activeTab = event.detail.index;
  document.querySelectorAll(".main-content .tab-pane").forEach((tab, index) => {
    tab.classList.toggle("active", index === event.detail.index);
  });
});

DOM.dialogtabBar.listen("MDCTabBar:activated", (event) => {
  dialogActiveTab = event.detail.index;
  document
    .querySelectorAll(".mdc-dialog__content .tab-pane")
    .forEach((tab, index) => {
      tab.classList.toggle("active", index === event.detail.index);
    });
});

/**
 * Form handling functions
 */

// Edit record function
function editRecord(type, rowData, rowIndex) {
  populateForm(type, rowData, rowIndex);
  DOM.dialog.open();
}

// Delete record function
async function deleteRecord(type, rowIndex) {
  if (confirm(`Are you sure you want to delete this ${type} record?`)) {
    try {
      await deleteRecordFromSheet(type, rowIndex);

      // Data will be refreshed automatically by deleteRecordFromSheet
      window.expenseManager.utils.showSnackbar(
        `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } record deleted successfully`,
      );
    } catch (error) {
      window.expenseManager.utils.showSnackbar(
        "Error deleting record. Please try again.",
      );
    }
  }
}

// Clear form fields
function clearForm(type) {
  if (type === "expense") {
    document.getElementById("expense-date").value = "";
    document.getElementById("expense-category").value = "";
    document.getElementById("expense-description").value = "";
    document.getElementById("expense-amount").value = "";
  } else {
    document.getElementById("income-date").value = "";
    document.getElementById("income-category").value = "";
    document.getElementById("income-description").value = "";
    document.getElementById("income-amount").value = "";
  }
}

/**
 * Converts date from DD/MM/YYYY format to YYYY-MM-DD format for HTML date input
 * @param {string} dateString - Date in DD/MM/YYYY format
 * @returns {string} Date in YYYY-MM-DD format
 */
function convertDateForInput(dateString) {
  if (!dateString) return "";

  // Handle DD/MM/YYYY format
  const parts = dateString.split("/");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  return dateString; // Return as-is if format is unexpected
}

/**
 * Converts amount from display format (with currency symbols) to plain number
 * @param {string} amountString - Amount with currency symbols and formatting
 * @returns {string} Plain number string
 */
function convertAmountForInput(amountString) {
  if (!amountString) return "";

  // Remove currency symbols, spaces, and commas, then trim
  return amountString
    .toString()
    .replace(/[₹$€£¥,\s]/g, "")
    .trim();
}

// Populate form for editing
function populateForm(type, rowData, rowIndex) {
  isEditMode = true;
  editingRowIndex = rowIndex;

  if (type === "expense") {
    document.getElementById("expense-date").value = convertDateForInput(
      rowData[0],
    );
    document.getElementById("expense-category").value = rowData[1];
    document.getElementById("expense-description").value = rowData[2];
    document.getElementById("expense-amount").value = convertAmountForInput(
      rowData[3],
    );
    dialogActiveTab = 0;
  } else {
    document.getElementById("income-date").value = convertDateForInput(
      rowData[0],
    );
    document.getElementById("income-category").value = rowData[1];
    document.getElementById("income-description").value = rowData[2];
    document.getElementById("income-amount").value = convertAmountForInput(
      rowData[3],
    );
    dialogActiveTab = 1;
  }

  // Set dialog title
  document.getElementById("add-record-dialog-title").textContent = `Edit ${
    type.charAt(0).toUpperCase() + type.slice(1)
  } Record`;

  // Switch to correct tab in dialog
  DOM.dialogtabBar.activateTab(dialogActiveTab);
}

// Validate form data
function validateForm(type) {
  const date = document.getElementById(`${type}-date`).value;
  const category = document.getElementById(`${type}-category`).value;
  const description = document.getElementById(`${type}-description`).value;
  const amount = document.getElementById(`${type}-amount`).value;

  if (!date || !category || !description || !amount) {
    window.expenseManager.utils.showSnackbar("Please fill in all fields");
    return false;
  }

  if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    window.expenseManager.utils.showSnackbar("Please enter a valid amount");
    return false;
  }

  return true;
}

// Get form data
function getFormData(type) {
  const date = document.getElementById(`${type}-date`).value;
  const category = document.getElementById(`${type}-category`).value;
  const description = document.getElementById(`${type}-description`).value;
  const amount = document.getElementById(`${type}-amount`).value;

  return [date, category, description, amount];
}

// Handle form submission
async function handleFormSubmission() {
  const type = dialogActiveTab === 0 ? "expense" : "income";

  if (!validateForm(type)) {
    return;
  }

  const formData = getFormData(type);

  try {
    if (isEditMode) {
      // Update existing record
      await updateRecordInSheet(type, editingRowIndex, formData);
      // Data will be refreshed automatically by updateRecordInSheet
    } else {
      // Add new record
      await addRecordToSheet(type, formData);

      // Update local data for new records
      if (type === "expense") {
        expenseRecords.push(formData);
        expenseTotalRows++;
      } else {
        incomeRecords.push(formData);
        incomeTotalRows++;
      }

      // Re-render tables for new records
      renderCurrentExpensePage();
      renderCurrentIncomePage();
      updateCards();
    }

    // Close dialog and reset edit mode
    DOM.dialog.close();
    // Show success message
    window.expenseManager.utils.showSnackbar(
      `${type.charAt(0).toUpperCase() + type.slice(1)} ${
        isEditMode ? "updated" : "added"
      } successfully`,
    );
    isEditMode = false;
    editingRowIndex = -1;
  } catch (error) {
    window.expenseManager.utils.showSnackbar(
      "Error saving record. Please try again.",
    );
  }
}

// Event listener for dialog accept button
document
  .querySelector('[data-mdc-dialog-action="accept"]')
  .addEventListener("click", handleFormSubmission);

// Event listener for dialog open
DOM.fab.addEventListener("click", () => {
  isEditMode = false;
  editingRowIndex = -1;
  clearForm("expense");
  clearForm("income");
  document.getElementById("add-record-dialog-title").textContent = "Add Record";
  DOM.dialog.open();
});

// Event listener for dialog close
DOM.dialog.listen("MDCDialog:closed", () => {
  isEditMode = false;
  editingRowIndex = -1;
  clearForm("expense");
  clearForm("income");
});
