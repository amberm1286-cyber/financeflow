/* =========================================================
   FinanceFlow — Transactions Module
   File: js/modules/transactions.js
   ========================================================= */

import {
  $,
  $$,
  createEl,
  clearEl,
  safeText,
  formatMoney,
  formatDate,
  uid,
  debounce,
} from "../utils.js";

import {
  getState,
  setState,
  subscribe,
} from "../dataManager.js";

import {
  showToast,
  notifyTransactionAdded,
  notifyTransactionDeleted,
} from "../notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let initialized = false;

let selectedTransactions =
  new Set();

let activeFilters = {
  search: "",
  category: "all",
  type: "all",
  min: "",
  max: "",
  startDate: "",
  endDate: "",
};

/* =========================================================
   SMART CATEGORY MAP
   ========================================================= */

const SMART_CATEGORY_RULES = {
  netflix: {
    category:
      "Subscriptions",
    emoji: "📺",
    recurring: true,
  },

  spotify: {
    category:
      "Subscriptions",
    emoji: "🎵",
    recurring: true,
  },

  uber: {
    category:
      "Transport",
    emoji: "🚕",
    recurring: false,
  },

  zomato: {
    category: "Food",
    emoji: "🍔",
    recurring: false,
  },

  swiggy: {
    category: "Food",
    emoji: "🍕",
    recurring: false,
  },

  amazon: {
    category:
      "Shopping",
    emoji: "🛍️",
    recurring: false,
  },

  salary: {
    category:
      "Salary",
    emoji: "💼",
    recurring: true,
  },

  youtube: {
    category:
      "Subscriptions",
    emoji: "📺",
    recurring: true,
  },

  electricity: {
    category: "Bills",
    emoji: "⚡",
    recurring: true,
  },

  rent: {
    category: "Bills",
    emoji: "🏠",
    recurring: true,
  },
};

/* =========================================================
   INIT
   ========================================================= */

