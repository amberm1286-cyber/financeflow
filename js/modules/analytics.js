/* =========================================================
   FinanceFlow — Analytics Module
   File: js/modules/analytics.js
   ========================================================= */

import {
  $,
  $$,
  safeText,
  formatMoney,
  formatDate,
  debounce,
} from "../utils.js";

import {
  getState,
  subscribe,
} from "../dataManager.js";

import {
  renderAllCharts,
  exportChartAsPNG,
} from "../chartManager.js";

import {
  getCategoryBreakdown,
  getMonthlyTrend,
  getDailyBalanceTrend,
  getDayOfWeekSpending,
  getCategoryComparison,
  getCurrentMonthTransactions,
  getAnalyticsSummary,
} from "../analyticsEngine.js";

import {
  showToast,
} from "../notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let initialized = false;

let selectedCategory = null;

let comparisonRange = {
  startA: "",
  endA: "",
  startB: "",
  endB: "",
};

/* =========================================================
   INIT
   ========================================================= */

export function initAnalyticsModule() {
  if (initialized) return;

  bindAnalyticsEvents();

  renderAnalyticsPage(
    getState()
  );

  subscribe((state) => {
    renderAnalyticsPage(
      state
    );
  });

  initialized = true;

  console.log(
    "📊 Analytics Module Initialized"
  );
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderAnalyticsPage(
  state
) {
  renderAllCharts(state);

  renderAnalyticsSummary(
    state
  );

  renderSpendingHeatmap(
    state
  );

  renderCategoryLegend(
    state
  );

  renderComparisonCards(
    state
  );

  renderAnalyticsInsights(
    state
  );

  renderChartTooltips();
}

/* =========================================================
   SUMMARY
   ========================================================= */

function renderAnalyticsSummary(
  state
) {
  const summary =
    getAnalyticsSummary(
      state
    );

  updateMetric(
    "#analyticsTotalSpent",
    summary.totalSpent,
    state.settings
      .baseCurrency
  );

  updateMetric(
    "#analyticsAverageDaily",
    summary.averageDaily,
    state.settings
      .baseCurrency
  );

  updateMetric(
    "#analyticsHighestDay",
    summary.highestDay,
    state.settings
      .baseCurrency
  );

  updateMetric(
    "#analyticsTransactionCount",
    summary.transactionCount,
    null,
    true
  );
}

function updateMetric(
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
   HEATMAP
   ========================================================= */

function renderSpendingHeatmap(
  state
) {
  const container =
    $("#spendingHeatmap");

  if (!container) return;

  const transactions =
    getCurrentMonthTransactions(
      state.transactions || []
    );

  const spendingByDate = {};

  transactions
    .filter(
      (transaction) =>
        transaction.type ===
        "expense"
    )
    .forEach(
      (transaction) => {
        spendingByDate[
          transaction.date
        ] =
          (
            spendingByDate[
              transaction.date
            ] || 0
          ) +
          Number(
            transaction.amount ||
              0
          );
      }
    );

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    today.getMonth();

  const totalDays =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const values =
    Object.values(
      spendingByDate
    );

  const max =
    Math.max(
      ...values,
      1
    );

  container.innerHTML = "";

  for (
    let day = 1;
    day <= totalDays;
    day += 1
  ) {
    const date =
      `${year}-${String(
        month + 1
      ).padStart(
        2,
        "0"
      )}-${String(day).padStart(
        2,
        "0"
      )}`;

    const amount =
      spendingByDate[
        date
      ] || 0;

    const intensity =
      amount / max;

    const cell =
      document.createElement(
        "div"
      );

    cell.className =
      "heatmap-cell";

    cell.dataset.date =
      date;

    cell.dataset.amount =
      amount;

    cell.style.background =
      getHeatmapColor(
        intensity
      );

    cell.innerHTML = `
      <span>
        ${day}
      </span>
    `;

    cell.addEventListener(
      "mouseenter",
      (event) => {
        showHeatmapTooltip(
          event,
          date,
          amount,
          state.settings
            .baseCurrency
        );
      }
    );

    cell.addEventListener(
      "mouseleave",
      hideHeatmapTooltip
    );

    container.appendChild(
      cell
    );
  }
}

function getHeatmapColor(
  intensity
) {
  if (intensity <= 0) {
    return "rgba(255,255,255,0.04)";
  }

  if (intensity < 0.25) {
    return "rgba(79,142,247,0.25)";
  }

  if (intensity < 0.5) {
    return "rgba(79,142,247,0.45)";
  }

  if (intensity < 0.75) {
    return "rgba(124,58,237,0.7)";
  }

  return "rgba(255,71,87,0.92)";
}

/* =========================================================
   TOOLTIP
   ========================================================= */

function showHeatmapTooltip(
  event,
  date,
  amount,
  currency
) {
  let tooltip =
    $("#heatmapTooltip");

  if (!tooltip) {
    tooltip =
      document.createElement(
        "div"
      );

    tooltip.id =
      "heatmapTooltip";

    tooltip.className =
      "heatmap-tooltip";

    document.body.appendChild(
      tooltip
    );
  }

  tooltip.innerHTML = `
    <strong>
      ${formatDate(
        date
      )}
    </strong>

    <span>
      ${formatMoney(
        amount,
        currency
      )}
    </span>
  `;

  tooltip.style.left =
    `${event.pageX + 14}px`;

  tooltip.style.top =
    `${event.pageY - 12}px`;

  tooltip.classList.add(
    "show"
  );
}

function hideHeatmapTooltip() {
  $("#heatmapTooltip")
    ?.classList.remove(
      "show"
    );
}

/* =========================================================
   CATEGORY LEGEND
   ========================================================= */

function renderCategoryLegend(
  state
) {
  const container =
    $("#categoryLegend");

  if (!container) return;

  const categories =
    getCategoryBreakdown(
      state
    );

  if (!categories.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>
          No category data available.
        </p>
      </div>
    `;

    return;
  }

  const total =
    categories.reduce(
      (sum, category) =>
        sum +
        Number(
          category.amount ||
            0
        ),
      0
    );

  container.innerHTML = categories.map(
    (category) => {
      const percentage =
        total > 0
          ? (
              (category.amount /
                total) *
              100
            ).toFixed(1)
          : 0;

      return `
        <article
          class="category-legend-item"
          data-category="${category.category}"
        >
          <div class="category-legend-left">
            <div
              class="category-legend-dot"
              style="background:${category.color}"
            ></div>

            <strong>
              ${category.emoji || "💳"}
              ${safeText(
                category.category
              )}
            </strong>
          </div>

          <div class="category-legend-right">
            <span>
              ${percentage}%
            </span>

            <strong>
              ${formatMoney(
                category.amount,
                state.settings
                  .baseCurrency
              )}
            </strong>
          </div>
        </article>
      `;
    }
  ).join("");

  bindCategoryLegend();
}

function bindCategoryLegend() {
  $$(".category-legend-item")
    .forEach((item) => {
      item.addEventListener(
        "click",
        () => {
          selectedCategory =
            item.dataset.category;

          filterTransactionsByCategory(
            selectedCategory
          );
        }
      );
    });
}

function filterTransactionsByCategory(
  category
) {
  const rows = $$(
    ".transaction-row"
  );

  rows.forEach((row) => {
    const tag =
      row.querySelector(
        ".transaction-category-tag"
      );

    if (!tag) return;

    if (
      tag.textContent.trim() ===
      category
    ) {
      row.classList.add(
        "highlight"
      );

      row.scrollIntoView({
        behavior:
          "smooth",
        block: "center",
      });
    } else {
      row.classList.remove(
        "highlight"
      );
    }
  });

  showToast({
    type: "info",
    title:
      "Transactions Filtered",
    message: `Showing related transactions for ${category}.`,
    icon: "📊",
  });
}

/* =========================================================
   COMPARISON
   ========================================================= */

function bindAnalyticsEvents() {
  bindComparison();

  bindChartExports();

  bindAnalyticsFilters();
}

function bindComparison() {
  const compareBtn =
    $("#compareRangesBtn");

  compareBtn?.addEventListener(
    "click",
    () => {
      comparisonRange = {
        startA:
          $("#compareStartA")
            ?.value || "",

        endA:
          $("#compareEndA")
            ?.value || "",

        startB:
          $("#compareStartB")
            ?.value || "",

        endB:
          $("#compareEndB")
            ?.value || "",
      };

      renderComparisonCards(
        getState()
      );
    }
  );
}

function renderComparisonCards(
  state
) {
  const container =
    $("#comparisonResults");

  if (!container) return;

  const valid =
    comparisonRange.startA &&
    comparisonRange.endA &&
    comparisonRange.startB &&
    comparisonRange.endB;

  if (!valid) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>
          Select two ranges to compare spending.
        </p>
      </div>
    `;

    return;
  }

  const comparison =
    getCategoryComparison(
      state,
      comparisonRange
    );

  container.innerHTML = comparison.map(
    (item) => {
      const diff =
        item.rangeB -
        item.rangeA;

      return `
        <article class="comparison-card">
          <div class="comparison-top">
            <strong>
              ${safeText(
                item.category
              )}
            </strong>

            <span class="${
              diff >= 0
                ? "danger"
                : "success"
            }">
              ${
                diff >= 0
                  ? "+"
                  : ""
              }

              ${formatMoney(
                diff,
                state.settings
                  .baseCurrency
              )}
            </span>
          </div>

          <div class="comparison-values">
            <div>
              <small>
                Range A
              </small>

              <strong>
                ${formatMoney(
                  item.rangeA,
                  state.settings
                    .baseCurrency
                )}
              </strong>
            </div>

            <div>
              <small>
                Range B
              </small>

              <strong>
                ${formatMoney(
                  item.rangeB,
                  state.settings
                    .baseCurrency
                )}
              </strong>
            </div>
          </div>
        </article>
      `;
    }
  ).join("");
}

/* =========================================================
   INSIGHTS
   ========================================================= */

function renderAnalyticsInsights(
  state
) {
  const container =
    $("#analyticsInsights");

  if (!container) return;

  const monthly =
    getMonthlyTrend(state);

  const days =
    getDayOfWeekSpending(
      state
    );

  const highestDay =
    [...days].sort(
      (a, b) =>
        b.amount -
        a.amount
    )[0];

  const trendDirection =
    monthly.length >= 2
      ? monthly[
          monthly.length - 1
        ].expenses >
        monthly[
          monthly.length - 2
        ].expenses
        ? "up"
        : "down"
      : "stable";

  const insights = [
    {
      icon: "📈",

      title:
        "Monthly Trend",

      description:
        trendDirection ===
        "up"
          ? "Your spending increased compared to last month."
          : "Your spending decreased compared to last month.",
    },

    {
      icon: "🗓️",

      title:
        "Highest Spending Day",

      description: highestDay
        ? `You spend the most on ${highestDay.day}.`
        : "Not enough data available.",
    },

    {
      icon: "🎯",

      title:
        "Budget Focus",

      description:
        "Monitor your top 3 categories to improve financial score.",
    },
  ];

  container.innerHTML = insights.map(
    (insight) => {
      return `
        <article class="analytics-insight-card">
          <div class="analytics-insight-icon">
            ${insight.icon}
          </div>

          <div>
            <strong>
              ${safeText(
                insight.title
              )}
            </strong>

            <p>
              ${safeText(
                insight.description
              )}
            </p>
          </div>
        </article>
      `;
    }
  ).join("");
}

/* =========================================================
   EXPORTS
   ========================================================= */

function bindChartExports() {
  $$(".export-chart-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const chartId =
            button.dataset.chart;

          exportChart(chartId);
        }
      );
    });
}

function exportChart(
  chartId
) {
  const chart =
    document.querySelector(
      `#${chartId}`
    );

  if (!chart) {
    showToast({
      type: "error",
      title:
        "Chart Not Found",
      message:
        "Unable to export selected chart.",
      icon: "❌",
    });

    return;
  }

  exportChartAsPNG(
    chart,
    chartId
  );

  showToast({
    type: "success",
    title:
      "Chart Exported",
    message:
      "PNG export completed successfully.",
    icon: "🖼️",
  });
}

/* =========================================================
   ANALYTICS FILTERS
   ========================================================= */

function bindAnalyticsFilters() {
  $("#analyticsCategoryFilter")
    ?.addEventListener(
      "change",
      debounce(
        () => {
          renderAnalyticsPage(
            getState()
          );
        },
        160
      )
    );
}

/* =========================================================
   TOOLTIP HELPERS
   ========================================================= */

function renderChartTooltips() {
  $$(".chart-tooltip-target")
    .forEach((item) => {
      item.addEventListener(
        "mouseenter",
        () => {
          item.classList.add(
            "active"
          );
        }
      );

      item.addEventListener(
        "mouseleave",
        () => {
          item.classList.remove(
            "active"
          );
        }
      );
    });
}