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
        window.expenseManager.utils.logSuccess("Existing sheet found");
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

DOM.drawerList.addEventListener("click", () => {
    DOM.drawer.open = false;
});

// Pagination variables
let currentPage = 1;
let rowsPerPage = 10;
let totalRows = 0;
// Placeholder data (FOR TESTING), will be replaced by dynamically fetched data from Google Sheets
let expenseRecords = [
    ["2024-01-01", "Groceries", "Weekly grocery shopping", "100"],
    ["2024-01-03", "Transportation", "Bus ticket", "2.50"],
    ["2024-01-05", "Entertainment", "Movie night", "15"],
    ["2024-01-08", "Utilities", "Electricity bill", "50"],
    ["2024-01-10", "Rent", "Monthly rent payment", "1200"],
    ["2024-01-12", "Groceries", "Vegetables and fruits", "30"],
    ["2024-01-15", "Dining", "Dinner at restaurant", "45"],
    ["2024-01-17", "Healthcare", "Doctor's appointment", "75"],
    ["2024-01-20", "Groceries", "Weekly grocery shopping", "110"],
    ["2024-01-22", "Transportation", "Taxi fare", "20"],
    ["2024-01-25", "Utilities", "Water bill", "40"],
    ["2024-01-27", "Entertainment", "Concert ticket", "60"],
    ["2024-01-30", "Rent", "Monthly rent payment", "1200"],
    ["2024-02-01", "Groceries", "Weekly grocery shopping", "105"],
    ["2024-02-03", "Transportation", "Bus ticket", "2.50"],
    ["2024-02-05", "Entertainment", "Movie night", "12"],
    ["2024-02-08", "Utilities", "Electricity bill", "55"],
    ["2024-02-10", "Rent", "Monthly rent payment", "1200"],
    ["2024-02-12", "Groceries", "Vegetables and fruits", "28"],
    ["2024-02-15", "Dining", "Lunch at cafe", "35"],
    ["2024-02-17", "Healthcare", "Medicine", "25"],
    ["2024-02-20", "Groceries", "Weekly grocery shopping", "112"],
    ["2024-02-22", "Transportation", "Train ticket", "15"],
    ["2024-02-25", "Utilities", "Gas bill", "45"],
    ["2024-02-27", "Entertainment", "Streaming subscription", "10"],
    ["2024-02-28", "Rent", "Monthly rent payment", "1200"],
    ["2024-03-01", "Groceries", "Weekly grocery shopping", "102"],
    ["2024-03-03", "Transportation", "Bus ticket", "2.50"],
    ["2024-03-05", "Entertainment", "Movie night", "13"],
    ["2024-03-08", "Utilities", "Electricity bill", "50"],
    ["2024-03-10", "Rent", "Monthly rent payment", "1200"],
    ["2024-03-12", "Groceries", "Vegetables and fruits", "31"],
    ["2024-03-15", "Dining", "Dinner at restaurant", "50"],
    ["2024-03-17", "Healthcare", "Dentist appointment", "80"],
    ["2024-03-20", "Groceries", "Weekly grocery shopping", "108"],
    ["2024-03-22", "Transportation", "Taxi fare", "22"],
    ["2024-03-25", "Utilities", "Water bill", "42"],
    ["2024-03-27", "Entertainment", "Concert ticket", "65"],
    ["2024-03-30", "Rent", "Monthly rent payment", "1200"],
    ["2024-04-01", "Groceries", "Weekly grocery shopping", "103"],
    ["2024-04-03", "Transportation", "Bus ticket", "2.50"],
    ["2024-04-05", "Entertainment", "Movie night", "14"],
    ["2024-04-08", "Utilities", "Electricity bill", "52"],
    ["2024-04-10", "Rent", "Monthly rent payment", "1200"],
    ["2024-04-12", "Groceries", "Vegetables and fruits", "29"],
    ["2024-04-15", "Dining", "Lunch at cafe", "36"],
    ["2024-04-17", "Healthcare", "Medicine", "30"],
    ["2024-04-20", "Groceries", "Weekly grocery shopping", "106"],
    ["2024-04-22", "Transportation", "Train ticket", "12"],
    ["2024-04-25", "Utilities", "Gas bill", "48"],
    ["2024-04-27", "Entertainment", "Streaming subscription", "12"],
    ["2024-04-30", "Rent", "Monthly rent payment", "1200"],
    ["2024-05-01", "Groceries", "Weekly grocery shopping", "104"],
    ["2024-05-03", "Transportation", "Bus ticket", "2.50"],
    ["2024-05-05", "Entertainment", "Movie night", "16"],
    ["2024-05-08", "Utilities", "Electricity bill", "53"],
    ["2024-05-10", "Rent", "Monthly rent payment", "1200"],
    ["2024-05-12", "Groceries", "Vegetables and fruits", "32"],
    ["2024-05-15", "Dining", "Dinner at restaurant", "55"],
    ["2024-05-17", "Healthcare", "Doctor's appointment", "70"],
    ["2024-05-20", "Groceries", "Weekly grocery shopping", "107"],
    ["2024-05-22", "Transportation", "Taxi fare", "18"],
    ["2024-05-25", "Utilities", "Water bill", "44"],
    ["2024-05-27", "Entertainment", "Concert ticket", "67"],
    ["2024-05-30", "Rent", "Monthly rent payment", "1200"],
    ["2024-06-01", "Groceries", "Weekly grocery shopping", "101"],
    ["2024-06-03", "Transportation", "Bus ticket", "2.50"],
    ["2024-06-05", "Entertainment", "Movie night", "17"],
    ["2024-06-08", "Utilities", "Electricity bill", "51"],
    ["2024-06-10", "Rent", "Monthly rent payment", "1200"],
    ["2024-06-12", "Groceries", "Vegetables and fruits", "34"],
    ["2024-06-15", "Dining", "Lunch at cafe", "37"],
    ["2024-06-17", "Healthcare", "Medicine", "40"],
    ["2024-06-20", "Groceries", "Weekly grocery shopping", "109"],
    ["2024-06-22", "Transportation", "Train ticket", "14"],
    ["2024-06-25", "Utilities", "Gas bill", "49"],
    ["2024-06-27", "Entertainment", "Streaming subscription", "11"],
    ["2024-06-30", "Rent", "Monthly rent payment", "1200"],
    ["2024-07-01", "Groceries", "Weekly grocery shopping", "102"],
    ["2024-07-03", "Transportation", "Bus ticket", "2.50"],
    ["2024-07-05", "Entertainment", "Movie night", "19"],
    ["2024-07-08", "Utilities", "Electricity bill", "54"],
    ["2024-07-10", "Rent", "Monthly rent payment", "1200"],
    ["2024-07-12", "Groceries", "Vegetables and fruits", "33"],
    ["2024-07-15", "Dining", "Dinner at restaurant", "40"],
    ["2024-07-17", "Healthcare", "Dentist appointment", "90"],
    ["2024-07-20", "Groceries", "Weekly grocery shopping", "110"],
    ["2024-07-22", "Transportation", "Taxi fare", "24"],
    ["2024-07-25", "Utilities", "Water bill", "45"],
    ["2024-07-27", "Entertainment", "Concert ticket", "69"],
    ["2024-07-30", "Rent", "Monthly rent payment", "1200"]
];
totalRows = expenseRecords.length;

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

// Initial render of the first page (FOR TESTING)
sortData(0, false); // Sort by recent date first
renderCurrentPage();

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


// garbage
/**
 * Initializes the forms
 * @param {string} sheetId - The sheet ID
 * @param {string[]} accounts - List of account names
 * @param {string[]} categories - List of expense categories
 */
function initializeForms(sheetId, accounts, categories) {
    window.expenseManager.expenseForm.init(sheetId, accounts, categories);
    window.expenseManager.transferForm.init(sheetId, accounts);
    window.expenseManager.utils.logSuccess("Forms initialized");
}


DOM.fab.addEventListener("click", function () {
    DOM.dialog.showModal();
});


DOM.closeBtn.addEventListener("click", function () {
    DOM.dialog.close();
});

DOM.dialog.addEventListener("close", function () {
    const form = this.querySelector("form");
    if (form.checkValidity()) {
        const name = form.expenseName.value;
        const amount = form.expenseAmount.value;
        window.expenseManager.utils.logSuccess("Expense Added:", name, amount);
    }
});