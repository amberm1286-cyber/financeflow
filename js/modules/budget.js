/* =========================================================
   FinanceFlow — Budget Module
   File: js/modules/budget.js
   ========================================================= */

import {
  $,
  $$,
  safeText,
  formatMoney,
  uid,
  debounce,
} from "../utils.js";

import {
  getState,
  setState,
  subscribe,
} from "../dataManager.js";

import {
  getBudgetUsage,
  getSuggestedBudget,
  getBudgetHistory,
} from "../analyticsEngine.js";

import {
  showToast,
  triggerBudgetWarning,
} from "../notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let initialized = false;

/* =========================================================
   INIT
   ========================================================= */

export function initBudgetModule() {
  if (initialized) return;

  bindBudgetEvents();

  renderBudgetPage(
    getState()
  );

  subscribe((state) => {
    renderBudgetPage(
      state
    );

    monitorBudgetThresholds(
      state
    );
  });

  initialized = true;

  console.log(
    "💰 Budget Module Initialized"
  );
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderBudgetPage(
  state
) {
  renderBudgetCards(
    state
  );

  renderBudgetOverview(
    state
  );

  renderBudgetHistory(
    state
  );

  renderSuggestedBudgets(
    state
  );
}

/* =========================================================
   BUDGET CARDS
   ========================================================= */

function renderBudgetCards(
  state
) {
  const container =
    $("#budgetCards");

  if (!container) return;

  const budgets =
    state.budgets || [];

  if (!budgets.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          💰
        </div>

        <h3>
          No Budgets Created
        </h3>

        <p>
          Create category budgets to start tracking spending.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = budgets.map(
    (budget) => {
      const usage =
        getBudgetUsage(
          state,
          budget
        );

      const percentage =
        Math.min(
          usage.percentage,
          100
        );

      const remaining =
        budget.amount -
        usage.spent;

      let statusClass =
        "good";

      let statusText =
        "Healthy";

      if (
        percentage >= 100
      ) {
        statusClass =
          "danger";

        statusText =
          "Exceeded";
      } else if (
        percentage >= 75
      ) {
        statusClass =
          "warning";

        statusText =
          "Warning";
      }

      return `
        <article
          class="budget-card ${statusClass}"
        >
          <div class="budget-card-top">
            <div class="budget-card-title">
              <div class="budget-card-icon">
                ${
                  budget.emoji ||
                  "📦"
                }
              </div>

              <div>
                <strong>
                  ${safeText(
                    budget.category
                  )}
                </strong>

                <small>
                  ${statusText}
                </small>
              </div>
            </div>

            <div class="budget-card-actions">
              <button
                class="icon-btn edit-budget-btn"
                data-id="${budget.id}"
              >
                ✏️
              </button>

              <button
                class="icon-btn delete-budget-btn"
                data-id="${budget.id}"
              >
                🗑️
              </button>
            </div>
          </div>

          <div class="budget-card-values">
            <div>
              <span>
                Spent
              </span>

              <strong>
                ${formatMoney(
                  usage.spent,
                  state.settings
                    .baseCurrency
                )}
              </strong>
            </div>

            <div>
              <span>
                Budget
              </span>

              <strong>
                ${formatMoney(
                  budget.amount,
                  state.settings
                    .baseCurrency
                )}
              </strong>
            </div>
          </div>

          <div class="budget-progress-wrap">
            <div class="budget-progress-top">
              <small>
                ${Math.round(
                  percentage
                )}% Used
              </small>

              <small>
                ${
                  remaining >= 0
                    ? "Remaining"
                    : "Overspent"
                }:
                ${formatMoney(
                  Math.abs(
                    remaining
                  ),
                  state.settings
                    .baseCurrency
                )}
              </small>
            </div>

            <div class="budget-progress-track">
              <div
                class="budget-progress-fill ${statusClass}"
                style="width:${percentage}%"
              ></div>
            </div>
          </div>

          <div class="budget-rollover">
            <label class="toggle-switch">
              <input
                type="checkbox"
                class="budget-rollover-toggle"
                data-id="${budget.id}"
                ${
                  budget.rollover
                    ? "checked"
                    : ""
                }
              />

              <span></span>
            </label>

            <small>
              Budget rollover
            </small>
          </div>
        </article>
      `;
    }
  ).join("");

  bindBudgetCardEvents();
}

/* =========================================================
   OVERVIEW
   ========================================================= */

function renderBudgetOverview(
  state
) {
  const budgets =
    state.budgets || [];

  const totalBudget =
    budgets.reduce(
      (sum, budget) =>
        sum +
        Number(
          budget.amount ||
            0
        ),
      0
    );

  const totalSpent =
    budgets.reduce(
      (sum, budget) => {
        const usage =
          getBudgetUsage(
            state,
            budget
          );

        return (
          sum +
          usage.spent
        );
      },
      0
    );

  const remaining =
    totalBudget -
    totalSpent;

  updateMetric(
    "#budgetOverviewTotal",
    totalBudget,
    state.settings
      .baseCurrency
  );

  updateMetric(
    "#budgetOverviewSpent",
    totalSpent,
    state.settings
      .baseCurrency
  );

  updateMetric(
    "#budgetOverviewRemaining",
    remaining,
    state.settings
      .baseCurrency
  );
}

function updateMetric(
  selector,
  value,
  currency
) {
  const element =
    $(selector);

  if (!element) return;

  element.textContent =
    formatMoney(
      value,
      currency
    );
}

/* =========================================================
   SUGGESTED BUDGETS
   ========================================================= */

function renderSuggestedBudgets(
  state
) {
  const container =
    $("#suggestedBudgets");

  if (!container) return;

  const categories = [
    ...new Set(
      state.transactions.map(
        (transaction) =>
          transaction.category
      )
    ),
  ];

  if (!categories.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>
          Not enough transaction data.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = categories.map(
    (category) => {
      const suggestion =
        getSuggestedBudget(
          state,
          category
        );

      return `
        <article class="suggested-budget-card">
          <div>
            <strong>
              ${safeText(
                category
              )}
            </strong>

            <small>
              Suggested based on last 3 months
            </small>
          </div>

          <strong>
            ${formatMoney(
              suggestion,
              state.settings
                .baseCurrency
            )}
          </strong>
        </article>
      `;
    }
  ).join("");
}

/* =========================================================
   HISTORY
   ========================================================= */

function renderBudgetHistory(
  state
) {
  const container =
    $("#budgetHistory");

  if (!container) return;

  const budgets =
    state.budgets || [];

  if (!budgets.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>
          Budget history will appear here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = budgets.map(
    (budget) => {
      const history =
        getBudgetHistory(
          state,
          budget.category
        );

      return `
        <article class="budget-history-card">
          <div class="budget-history-top">
            <strong>
              ${
                budget.emoji ||
                "📦"
              }

              ${safeText(
                budget.category
              )}
            </strong>

            <span>
              Last 6 Months
            </span>
          </div>

          <div class="budget-history-bars">
            ${history
              .map(
                (
                  item
                ) => `
                  <div class="budget-history-bar-wrap">
                    <div
                      class="budget-history-bar"
                      style="height:${Math.min(
                        item.percentage,
                        100
                      )}%"
                    ></div>

                    <small>
                      ${
                        item.month
                      }
                    </small>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `;
    }
  ).join("");
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindBudgetEvents() {
  bindAddBudget();

  bindBudgetFilters();
}

/* =========================================================
   ADD BUDGET
   ========================================================= */

function bindAddBudget() {
  $("#openBudgetModalBtn")
    ?.addEventListener(
      "click",
      () => {
        openBudgetModal();
      }
    );
}

function openBudgetModal(
  budget = null
) {
  let modal =
    $("#budgetModal");

  if (modal) {
    modal.remove();
  }

  modal =
    document.createElement(
      "div"
    );

  modal.id =
    "budgetModal";

  modal.className =
    "modal-overlay show";

  modal.innerHTML = `
    <div class="modal-card budget-modal-card">
      <button
        class="modal-close-btn"
        id="closeBudgetModal"
      >
        ✕
      </button>

      <div class="modal-header">
        <p class="eyebrow">
          FinanceFlow
        </p>

        <h2>
          ${
            budget
              ? "Edit"
              : "Create"
          }
          Budget
        </h2>
      </div>

      <form
        id="budgetForm"
        class="budget-form"
      >
        <div class="form-grid">
          <div class="input-group">
            <label>
              Category
            </label>

            <input
              type="text"
              id="budgetCategory"
              placeholder="Food"
              value="${
                budget
                  ? budget.category
                  : ""
              }"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Amount
            </label>

            <input
              type="number"
              id="budgetAmount"
              value="${
                budget
                  ? budget.amount
                  : ""
              }"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Emoji
            </label>

            <input
              type="text"
              id="budgetEmoji"
              value="${
                budget
                  ? budget.emoji
                  : "📦"
              }"
            />
          </div>

          <div class="input-group">
            <label>
              Month
            </label>

            <input
              type="month"
              id="budgetMonth"
              value="${
                budget
                  ? budget.month
                  : new Date()
                      .toISOString()
                      .slice(
                        0,
                        7
                      )
              }"
              required
            />
          </div>
        </div>

        <div class="budget-rollover-form">
          <label class="toggle-switch">
            <input
              type="checkbox"
              id="budgetRollover"
              ${
                budget?.rollover
                  ? "checked"
                  : ""
              }
            />

            <span></span>
          </label>

          <small>
            Enable rollover
          </small>
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-full"
        >
          ${
            budget
              ? "Save Changes"
              : "Create Budget"
          }
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(
    modal
  );

  bindBudgetForm(
    budget
  );
}

