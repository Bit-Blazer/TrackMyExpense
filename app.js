// Initialize Material Components
mdc.autoInit();

/**
 * Initializes the application
 */
async function initializeApp() {
    try {
        const sheetId = await fetchOrCopySheet();
        await fetchSheetData(sheetId);
        sortData(0, false); // Sort by recent date first
        renderCurrentPage();
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
            }).catch(reject);
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
            fileId: "13Osz5eiNwMn8HeX1AsxoPYpLUH9JztOHeU2z6uXjFe8",
            resource: {
                name: "Expenses Sheet",
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
        expenseRecords = response.result.valueRanges[1].values;
        totalRows = expenseRecords.length;
        window.expenseManager.utils.logSuccess("Sheet data fetched successfully");
    } catch (error) {
        window.expenseManager.utils.logError("Error fetching sheet data", error);
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
let currentPage = 1;
let rowsPerPage = 10;
let totalRows = 0;
let expenseRecords = [];

// Attach MDC DataTable component to the table
const dataTable = mdc.dataTable.MDCDataTable.attachTo(document.querySelector(".mdc-data-table"));
const tableBody = document.getElementById("expenses-table-content");

// Pagination button elements
const firstPageBtn = document.getElementById("first-pageBtn");
const prevPageBtn = document.getElementById("prev-pageBtn");
const nextPageBtn = document.getElementById("next-pageBtn");
const lastPageBtn = document.getElementById("last-pageBtn");
const paginationTotal = document.getElementById("pagination-total");

// Attach MDC Select component to the rows per page select element
const rowsPerPageSelect = mdc.select.MDCSelect.attachTo(document.querySelector(".mdc-select"));

// Event listeners for pagination buttons
firstPageBtn.addEventListener("click", () => {
    dataTable.showProgress();
    currentPage = 1;
    renderCurrentPage();
});

prevPageBtn.addEventListener("click", () => {
    dataTable.showProgress();
    currentPage--;
    renderCurrentPage();
});

nextPageBtn.addEventListener("click", () => {
    dataTable.showProgress();
    currentPage++;
    renderCurrentPage();
});

lastPageBtn.addEventListener("click", () => {
    dataTable.showProgress();
    currentPage = Math.ceil(totalRows / rowsPerPage);
    renderCurrentPage();
});

// Event listener for rows per page select
rowsPerPageSelect.listen("MDCSelect:change", () => {
    dataTable.showProgress();
    rowsPerPage = parseInt(rowsPerPageSelect.value);
    currentPage = 1;
    renderCurrentPage();
});

// Render the current page
function renderCurrentPage() {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    renderTableRows(expenseRecords.slice(startIndex, endIndex));
    updatePagination();
}

// Render table rows with the given data
function renderTableRows(data) {
    tableBody.innerHTML = "";
    data.forEach((row) => {
        const tr = document.createElement("tr");
        tr.classList.add("mdc-data-table__row");
        row.forEach((cell) => {
            const td = document.createElement("td");
            td.classList.add("mdc-data-table__cell");
            td.textContent = cell;
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// Update pagination buttons and display current page information
function updatePagination() {
    firstPageBtn.disabled = currentPage === 1;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === Math.ceil(totalRows / rowsPerPage);
    lastPageBtn.disabled = currentPage === Math.ceil(totalRows / rowsPerPage);

    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(start + rowsPerPage - 1, totalRows);
    paginationTotal.textContent = `${start}-${end} of ${totalRows}`;
    dataTable.hideProgress();
}

// Initial sort direction
let isAsc = false;

// Function to sort the data
function sortData(columnIndex, isAsc) {
    expenseRecords.sort((a, b) => {
        const valueA = a[columnIndex];
        const valueB = b[columnIndex];
        if (columnIndex === 0) { // Date column
            return isAsc ? new Date(valueA) - new Date(valueB) : new Date(valueB) - new Date(valueA);
        } else if (columnIndex === 3) { // Amount column
            return isAsc ? parseFloat(valueA) - parseFloat(valueB) : parseFloat(valueB) - parseFloat(valueA);
        }
    });
}

// Event listeners for sortable headers
document.querySelectorAll('.mdc-data-table__header-cell--with-sort').forEach(headerCell => {
    headerCell.addEventListener('click', () => {
        const columnIndex = headerCell.dataset.columnId === 'date' ? 0 : 3;

        // Toggle sort direction
        isAsc = !isAsc;

        // Sort the data and re-render the table
        sortData(columnIndex, isAsc);
        currentPage = 1;
        renderCurrentPage();
    });
});

// Event listener for the FAB to open the dialog
DOM.fab.addEventListener("click", () => {
    DOM.dialog.open();
});

// Event listener for tab change
DOM.tabBar.listen('MDCTabBar:activated', (event) => {
    document.querySelectorAll('.tab-pane').forEach((tab, index) => {
        tab.classList.toggle('active', index === event.detail.index);
    });
});
