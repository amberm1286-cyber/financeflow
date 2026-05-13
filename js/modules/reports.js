/* =========================================================
   FinanceFlow — Reports Module
   File: js/modules/reports.js
   ========================================================= */

import {
  $,
  $$,
  safeText,
  formatMoney,
  formatDate,
  downloadBlob,
} from "../utils.js";

import {
  getState,
  subscribe,
} from "../dataManager.js";

import {
  getDashboardSummary,
  getCategoryBreakdown,
  getFinancialScore,
  getUpcomingSubscriptions,
  getTopTransactions,
} from "../analyticsEngine.js";

import {
  exportMonthlyPDFReport,
  exportCustomPDFReport,
} from "../pdfExporter.js";

import {
  showToast,
} from "../notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let initialized = false;

let customRange = {
  start: "",
  end: "",
};

/* =========================================================
   INIT
   ========================================================= */

export function initReportsModule() {
  if (initialized) return;

  bindReportEvents();

  renderReportsPage(
    getState()
  );

  subscribe((state) => {
    renderReportsPage(
      state
    );
  });

  initialized = true;

  console.log(
    "📄 Reports Module Initialized"
  );
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderReportsPage(
  state
) {
  renderExecutiveSummary(
    state
  );

  renderExpenseBreakdown(
    state
  );

  renderTopTransactions(
    state
  );

  renderGoalReport(
    state
  );

  renderSubscriptionReport(
    state
  );

  renderFinancialScoreReport(
    state
  );
}

/* =========================================================
   EXECUTIVE SUMMARY
   ========================================================= */

function renderExecutiveSummary(
  state
) {
  const summary =
    getDashboardSummary(
      state
    );

  setMetric(
    "#reportIncomeValue",
    formatMoney(
      summary.monthlyIncome,
      state.settings
        .baseCurrency
    )
  );

  setMetric(
    "#reportExpenseValue",
    formatMoney(
      summary.monthlyExpenses,
      state.settings
        .baseCurrency
    )
  );

  setMetric(
    "#reportSavingsValue",
    formatMoney(
      summary.netSavings,
      state.settings
        .baseCurrency
    )
  );

  setMetric(
    "#reportBalanceValue",
    formatMoney(
      summary.totalBalance,
      state.settings
        .baseCurrency
    )
  );
}

function setMetric(
  selector,
  value
) {
  const element =
    $(selector);

  if (!element) return;

  element.textContent =
    value;
}

/* =========================================================
   EXPENSE BREAKDOWN
   ========================================================= */

function renderExpenseBreakdown(
  state
) {
  const container =
    $("#reportExpenseBreakdown");

  if (!container) return;

  const breakdown =
    getCategoryBreakdown(
      state
    );

  if (!breakdown.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>
          No expense data available.
        </p>
      </div>
    `;

    return;
  }

  const total =
    breakdown.reduce(
      (sum, category) =>
        sum +
        Number(
          category.amount ||
            0
        ),
      0
    );

  container.innerHTML = `
    <div class="report-table-wrap">
      <table class="report-table">
        <thead>
          <tr>
            <th>
              Category
            </th>

            <th>
              Amount
            </th>

            <th>
              Percentage
            </th>
          </tr>
        </thead>

        <tbody>
          ${breakdown
            .map(
              (
                category
              ) => {
                const percentage =
                  total
                    ? (
                        (category.amount /
                          total) *
                        100
                      ).toFixed(
                        1
                      )
                    : 0;

                return `
                  <tr>
                    <td>
                      ${
                        category.emoji ||
                        "💸"
                      }

                      ${safeText(
                        category.category
                      )}
                    </td>

                    <td>
                      ${formatMoney(
                        category.amount,
                        state.settings
                          .baseCurrency
                      )}
                    </td>

                    <td>
                      ${percentage}%
                    </td>
                  </tr>
                `;
              }
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* =========================================================
   TOP TRANSACTIONS
   ========================================================= */

function renderTopTransactions(
  state
) {
  const container =
    $("#reportTopTransactions");

  if (!container) return;

  const transactions =
    getTopTransactions(
      state,
      5
    );

  if (!transactions.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>
          No transaction data available.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = transactions.map(
    (transaction) => {
      return `
        <article class="report-transaction-item">
          <div class="report-transaction-left">
            <div class="report-transaction-icon">
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
                ${formatDate(
                  transaction.date,
                  {
                    short: true,
                  }
                )}
              </small>
            </div>
          </div>

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
        </article>
      `;
    }
  ).join("");
}

/* =========================================================
   GOALS REPORT
   ========================================================= */

function renderGoalReport(
  state
) {
  const container =
    $("#reportGoals");

  if (!container) return;

  const goals =
    state.goals || [];

  if (!goals.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>
          No goals available.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = goals.map(
    (goal) => {
      const progress =
        goal.targetAmount
          ? (
              (goal.currentAmount /
                goal.targetAmount) *
              100
            ).toFixed(0)
          : 0;

      return `
        <article class="report-goal-card">
          <div class="report-goal-top">
            <strong>
              ${
                goal.emoji ||
                "🎯"
              }

              ${safeText(
                goal.name
              )}
            </strong>

            <span>
              ${progress}%
            </span>
          </div>

          <div class="report-goal-progress">
            <div
              class="report-goal-fill"
              style="width:${progress}%"
            ></div>
          </div>

          <div class="report-goal-values">
            <small>
              ${formatMoney(
                goal.currentAmount,
                state.settings
                  .baseCurrency
              )}
            </small>

            <small>
              ${formatMoney(
                goal.targetAmount,
                state.settings
                  .baseCurrency
              )}
            </small>
          </div>
        </article>
      `;
    }
  ).join("");
}

/* =========================================================
   SUBSCRIPTION REPORT
   ========================================================= */

function renderSubscriptionReport(
  state
) {
  const container =
    $("#reportSubscriptions");

  if (!container) return;

  const subscriptions =
    getUpcomingSubscriptions(
      state,
      365
    );

  if (
    !subscriptions.length
  ) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>
          No subscriptions available.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = subscriptions.map(
    (
      subscription
    ) => {
      return `
        <article class="report-subscription-item">
          <div>
            <strong>
              ${
                subscription.emoji ||
                "🔄"
              }

              ${safeText(
                subscription.name
              )}
            </strong>

            <small>
              ${
                subscription.billingCycle
              }
            </small>
          </div>

          <strong>
            ${formatMoney(
              subscription.amount,
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
   FINANCIAL SCORE
   ========================================================= */

function renderFinancialScoreReport(
  state
) {
  const container =
    $("#reportFinancialScore");

  if (!container) return;

  const score =
    getFinancialScore(
      state
    );

  container.innerHTML = `
    <div class="financial-score-report-card">
      <div class="financial-score-main">
        <div class="financial-score-circle">
          <span>
            ${score.score}
          </span>
        </div>

        <div>
          <strong>
            ${score.label}
          </strong>

          <p>
            Financial health overview based on savings, budgeting, and spending patterns.
          </p>
        </div>
      </div>

      <div class="financial-score-breakdown">
        ${score.factors
          .map(
            (
              factor
            ) => {
              return `
                <div class="financial-score-factor">
                  <div class="financial-score-factor-top">
                    <small>
                      ${safeText(
                        factor.label
                      )}
                    </small>

                    <small>
                      ${
                        factor.score
                      }%
                    </small>
                  </div>

                  <div class="financial-score-track">
                    <div
                      class="financial-score-fill"
                      style="width:${factor.score}%"
                    ></div>
                  </div>
                </div>
              `;
            }
          )
          .join("")}
      </div>
    </div>
  `;
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindReportEvents() {
  bindPDFExports();

  bindCustomRange();

  bindJSONExport();
}

/* =========================================================
   PDF EXPORTS
   ========================================================= */

function bindPDFExports() {
  $("#exportMonthBtn")
    ?.addEventListener(
      "click",
      async () => {
        await exportMonthlyReport();
      }
    );

  $("#exportCustomBtn")
    ?.addEventListener(
      "click",
      async () => {
        await exportCustomReport();
      }
    );
}

async function exportMonthlyReport() {
  const button =
    $("#exportMonthBtn");

  try {
    setLoadingState(
      button,
      true,
      "Generating..."
    );

    await exportMonthlyPDFReport(
      getState()
    );

    showToast({
      type: "success",
      title:
        "PDF Exported",
      message:
        "Monthly financial report generated successfully.",
      icon: "📄",
    });
  } catch (error) {
    console.error(error);

    showToast({
      type: "error",
      title:
        "Export Failed",
      message:
        "Unable to generate PDF report.",
      icon: "❌",
    });
  } finally {
    setLoadingState(
      button,
      false,
      "Export This Month"
    );
  }
}

async function exportCustomReport() {
  const button =
    $("#exportCustomBtn");

  if (
    !customRange.start ||
    !customRange.end
  ) {
    showToast({
      type: "warning",
      title:
        "Select Range",
      message:
        "Please select start and end dates.",
      icon: "📅",
    });

    return;
  }

  try {
    setLoadingState(
      button,
      true,
      "Generating..."
    );

    await exportCustomPDFReport(
      getState(),
      customRange
    );

    showToast({
      type: "success",
      title:
        "Custom PDF Exported",
      message:
        "Custom report generated successfully.",
      icon: "📄",
    });
  } catch (error) {
    console.error(error);

    showToast({
      type: "error",
      title:
        "Export Failed",
      message:
        "Unable to generate custom report.",
      icon: "❌",
    });
  } finally {
    setLoadingState(
      button,
      false,
      "Export Custom Range"
    );
  }
}

/* =========================================================
   CUSTOM RANGE
   ========================================================= */

function bindCustomRange() {
  $("#reportCustomStart")
    ?.addEventListener(
      "change",
      (event) => {
        customRange.start =
          event.target.value;
      }
    );

  $("#reportCustomEnd")
    ?.addEventListener(
      "change",
      (event) => {
        customRange.end =
          event.target.value;
      }
    );
}

/* =========================================================
   JSON EXPORT
   ========================================================= */

function bindJSONExport() {
  $("#exportJSONBtn")
    ?.addEventListener(
      "click",
      () => {
        exportJSONBackup();
      }
    );
}

function exportJSONBackup() {
  const state =
    getState();

  const blob =
    new Blob(
      [
        JSON.stringify(
          state,
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    );

  downloadBlob(
    blob,
    `financeflow-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`
  );

  showToast({
    type: "success",
    title:
      "Backup Exported",
    message:
      "JSON backup downloaded successfully.",
    icon: "💾",
  });
}

/* =========================================================
   HELPERS
   ========================================================= */

function setLoadingState(
  button,
  loading,
  text
) {
  if (!button) return;

  button.disabled =
    loading;

  button.innerHTML = loading
    ? `
      <span class="spinner small"></span>
      ${text}
    `
    : text;
}