export function initTransactionsModule() {
  if (initialized) return;

  bindTransactionEvents();

  renderTransactionsPage(
    getState()
  );

  subscribe((state) => {
    renderTransactionsPage(
      state
    );
  });

  initialized = true;

  console.log(
    "💸 Transactions Module Initialized"
  );
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderTransactionsPage(
  state
) {
  renderTransactionTable(
    state
  );

  renderTransactionStats(
    state
  );

  renderCategoryFilters(
    state
  );

  updateBulkDeleteState();
}

/* =========================================================
   TABLE
   ========================================================= */

function renderTransactionTable(
  state
) {
  const tbody =
    $("#transactionsTableBody");

  if (!tbody) return;

  const filtered =
    getFilteredTransactions(
      state.transactions
    );

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state compact">
            <p>
              No transactions match your filters.
            </p>
          </div>
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    filtered.map(
      (transaction) => {
        return `
          <tr
            class="transaction-row"
            data-transaction-id="${transaction.id}"
          >
            <td>
              <label class="table-checkbox">
                <input
                  type="checkbox"
                  class="transaction-checkbox"
                  data-id="${transaction.id}"
                  ${
                    selectedTransactions.has(
                      transaction.id
                    )
                      ? "checked"
                      : ""
                  }
                />

                <span></span>
              </label>
            </td>

            <td>
              <div class="transaction-main">
                <div class="transaction-icon">
                  ${
                    transaction.emoji ||
                    "💸"
                  }
                </div>

                <div>
                  <strong>
                    ${safeText(
                      transaction.name
                    )}
                  </strong>

                  <small>
                    ${safeText(
                      transaction.note ||
                        "No note"
                    )}
                  </small>
                </div>
              </div>
            </td>

            <td>
              <span
                class="transaction-category-tag"
              >
                ${
                  transaction.category
                }
              </span>
            </td>

            <td>
              <span
                class="transaction-type-badge ${
                  transaction.type
                }"
              >
                ${
                  transaction.type
                }
              </span>
            </td>

            <td>
              <strong class="${
                transaction.type
              }">
                ${
                  transaction.type ===
                  "income"
                    ? "+"
                    : "-"
                }

                ${formatMoney(
                  transaction.amount,
                  state.settings
                    .baseCurrency
                )}
              </strong>
            </td>

            <td>
              ${formatDate(
                transaction.date,
                {
                  short: true,
                }
              )}
            </td>

            <td>
              <span
                class="payment-method-badge"
              >
                ${
                  transaction.method
                }
              </span>
            </td>

            <td>
              <div class="transaction-actions">
                <button
                  class="icon-btn edit-transaction-btn"
                  data-id="${transaction.id}"
                >
                  ✏️
                </button>

                <button
                  class="icon-btn delete-transaction-btn"
                  data-id="${transaction.id}"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      }
    ).join("");

  bindTableEvents();
}

/* =========================================================
   STATS
   ========================================================= */

function renderTransactionStats(
  state
) {
  const transactions =
    getFilteredTransactions(
      state.transactions
    );

  const income =
    transactions
      .filter(
        (transaction) =>
          transaction.type ===
          "income"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.amount ||
              0
          ),
        0
      );

  const expenses =
    transactions
      .filter(
        (transaction) =>
          transaction.type ===
          "expense"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.amount ||
              0
          ),
        0
      );

  updateStat(
    "#transactionsIncome",
    income,
    state.settings
      .baseCurrency
  );

  updateStat(
    "#transactionsExpense",
    expenses,
    state.settings
      .baseCurrency
  );

  updateStat(
    "#transactionsCount",
    transactions.length,
    null,
    true
  );
}

function updateStat(
  selector,
  value,
  currency,
  plain = false
) {
  const element =
    $(selector);

  if (!element) return;

  if (plain) {
    element.textContent =
      value.toLocaleString(
        "en-IN"
      );

    return;
  }

  element.textContent =
    formatMoney(
      value,
      currency
    );
}

/* =========================================================
   FILTERS
   ========================================================= */

function bindTransactionEvents() {
  bindSearch();

  bindFilters();

  bindAddTransaction();

  bindBulkDelete();

  bindCSVImport();

  bindOCRScanner();

  bindSelectAll();
}

function bindSearch() {
  const input =
    $("#transactionSearch");

  input?.addEventListener(
    "input",
    debounce((event) => {
      activeFilters.search =
        event.target.value
          .trim()
          .toLowerCase();

      renderTransactionsPage(
        getState()
      );
    }, 160)
  );
}

function bindFilters() {
  const category =
    $("#transactionCategoryFilter");

  const type =
    $("#transactionTypeFilter");

  const min =
    $("#transactionMinAmount");

  const max =
    $("#transactionMaxAmount");

  const start =
    $("#transactionStartDate");

  const end =
    $("#transactionEndDate");

  category?.addEventListener(
    "change",
    (event) => {
      activeFilters.category =
        event.target.value;

      renderTransactionsPage(
        getState()
      );
    }
  );

  type?.addEventListener(
    "change",
    (event) => {
      activeFilters.type =
        event.target.value;

      renderTransactionsPage(
        getState()
      );
    }
  );

  min?.addEventListener(
    "input",
    debounce((event) => {
      activeFilters.min =
        event.target.value;

      renderTransactionsPage(
        getState()
      );
    }, 150)
  );

  max?.addEventListener(
    "input",
    debounce((event) => {
      activeFilters.max =
        event.target.value;

      renderTransactionsPage(
        getState()
      );
    }, 150)
  );

  start?.addEventListener(
    "change",
    (event) => {
      activeFilters.startDate =
        event.target.value;

      renderTransactionsPage(
        getState()
      );
    }
  );

  end?.addEventListener(
    "change",
    (event) => {
      activeFilters.endDate =
        event.target.value;

      renderTransactionsPage(
        getState()
      );
    }
  );
}

function getFilteredTransactions(
  transactions = []
) {
  return transactions.filter(
    (transaction) => {
      const searchMatch =
        !activeFilters.search ||
        transaction.name
          .toLowerCase()
          .includes(
            activeFilters.search
          ) ||
        transaction.category
          .toLowerCase()
          .includes(
            activeFilters.search
          ) ||
        (
          transaction.note || ""
        )
          .toLowerCase()
          .includes(
            activeFilters.search
          );

      const categoryMatch =
        activeFilters.category ===
          "all" ||
        transaction.category ===
          activeFilters.category;

      const typeMatch =
        activeFilters.type ===
          "all" ||
        transaction.type ===
          activeFilters.type;

      const minMatch =
        !activeFilters.min ||
        transaction.amount >=
          Number(
            activeFilters.min
          );

      const maxMatch =
        !activeFilters.max ||
        transaction.amount <=
          Number(
            activeFilters.max
          );

      const startMatch =
        !activeFilters.startDate ||
        transaction.date >=
          activeFilters.startDate;

      const endMatch =
        !activeFilters.endDate ||
        transaction.date <=
          activeFilters.endDate;

      return (
        searchMatch &&
        categoryMatch &&
        typeMatch &&
        minMatch &&
        maxMatch &&
        startMatch &&
        endMatch
      );
    }
  );
}

/* =========================================================
   CATEGORY FILTERS
   ========================================================= */

function renderCategoryFilters(
  state
) {
  const select =
    $("#transactionCategoryFilter");

  if (!select) return;

  const categories = [
    ...new Set(
      state.transactions.map(
        (transaction) =>
          transaction.category
      )
    ),
  ];

  select.innerHTML = `
    <option value="all">
      All Categories
    </option>

    ${categories
      .map(
        (category) => `
          <option value="${category}">
            ${category}
          </option>
        `
      )
      .join("")}
  `;

  select.value =
    activeFilters.category;
}

/* =========================================================
   TABLE EVENTS
   ========================================================= */

function bindTableEvents() {
  $$(".edit-transaction-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openEditTransactionModal(
            button.dataset.id
          );
        }
      );
    });

  $$(".delete-transaction-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteTransaction(
            button.dataset.id
          );
        }
      );
    });

  $$(".transaction-checkbox")
    .forEach((checkbox) => {
      checkbox.addEventListener(
        "change",
        () => {
          toggleTransactionSelection(
            checkbox.dataset.id,
            checkbox.checked
          );
        }
      );
    });
}

/* =========================================================
   ADD TRANSACTION
   ========================================================= */

function bindAddTransaction() {
  const buttons = [
    $("#openTransactionModalBtn"),
    $("#addTransactionBtn"),
    $("#quickAddFab"),
  ].filter(Boolean);

  buttons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openTransactionModal();
    });
  });
}

function openTransactionModal() {
  let modal =
    $("#transactionModal");

  if (modal) {
    modal.classList.add(
      "show"
    );

    return;
  }

  modal =
    document.createElement(
      "div"
    );

  modal.id =
    "transactionModal";

  modal.className =
    "modal-overlay show";

  modal.innerHTML = `
    <div class="modal-card transaction-modal-card">
      <button
        class="modal-close-btn"
        id="closeTransactionModal"
      >
        ✕
      </button>

      <div class="modal-header">
        <p class="eyebrow">
          FinanceFlow
        </p>

        <h2>
          Add Transaction
        </h2>
      </div>

      <form
        id="transactionForm"
        class="transaction-form"
      >
        <div class="form-grid">
          <div class="input-group">
            <label>
              Transaction Name
            </label>

            <input
              type="text"
              id="transactionName"
              placeholder="Netflix"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Amount
            </label>

            <input
              type="number"
              id="transactionAmount"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Category
            </label>

            <input
              type="text"
              id="transactionCategory"
              placeholder="Food"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Type
            </label>

            <select
              id="transactionType"
            >
              <option value="expense">
                Expense
              </option>

              <option value="income">
                Income
              </option>
            </select>
          </div>

          <div class="input-group">
            <label>
              Date
            </label>

            <input
              type="date"
              id="transactionDate"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Payment Method
            </label>

            <select
              id="transactionMethod"
            >
              <option value="UPI">
                UPI
              </option>

              <option value="Card">
                Card
              </option>

              <option value="Cash">
                Cash
              </option>

              <option value="Bank Transfer">
                Bank Transfer
              </option>
            </select>
          </div>
        </div>

        <div class="input-group">
          <label>
            Tags
          </label>

          <input
            type="text"
            id="transactionTags"
            placeholder="#vacation #work"
          />
        </div>

        <div class="input-group">
          <label>
            Notes
          </label>

          <textarea
            id="transactionNote"
            placeholder="Optional note..."
          ></textarea>
        </div>

        <div class="smart-category-result"
          id="smartCategoryResult">
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-full"
        >
          Add Transaction
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(
    modal
  );

  $("#transactionDate").value =
    new Date()
      .toISOString()
      .slice(0, 10);

  bindTransactionForm();
}

function bindTransactionForm() {
  const form =
    $("#transactionForm");

  const nameInput =
    $("#transactionName");

  nameInput?.addEventListener(
    "input",
    debounce((event) => {
      applySmartCategory(
        event.target.value
      );
    }, 200)
  );

  form?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      addTransaction();

      closeTransactionModal();
    }
  );

  $("#closeTransactionModal")
    ?.addEventListener(
      "click",
      closeTransactionModal
    );
}

function applySmartCategory(
  value = ""
) {
  const lower =
    value.toLowerCase();

  const matched =
    Object.keys(
      SMART_CATEGORY_RULES
    ).find((key) =>
      lower.includes(key)
    );

  const result =
    $("#smartCategoryResult");

  if (!matched || !result) {
    if (result) {
      result.innerHTML = "";
    }

    return;
  }

  const rule =
    SMART_CATEGORY_RULES[
      matched
    ];

  $("#transactionCategory").value =
    rule.category;

  result.innerHTML = `
    <div class="smart-category-card">
      <span>
        ${rule.emoji}
      </span>

      <div>
        <strong>
          Smart Category Detected
        </strong>

        <p>
          Suggested:
          ${rule.category}
          ${
            rule.recurring
              ? "• Recurring"
              : ""
          }
        </p>
      </div>
    </div>
  `;
}

function addTransaction() {
  const state =
    getState();

  const tags =
    (
      $("#transactionTags")
        ?.value || ""
    )
      .split(" ")
      .filter(Boolean);

  const transaction = {
    id: uid("txn"),

    name:
      $("#transactionName")
        ?.value || "Transaction",

    amount: Number(
      $("#transactionAmount")
        ?.value || 0
    ),

    category:
      $("#transactionCategory")
        ?.value || "General",

    type:
      $("#transactionType")
        ?.value || "expense",

    date:
      $("#transactionDate")
        ?.value ||
      new Date()
        .toISOString()
        .slice(0, 10),

    method:
      $("#transactionMethod")
        ?.value || "UPI",

    note:
      $("#transactionNote")
        ?.value || "",

    emoji:
      getCategoryEmoji(
        $("#transactionCategory")
          ?.value
      ),

    tags,

    recurring: false,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  };

  const nextState = {
    ...state,

    transactions: [
      transaction,
      ...state.transactions,
    ],
  };

  setState(nextState, {
    event:
      "transaction:added",
  });

  notifyTransactionAdded(
    transaction.name
  );
}

function closeTransactionModal() {
  $("#transactionModal")
    ?.remove();
}

/* =========================================================
   EDIT
   ========================================================= */

function openEditTransactionModal(
  transactionId
) {
  const state =
    getState();

  const transaction =
    state.transactions.find(
      (item) =>
        item.id ===
        transactionId
    );

  if (!transaction) return;

  openTransactionModal();

  $("#transactionName").value =
    transaction.name;

  $("#transactionAmount").value =
    transaction.amount;

  $("#transactionCategory").value =
    transaction.category;

  $("#transactionType").value =
    transaction.type;

  $("#transactionDate").value =
    transaction.date;

  $("#transactionMethod").value =
    transaction.method;

  $("#transactionNote").value =
    transaction.note || "";

  $("#transactionTags").value =
    (
      transaction.tags || []
    ).join(" ");

  const form =
    $("#transactionForm");

  form.dataset.editing =
    transaction.id;

  form.removeEventListener(
    "submit",
    handleEditSubmit
  );

  form.addEventListener(
    "submit",
    handleEditSubmit
  );
}

function handleEditSubmit(
  event
) {
  event.preventDefault();

  const form =
    $("#transactionForm");

  const id =
    form.dataset.editing;

  updateTransaction(id);

  closeTransactionModal();
}

function updateTransaction(
  id
) {
  const state =
    getState();

  const updated =
    state.transactions.map(
      (transaction) => {
        if (
          transaction.id !== id
        ) {
          return transaction;
        }

        return {
          ...transaction,

          name:
            $("#transactionName")
              ?.value ||
            transaction.name,

          amount: Number(
            $("#transactionAmount")
              ?.value || 0
          ),

          category:
            $("#transactionCategory")
              ?.value ||
            transaction.category,

          type:
            $("#transactionType")
              ?.value ||
            transaction.type,

          date:
            $("#transactionDate")
              ?.value ||
            transaction.date,

          method:
            $("#transactionMethod")
              ?.value ||
            transaction.method,

          note:
            $("#transactionNote")
              ?.value || "",

          tags:
            (
              $("#transactionTags")
                ?.value || ""
            )
              .split(" ")
              .filter(
                Boolean
              ),

          updatedAt:
            new Date().toISOString(),
        };
      }
    );

  setState(
    {
      ...state,
      transactions:
        updated,
    },
    {
      event:
        "transaction:updated",
    }
  );

  showToast({
    type: "success",
    title:
      "Transaction Updated",
    message:
      "Changes saved successfully.",
    icon: "✏️",
  });
}

/* =========================================================
   DELETE
   ========================================================= */

function deleteTransaction(
  transactionId
) {
  const state =
    getState();

  const transaction =
    state.transactions.find(
      (item) =>
        item.id ===
        transactionId
    );

  if (!transaction) return;

  const nextState = {
    ...state,

    transactions:
      state.transactions.filter(
        (item) =>
          item.id !==
          transactionId
      ),
  };

  setState(nextState, {
    event:
      "transaction:deleted",
  });

  notifyTransactionDeleted(
    transaction.name
  );
}

/* =========================================================
   BULK DELETE
   ========================================================= */

function bindBulkDelete() {
  $("#bulkDeleteBtn")
    ?.addEventListener(
      "click",
      () => {
        bulkDeleteTransactions();
      }
    );
}

function toggleTransactionSelection(
  id,
  checked
) {
  if (checked) {
    selectedTransactions.add(
      id
    );
  } else {
    selectedTransactions.delete(
      id
    );
  }

  updateBulkDeleteState();
}

function updateBulkDeleteState() {
  const button =
    $("#bulkDeleteBtn");

  if (!button) return;

  button.disabled =
    selectedTransactions.size ===
    0;

  button.innerHTML = `
    🗑️ Delete
    (${selectedTransactions.size})
  `;
}

function bulkDeleteTransactions() {
  if (
    !selectedTransactions.size
  ) {
    return;
  }

  const state =
    getState();

  const remaining =
    state.transactions.filter(
      (transaction) =>
        !selectedTransactions.has(
          transaction.id
        )
    );

  setState(
    {
      ...state,
      transactions:
        remaining,
    },
    {
      event:
        "transaction:bulkDelete",
    }
  );

  showToast({
    type: "warning",
    title:
      "Transactions Deleted",
    message: `${selectedTransactions.size} transactions removed.`,
    icon: "🗑️",
  });

  selectedTransactions.clear();

  updateBulkDeleteState();
}

/* =========================================================
   SELECT ALL
   ========================================================= */

function bindSelectAll() {
  $("#selectAllTransactions")
    ?.addEventListener(
      "change",
      (event) => {
        const checked =
          event.target.checked;

        const filtered =
          getFilteredTransactions(
            getState()
              .transactions
          );

        filtered.forEach(
          (transaction) => {
            if (checked) {
              selectedTransactions.add(
                transaction.id
              );
            } else {
              selectedTransactions.delete(
                transaction.id
              );
            }
          }
        );

        renderTransactionsPage(
          getState()
        );
      }
    );
}

/* =========================================================
   CSV IMPORT
   ========================================================= */

function bindCSVImport() {
  $("#csvImportInput")
    ?.addEventListener(
      "change",
      async (event) => {
        const file =
          event.target.files?.[0];

        if (!file) return;

        const text =
          await file.text();

        importCSV(text);
      }
    );
}

function importCSV(csvText) {
  const lines =
    csvText.split("\n");

  if (lines.length < 2) {
    showToast({
      type: "error",
      title:
        "Invalid CSV",
      message:
        "CSV file is empty.",
      icon: "❌",
    });

    return;
  }

  const state =
    getState();

  const imported = [];

  for (
    let i = 1;
    i < lines.length;
    i += 1
  ) {
    const line =
      lines[i].trim();

    if (!line) continue;

    const parts =
      line.split(",");

    imported.push({
      id: uid("txn"),

      name:
        parts[0] ||
        "Imported",

      amount: Number(
        parts[1] || 0
      ),

      category:
        parts[2] ||
        "General",

      type:
        parts[3] ||
        "expense",

      date:
        parts[4] ||
        new Date()
          .toISOString()
          .slice(0, 10),

      method:
        parts[5] || "UPI",

      note:
        parts[6] || "",

      emoji:
        getCategoryEmoji(
          parts[2]
        ),

      tags: [],

      recurring: false,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    });
  }

  setState(
    {
      ...state,
      transactions: [
        ...imported,
        ...state.transactions,
      ],
    },
    {
      event:
        "transaction:csvImport",
    }
  );

  showToast({
    type: "success",
    title:
      "CSV Imported",
    message: `${imported.length} transactions added.`,
    icon: "📄",
  });
}

/* =========================================================
   OCR SCANNER
   ========================================================= */

function bindOCRScanner() {
  $("#receiptScannerInput")
    ?.addEventListener(
      "change",
      (event) => {
        const file =
          event.target.files?.[0];

        if (!file) return;

        simulateOCRScan(
          file
        );
      }
    );
}

function simulateOCRScan(file) {
  const result =
    $("#ocrScanResult");

  if (!result) return;

  result.innerHTML = `
    <div class="ocr-loading">
      <div class="spinner"></div>

      <p>
        Scanning receipt...
      </p>
    </div>
  `;

  setTimeout(() => {
    const mockMerchant =
      [
        "Starbucks",
        "McDonald's",
        "Amazon",
        "Uber",
        "Zomato",
      ][
        Math.floor(
          Math.random() * 5
        )
      ];

    const mockAmount =
      Math.floor(
        Math.random() * 5000
      ) + 100;

    result.innerHTML = `
      <div class="ocr-result-card">
        <h3>
          OCR Scan Result
        </h3>

        <div class="ocr-result-grid">
          <div>
            <span>
              Merchant
            </span>

            <strong>
              ${mockMerchant}
            </strong>
          </div>

          <div>
            <span>
              Amount
            </span>

            <strong>
              ₹${mockAmount}
            </strong>
          </div>
        </div>

        <button
          class="btn btn-primary"
          id="confirmOCRTransactionBtn"
        >
          Add Transaction
        </button>
      </div>
    `;

    $("#confirmOCRTransactionBtn")
      ?.addEventListener(
        "click",
        () => {
          autoAddOCRTransaction(
            mockMerchant,
            mockAmount
          );
        }
      );
  }, 1800);
}

function autoAddOCRTransaction(
  merchant,
  amount
) {
  const state =
    getState();

  const transaction = {
    id: uid("txn"),

    name: merchant,

    amount,

    category:
      "Shopping",

    type: "expense",

    date:
      new Date()
        .toISOString()
        .slice(0, 10),

    method: "Card",

    note:
      "Added via OCR Scan",

    emoji: "🧾",

    tags: [
      "#ocr",
    ],

    recurring: false,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  };

  setState(
    {
      ...state,
      transactions: [
        transaction,
        ...state.transactions,
      ],
    },
    {
      event:
        "transaction:ocrAdded",
    }
  );

  showToast({
    type: "success",
    title:
      "OCR Transaction Added",
    message: `${merchant} added successfully.`,
    icon: "🧾",
  });
}

/* =========================================================
   HELPERS
   ========================================================= */

function getCategoryEmoji(
  category = ""
) {
  const map = {
    Food: "🍔",

    Shopping: "🛍️",

    Bills: "📄",

    Entertainment:
      "🎬",

    Transport: "🚕",

    Salary: "💼",

    Freelance:
      "🧑‍💻",

    Subscriptions:
      "📺",

    Health: "💊",

    Travel: "✈️",

    Education: "📚",

    General: "💸",
  };

  return (
    map[category] || "💸"
  );
}