function bindBudgetForm(
  budget = null
) {
  const form =
    $("#budgetForm");

  form?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      if (budget) {
        updateBudget(
          budget.id
        );
      } else {
        addBudget();
      }

      closeBudgetModal();
    }
  );

  $("#closeBudgetModal")
    ?.addEventListener(
      "click",
      closeBudgetModal
    );
}

function addBudget() {
  const state =
    getState();

  const budget = {
    id: uid("budget"),

    category:
      $("#budgetCategory")
        ?.value ||
      "General",

    amount: Number(
      $("#budgetAmount")
        ?.value || 0
    ),

    emoji:
      $("#budgetEmoji")
        ?.value || "📦",

    month:
      $("#budgetMonth")
        ?.value ||
      new Date()
        .toISOString()
        .slice(0, 7),

    rollover:
      $("#budgetRollover")
        ?.checked || false,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  };

  setState(
    {
      ...state,
      budgets: [
        budget,
        ...state.budgets,
      ],
    },
    {
      event:
        "budget:added",
    }
  );

  showToast({
    type: "success",
    title:
      "Budget Created",
    message: `${budget.category} budget added successfully.`,
    icon: "💰",
  });
}

function updateBudget(
  budgetId
) {
  const state =
    getState();

  const budgets =
    state.budgets.map(
      (budget) => {
        if (
          budget.id !==
          budgetId
        ) {
          return budget;
        }

        return {
          ...budget,

          category:
            $("#budgetCategory")
              ?.value ||
            budget.category,

          amount: Number(
            $("#budgetAmount")
              ?.value || 0
          ),

          emoji:
            $("#budgetEmoji")
              ?.value ||
            budget.emoji,

          month:
            $("#budgetMonth")
              ?.value ||
            budget.month,

          rollover:
            $("#budgetRollover")
              ?.checked ||
            false,

          updatedAt:
            new Date().toISOString(),
        };
      }
    );

  setState(
    {
      ...state,
      budgets,
    },
    {
      event:
        "budget:updated",
    }
  );

  showToast({
    type: "success",
    title:
      "Budget Updated",
    message:
      "Changes saved successfully.",
    icon: "✏️",
  });
}

