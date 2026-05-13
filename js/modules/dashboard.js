/* =========================================================
   FinanceFlow — Dashboard Module
   File: js/modules/dashboard.js
   ========================================================= */

import {
  $,
  $$,
  createEl,
  formatMoney,
  formatDate,
  safeText,
  animateNumber,
  uid,
} from "../utils.js";

import {
  getState,
  setState,
  subscribe,
} from "../dataManager.js";

import {
  renderDashboardSummary,
  renderFinancialScore,
  renderTodaySummary,
  renderTopCategories,
  renderBudgetBurnRate,
  renderInsights,
  renderNetWorth,
  render503020Rule,
  renderSubscriptionWidget,
} from "../uiManager.js";

import {
  getDashboardSummary,
  getFinancialScore,
  getUpcomingBills,
  getTopCategoriesThisMonth,
  getBudgetUsage,
  generateAIInsights,
  getCurrentMonthTransactions,
  getTodaySummary,
  get503020Analysis,
} from "../analyticsEngine.js";

import {
  notifyTransactionAdded,
  showToast,
} from "../notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let initialized = false;

let rotatingInsightInterval = null;

/* =========================================================
   INIT
   ========================================================= */

export function initDashboardModule() {
  if (initialized) return;

  bindDashboardEvents();

  renderDashboard(getState());

  subscribe((state, eventName) => {
    renderDashboard(state, eventName);
  });

  initialized = true;

  console.log("🏠 Dashboard Module Initialized");
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderDashboard(
  state,
  eventName = ""
) {
  renderDashboardSummary(state);

  renderFinancialScore(state);

  renderTodaySummary(state);

  renderTopCategories(state);

  renderBudgetBurnRate(state);

  renderInsights(state);

  renderUpcomingBills(state);

  renderHealthIndicators(state);

  renderFinancialStreak(state);

  renderQuickStats(state);

  renderNetWorth(state);

  render503020Rule(state);

  renderSubscriptionWidget(state);

  renderRecentActivity(state);

  renderInsightRotation(state);

  animateDashboardCards();

  if (
    eventName &&
    eventName !== "state:updated"
  ) {
    pulseDashboard();
  }
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindDashboardEvents() {
  bindQuickAddFAB();

  bindDashboardShortcuts();

  bindInsightRefresh();

  bindQuickActions();
}

/* =========================================================
   QUICK ADD FAB
   ========================================================= */

function bindQuickAddFAB() {
  const fab = $("#quickAddFab");

  if (!fab) return;

  fab.addEventListener(
    "click",
    () => {
      openQuickTransactionModal();
    }
  );
}

function openQuickTransactionModal() {
  let modal =
    $("#quickTransactionModal");

  if (modal) {
    modal.classList.add("show");

    return;
  }

  modal = document.createElement("div");

  modal.id =
    "quickTransactionModal";

  modal.className =
    "modal-overlay show";

  modal.innerHTML = `
    <div class="modal-card quick-transaction-modal">
      <button
        class="modal-close-btn"
        id="closeQuickTransactionModal"
      >
        ✕
      </button>

      <div class="modal-header">
        <p class="eyebrow">
          FinanceFlow Quick Add
        </p>

        <h2>Add Transaction</h2>
      </div>

      <form
        id="quickTransactionForm"
        class="quick-transaction-form"
      >
        <div class="form-grid">
          <div class="input-group">
            <label>Name</label>

            <input
              type="text"
              id="quickTxnName"
              placeholder="Netflix, Salary..."
              required
            />
          </div>

          <div class="input-group">
            <label>Amount</label>

            <input
              type="number"
              id="quickTxnAmount"
              placeholder="0"
              required
            />
          </div>

          <div class="input-group">
            <label>Type</label>

            <select id="quickTxnType">
              <option value="expense">
                Expense
              </option>

              <option value="income">
                Income
              </option>
            </select>
          </div>

          <div class="input-group">
            <label>Category</label>

            <input
              type="text"
              id="quickTxnCategory"
              placeholder="Food"
              required
            />
          </div>

          <div class="input-group">
            <label>Payment Method</label>

            <select id="quickTxnMethod">
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

          <div class="input-group">
            <label>Date</label>

            <input
              type="date"
              id="quickTxnDate"
              required
            />
          </div>
        </div>

        <div class="input-group">
          <label>Note</label>

          <textarea
            id="quickTxnNote"
            placeholder="Optional note..."
          ></textarea>
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

  $("#quickTxnDate").value =
    new Date()
      .toISOString()
      .slice(0, 10);

  bindQuickTransactionForm();
}

function bindQuickTransactionForm() {
  const form =
    $("#quickTransactionForm");

  form?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const state =
        getState();

      const transaction = {
        id: uid("txn"),
        name:
          $("#quickTxnName")
            ?.value || "Transaction",
        amount: Number(
          $("#quickTxnAmount")
            ?.value || 0
        ),
        type:
          $("#quickTxnType")
            ?.value || "expense",
        category:
          $("#quickTxnCategory")
            ?.value || "General",
        method:
          $("#quickTxnMethod")
            ?.value || "UPI",
        note:
          $("#quickTxnNote")
            ?.value || "",
        date:
          $("#quickTxnDate")
            ?.value ||
          new Date()
            .toISOString()
            .slice(0, 10),
        emoji:
          getCategoryEmoji(
            $("#quickTxnCategory")
              ?.value
          ),
        tags: [],
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

      closeQuickTransactionModal();

      if (window.confetti) {
        window.confetti({
          particleCount: 70,
          spread: 70,
          origin: {
            y: 0.72,
          },
        });
      }
    }
  );

  $("#closeQuickTransactionModal")
    ?.addEventListener(
      "click",
      closeQuickTransactionModal
    );
}

function closeQuickTransactionModal() {
  $("#quickTransactionModal")
    ?.remove();
}

/* =========================================================
   UPCOMING BILLS
   ========================================================= */

function renderUpcomingBills(state) {
  const container =
    $("#upcomingBillsList");

  if (!container) return;

  const bills =
    getUpcomingBills(state);

  if (!bills.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>No upcoming bills.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = bills.map(
    (bill) => {
      return `
        <article class="bill-item">
          <div class="bill-left">
            <div class="bill-icon">
              ${bill.emoji || "📄"}
            </div>

            <div>
              <strong>
                ${safeText(
                  bill.name
                )}
              </strong>

              <small>
                Due ${formatDate(
                  bill.nextBillingDate,
                  {
                    short: true,
                  }
                )}
              </small>
            </div>
          </div>

          <strong class="bill-amount">
            ${formatMoney(
              bill.amount,
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
   HEALTH INDICATORS
   ========================================================= */

function renderHealthIndicators(
  state
) {
  const summary =
    getDashboardSummary(state);

  const score =
    getFinancialScore(state);

  const container =
    $("#healthIndicators");

  if (!container) return;

  const indicators = [
    {
      label:
        "Savings Rate",
      value: `${summary.savingsRate}%`,
      status:
        summary.savingsRate >= 20
          ? "good"
          : summary.savingsRate >= 10
          ? "warn"
          : "danger",
    },

    {
      label:
        "Financial Score",
      value: `${score.score}/850`,
      status:
        score.score >= 700
          ? "good"
          : score.score >= 550
          ? "warn"
          : "danger",
    },

    {
      label:
        "Subscriptions",
      value: formatMoney(
        getCurrentSubscriptionTotal(
          state
        ),
        state.settings
          .baseCurrency
      ),
      status: "warn",
    },
  ];

  container.innerHTML = indicators.map(
    (indicator) => {
      return `
        <div class="health-indicator ${indicator.status}">
          <span>
            ${safeText(
              indicator.label
            )}
          </span>

          <strong>
            ${indicator.value}
          </strong>
        </div>
      `;
    }
  ).join("");
}

/* =========================================================
   STREAK
   ========================================================= */

function renderFinancialStreak(
  state
) {
  const element =
    $("#streakValue");

  if (!element) return;

  const streak =
    calculateTransactionStreak(
      state.transactions
    );

  animateNumber({
    element,
    start: 0,
    end: streak,
    duration: 900,
    formatter: (value) =>
      `${Math.round(value)} Days`,
  });

  const label =
    $("#streakLabel");

  if (label) {
    if (streak >= 30) {
      label.textContent =
        "Excellent consistency 🔥";
    } else if (streak >= 7) {
      label.textContent =
        "Great financial habit 🚀";
    } else {
      label.textContent =
        "Keep logging daily ✨";
    }
  }
}

/* =========================================================
   QUICK STATS
   ========================================================= */

function renderQuickStats(state) {
  const summary =
    getDashboardSummary(state);

  const stats = [
    {
      selector:
        "#quickStatIncome",
      value:
        summary.monthlyIncome,
    },

    {
      selector:
        "#quickStatExpense",
      value:
        summary.monthlyExpenses,
    },

    {
      selector:
        "#quickStatSavings",
      value:
        summary.netSavings,
    },
  ];

  stats.forEach((stat) => {
    const element =
      $(stat.selector);

    if (!element) return;

    animateNumber({
      element,
      start: 0,
      end: stat.value,
      duration: 1000,
      formatter: (value) =>
        formatMoney(
          value,
          state.settings
            .baseCurrency,
          true
        ),
    });
  });
}

/* =========================================================
   RECENT ACTIVITY
   ========================================================= */

function renderRecentActivity(
  state
) {
  const container =
    $("#recentActivityList");

  if (!container) return;

  const activities =
    buildRecentActivities(
      state
    );

  if (!activities.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>No recent activity yet.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = activities.map(
    (activity) => {
      return `
        <article class="recent-activity-item">
          <div class="recent-activity-icon">
            ${activity.icon}
          </div>

          <div>
            <strong>
              ${safeText(
                activity.title
              )}
            </strong>

            <p>
              ${safeText(
                activity.description
              )}
            </p>

            <small>
              ${activity.time}
            </small>
          </div>
        </article>
      `;
    }
  ).join("");
}

/* =========================================================
   INSIGHT ROTATION
   ========================================================= */

function renderInsightRotation(
  state
) {
  clearInterval(
    rotatingInsightInterval
  );

  const insights =
    generateAIInsights(state);

  const banner =
    $("#aiInsightBanner");

  if (
    !banner ||
    !insights.length
  ) {
    return;
  }

  let index = 0;

  const updateInsight =
    () => {
      const insight =
        insights[index];

      banner.classList.remove(
        "show"
      );

      setTimeout(() => {
        banner.innerHTML = `
          <span class="banner-icon">
            ${insight.icon}
          </span>

          <span class="banner-text">
            ${safeText(
              insight.message
            )}
          </span>
        `;

        banner.classList.add(
          "show"
        );
      }, 200);

      index =
        (index + 1) %
        insights.length;
    };

  updateInsight();

  rotatingInsightInterval =
    setInterval(
      updateInsight,
      6000
    );
}

/* =========================================================
   INSIGHT REFRESH
   ========================================================= */

function bindInsightRefresh() {
  const button =
    $("#refreshInsightsBtn");

  button?.addEventListener(
    "click",
    () => {
      const state =
        getState();

      renderInsights(state);

      showToast({
        type: "success",
        title:
          "Insights Refreshed",
        message:
          "AI insights have been recalculated.",
        icon: "🤖",
      });

      button.classList.add(
        "spinning"
      );

      setTimeout(() => {
        button.classList.remove(
          "spinning"
        );
      }, 1000);
    }
  );
}

/* =========================================================
   QUICK ACTIONS
   ========================================================= */

function bindQuickActions() {
  $("#dashboardExportBtn")
    ?.addEventListener(
      "click",
      () => {
        document
          .querySelector(
            "#exportMonthBtn"
          )
          ?.click();
      }
    );

  $("#dashboardSyncBtn")
    ?.addEventListener(
      "click",
      () => {
        $("#syncNowBtn")
          ?.click();
      }
    );
}

/* =========================================================
   SHORTCUTS
   ========================================================= */

function bindDashboardShortcuts() {
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.target.matches(
          "input, textarea"
        )
      ) {
        return;
      }

      if (
        event.key.toLowerCase() ===
        "q"
      ) {
        openQuickTransactionModal();
      }
    }
  );
}

/* =========================================================
   ANIMATIONS
   ========================================================= */

function animateDashboardCards() {
  const cards = $$(
    ".dashboard-grid .glass-card"
  );

  cards.forEach(
    (card, index) => {
      card.style.animationDelay =
        `${index * 60}ms`;

      card.classList.add(
        "dashboard-card-in"
      );
    }
  );
}

function pulseDashboard() {
  const grid =
    $(".dashboard-grid");

  if (!grid) return;

  grid.classList.add(
    "dashboard-pulse"
  );

  setTimeout(() => {
    grid.classList.remove(
      "dashboard-pulse"
    );
  }, 500);
}

/* =========================================================
   HELPERS
   ========================================================= */

function calculateTransactionStreak(
  transactions = []
) {
  if (!transactions.length)
    return 0;

  const uniqueDates = [
    ...new Set(
      transactions.map(
        (transaction) =>
          transaction.date
      )
    ),
  ].sort(
    (a, b) =>
      new Date(b) -
      new Date(a)
  );

  let streak = 0;

  const current =
    new Date();

  for (
    let i = 0;
    i < uniqueDates.length;
    i += 1
  ) {
    const expected =
      new Date();

    expected.setDate(
      current.getDate() - i
    );

    const iso = expected
      .toISOString()
      .slice(0, 10);

    if (
      uniqueDates.includes(
        iso
      )
    ) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function getCurrentSubscriptionTotal(
  state
) {
  return (
    state.subscriptions || []
  ).reduce(
    (sum, subscription) => {
      return (
        sum +
        Number(
          subscription.amount ||
            0
        )
      );
    },
    0
  );
}

function buildRecentActivities(
  state
) {
  const activities = [];

  const latestTransactions =
    [...state.transactions]
      .sort(
        (a, b) =>
          new Date(
            b.createdAt
          ) -
          new Date(a.createdAt)
      )
      .slice(0, 5);

  latestTransactions.forEach(
    (transaction) => {
      activities.push({
        icon:
          transaction.emoji ||
          "💸",

        title:
          transaction.name,

        description: `${
          transaction.type ===
          "income"
            ? "Income"
            : "Expense"
        } • ${
          transaction.category
        } • ${formatMoney(
          transaction.amount,
          state.settings
            .baseCurrency
        )}`,

        time:
          formatDate(
            transaction.date,
            {
              short: true,
            }
          ),
      });
    }
  );

  return activities;
}

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
    Freelance: "🧑‍💻",
    Subscriptions:
      "📺",
    Health: "💊",
    Travel: "✈️",
    Education: "📚",
  };

  return (
    map[category] || "💸"
  );
}