function closeBudgetModal() {
  $("#budgetModal")
    ?.remove();
}

/* =========================================================
   CARD EVENTS
   ========================================================= */

function bindBudgetCardEvents() {
  $$(".edit-budget-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const budget =
            getState().budgets.find(
              (item) =>
                item.id ===
                button.dataset.id
            );

          if (
            budget
          ) {
            openBudgetModal(
              budget
            );
          }
        }
      );
    });

  $$(".delete-budget-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteBudget(
            button.dataset.id
          );
        }
      );
    });

  $$(".budget-rollover-toggle")
    .forEach((toggle) => {
      toggle.addEventListener(
        "change",
        () => {
          toggleRollover(
            toggle.dataset.id,
            toggle.checked
          );
        }
      );
    });
}

/* =========================================================
   DELETE
   ========================================================= */

function deleteBudget(
  budgetId
) {
  const state =
    getState();

  const budget =
    state.budgets.find(
      (item) =>
        item.id ===
        budgetId
    );

  if (!budget) return;

  setState(
    {
      ...state,
      budgets:
        state.budgets.filter(
          (item) =>
            item.id !==
            budgetId
        ),
    },
    {
      event:
        "budget:deleted",
    }
  );

  showToast({
    type: "warning",
    title:
      "Budget Deleted",
    message: `${budget.category} budget removed.`,
    icon: "🗑️",
  });
}

/* =========================================================
   ROLLOVER
   ========================================================= */

function toggleRollover(
  budgetId,
  checked
) {
  const state =
    getState();

  const budgets =
    state.budgets.map(
      (budget) => {
        if (
          budget.id !==
          budgetId
        ) {
          return budget;
        }

        return {
          ...budget,
          rollover:
            checked,
        };
      }
    );

  setState(
    {
      ...state,
      budgets,
    },
    {
      event:
        "budget:rollover",
    }
  );

  showToast({
    type: "success",
    title:
      "Rollover Updated",
    message:
      checked
        ? "Budget rollover enabled."
        : "Budget rollover disabled.",
    icon: "🔄",
  });
}

/* =========================================================
   THRESHOLDS
   ========================================================= */

function monitorBudgetThresholds(
  state
) {
  const budgets =
    state.budgets || [];

  budgets.forEach(
    (budget) => {
      const usage =
        getBudgetUsage(
          state,
          budget
        );

      const percentage =
        Math.round(
          usage.percentage
        );

      if (
        percentage === 75 ||
        percentage === 90 ||
        percentage >= 100
      ) {
        triggerBudgetWarning(
          {
            category:
              budget.category,

            percentage,

            amount:
              usage.spent,

            limit:
              budget.amount,

            currency:
              state.settings
                .baseCurrency,
          }
        );
      }
    }
  );
}

/* =========================================================
   FILTERS
   ========================================================= */

function bindBudgetFilters() {
  $("#budgetSearch")
    ?.addEventListener(
      "input",
      debounce(
        (event) => {
          filterBudgets(
            event.target.value
          );
        },
        180
      )
    );
}

function filterBudgets(
  query = ""
) {
  const lower =
    query
      .trim()
      .toLowerCase();

  $$(".budget-card")
    .forEach((card) => {
      const text =
        card.textContent.toLowerCase();

      card.style.display =
        text.includes(lower)
          ? ""
          : "none";
    });
}