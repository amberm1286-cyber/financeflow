/* =========================================================
   FinanceFlow — UI Manager
   File: js/uiManager.js
   ========================================================= */

import {
  APP_CONFIG,
  CURRENCIES,
} from "./config.js";

import {
  $,
  $$,
  clearEl,
  createEl,
  formatMoney,
  formatDate,
  safeText,
  animateNumber,
  debounce,
} from "./utils.js";

import {
  getState,
  subscribe,
} from "./dataManager.js";

import {
  renderAllCharts,
} from "./chartManager.js";

import {
  getDashboardSummary,
  getTodaySummary,
  getTopCategoriesThisMonth,
  getFinancialScore,
  generateAIInsights,
  getBudgetUsage,
  getMonthlySubscriptionTotal,
  get503020Analysis,
} from "./analyticsEngine.js";

import {
  showToast,
} from "./notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let currentPage = "dashboard";

let initialized = false;

/* =========================================================
   INIT
   ========================================================= */

export function initUIManager() {
  if (initialized) return;

  bindNavigation();

  bindThemeToggle();

  bindKeyboardShortcuts();

  bindGlobalUI();

  renderApp(getState());

  subscribe((state) => {
    renderApp(state);
  });

  initialized = true;

  console.log("🎨 UI Manager Initialized");
}

/* =========================================================
   MAIN APP RENDER
   ========================================================= */

export function renderApp(state) {
  renderProfile(state);

  renderDashboardSummary(state);

  renderFinancialScore(state);

  renderTodaySummary(state);

  renderTopCategories(state);

  renderBudgetBurnRate(state);

  renderInsights(state);

  renderQuotes();

  render503020Rule(state);

  renderNetWorth(state);

  renderSubscriptionWidget(state);

  renderTheme(state);

  renderCurrencyOptions(state);

  renderSavedStatus();

  renderAllCharts(state);
}

/* =========================================================
   PROFILE
   ========================================================= */

function renderProfile(state) {
  const avatar = $("#profileAvatar");
  const name = $("#profileName");

  if (avatar) {
    avatar.textContent =
      state.settings.avatar || "🧑‍💻";
  }

  if (name) {
    name.textContent =
      state.settings.name || "User";
  }
}

/* =========================================================
   DASHBOARD SUMMARY
   ========================================================= */

export function renderDashboardSummary(state) {
  const summary =
    getDashboardSummary(state);

  animateStat(
    "#totalBalance",
    summary.totalBalance,
    state.settings.baseCurrency
  );

  animateStat(
    "#monthlyIncome",
    summary.monthlyIncome,
    state.settings.baseCurrency
  );

  animateStat(
    "#monthlyExpenses",
    summary.monthlyExpenses,
    state.settings.baseCurrency
  );

  animateStat(
    "#netSavings",
    summary.netSavings,
    state.settings.baseCurrency
  );
}

function animateStat(
  selector,
  value,
  currency
) {
  const element = $(selector);

  if (!element) return;

  animateNumber({
    element,
    start: 0,
    end: value,
    duration: 1200,
    formatter: (number) =>
      formatMoney(number, currency),
  });
}

/* =========================================================
   FINANCIAL SCORE
   ========================================================= */

export function renderFinancialScore(state) {
  const result =
    getFinancialScore(state);

  const score = result.score;

  const scoreValue = $("#financialScoreValue");
  const scoreBadge = $("#financialScoreBadge");
  const gauge = $("#financialScoreGaugeFill");

  if (scoreValue) {
    animateNumber({
      element: scoreValue,
      start: 0,
      end: score,
      duration: 1200,
      formatter: (number) =>
        Math.round(number),
    });
  }

  if (scoreBadge) {
    scoreBadge.textContent =
      result.badge;
  }

  if (gauge) {
    const circumference = 255;

    const offset =
      circumference -
      (score / 850) * circumference;

    gauge.style.strokeDashoffset =
      offset;

    if (score >= 750) {
      gauge.style.stroke =
        "var(--green)";
    } else if (score >= 600) {
      gauge.style.stroke =
        "var(--yellow)";
    } else {
      gauge.style.stroke =
        "var(--red)";
    }
  }

  renderScoreBreakdown(
    result.breakdown
  );
}

function renderScoreBreakdown(
  breakdown = []
) {
  const container =
    $("#scoreBreakdownList");

  if (!container) return;

  container.innerHTML = breakdown.map(
    (item) => {
      return `
        <div class="score-breakdown-item">
          <div class="score-breakdown-top">
            <strong>${safeText(item.label)}</strong>
            <span>${item.score}/${item.max}</span>
          </div>

          <div class="score-breakdown-track">
            <div
              class="score-breakdown-fill"
              style="width:${(item.score / item.max) * 100}%"
            ></div>
          </div>
        </div>
      `;
    }
  ).join("");
}

/* =========================================================
   TODAY SUMMARY
   ========================================================= */

export function renderTodaySummary(state) {
  const container =
    $("#todayTransactions");

  if (!container) return;

  const today =
    getTodaySummary(state.transactions);

  if (!today.transactions.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>No transactions added today.</p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    today.transactions.map(
      (transaction) => {
        return `
          <article class="today-transaction-item">
            <div class="today-transaction-left">
              <div class="today-transaction-icon">
                ${transaction.emoji || "💸"}
              </div>

              <div>
                <strong>
                  ${safeText(transaction.name)}
                </strong>

                <small>
                  ${safeText(transaction.category)}
                </small>
              </div>
            </div>

            <strong class="${
              transaction.type
            }">
              ${
                transaction.type === "income"
                  ? "+"
                  : "-"
              }
              ${formatMoney(
                transaction.amount,
                state.settings.baseCurrency
              )}
            </strong>
          </article>
        `;
      }
    ).join("");
}

/* =========================================================
   TOP CATEGORIES
   ========================================================= */

export function renderTopCategories(state) {
  const container =
    $("#topCategoriesList");

  if (!container) return;

  const categories =
    getTopCategoriesThisMonth(state);

  if (!categories.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>No category spending data available.</p>
      </div>
    `;

    return;
  }

  const max =
    Math.max(
      ...categories.map(
        (category) => category.amount
      ),
      1
    );

  container.innerHTML = categories.map(
    (category) => {
      const width =
        (category.amount / max) * 100;

      return `
        <article class="top-category-card">
          <div class="top-category-top">
            <div class="top-category-title">
              <span>
                ${category.emoji || "💳"}
              </span>

              <strong>
                ${safeText(category.category)}
              </strong>
            </div>

            <strong>
              ${formatMoney(
                category.amount,
                state.settings.baseCurrency
              )}
            </strong>
          </div>

          <div class="top-category-track">
            <div
              class="top-category-fill"
              style="width:${width}%"
            ></div>
          </div>
        </article>
      `;
    }
  ).join("");
}

/* =========================================================
   BUDGET BURN RATE
   ========================================================= */

export function renderBudgetBurnRate(
  state
) {
  const container =
    $("#budgetBurnRate");

  if (!container) return;

  const budgets =
    state.budgets || [];

  if (!budgets.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>No budgets configured.</p>
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

      let className = "";

      if (percentage >= 100) {
        className = "danger";
      } else if (percentage >= 75) {
        className = "warn";
      }

      return `
        <div class="burn-rate-item">
          <div class="burn-rate-top">
            <strong>
              ${budget.emoji || "📦"}
              ${safeText(budget.category)}
            </strong>

            <span>
              ${Math.round(
                percentage
              )}%
            </span>
          </div>

          <div class="burn-rate-track">
            <div
              class="burn-rate-fill ${className}"
              style="width:${percentage}%"
            ></div>
          </div>
        </div>
      `;
    }
  ).join("");
}

/* =========================================================
   AI INSIGHTS
   ========================================================= */

export function renderInsights(state) {
  const banner =
    $("#aiInsightBanner");

  const list =
    $("#insightList");

  if (!banner || !list) return;

  const insights =
    generateAIInsights(state);

  if (!insights.length) {
    banner.textContent =
      "Start adding transactions to unlock AI-powered insights.";

    list.innerHTML = "";

    return;
  }

  const rotating =
    insights[
      Math.floor(
        Date.now() / 4000
      ) % insights.length
    ];

  banner.innerHTML = `
    <span>
      ${rotating.icon}
    </span>

    <span>
      ${safeText(rotating.message)}
    </span>
  `;

  list.innerHTML = insights.map(
    (insight) => {
      return `
        <article class="insight-item ${insight.type}">
          <div class="insight-icon">
            ${insight.icon}
          </div>

          <div>
            <strong>
              ${safeText(insight.title)}
            </strong>

            <p>
              ${safeText(insight.message)}
            </p>
          </div>

          <button
            class="insight-dismiss-btn"
            data-insight-id="${insight.id}"
          >
            ✕
          </button>
        </article>
      `;
    }
  ).join("");

  $$(".insight-dismiss-btn").forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          button
            .closest(".insight-item")
            ?.remove();
        }
      );
    }
  );
}

/* =========================================================
   QUOTES
   ========================================================= */

const QUOTES = [
  "A budget is telling your money where to go instead of wondering where it went.",
  "Small savings today create financial freedom tomorrow.",
  "Financial discipline beats financial stress.",
  "Every rupee saved is a step toward independence.",
  "Invest in your future before spending on impulse.",
];

function renderQuotes() {
  const element =
    $("#financeQuote");

  if (!element) return;

  const update = () => {
    const quote =
      QUOTES[
        Math.floor(
          Math.random() * QUOTES.length
        )
      ];

    element.classList.remove("show");

    setTimeout(() => {
      element.textContent = quote;

      element.classList.add("show");
    }, 200);
  };

  update();

  setInterval(update, 10000);
}

/* =========================================================
   50 / 30 / 20 RULE
   ========================================================= */

export function render503020Rule(
  state
) {
  const analysis =
    get503020Analysis(state);

  const needs =
    $("#ruleNeeds");

  const wants =
    $("#ruleWants");

  const savings =
    $("#ruleSavings");

  if (needs) {
    needs.style.strokeDashoffset =
      440 -
      (analysis.needs / 100) * 440;
  }

  if (wants) {
    wants.style.strokeDashoffset =
      440 -
      (analysis.wants / 100) * 440;
  }

  if (savings) {
    savings.style.strokeDashoffset =
      440 -
      (analysis.savings / 100) * 440;
  }

  const needsText =
    $("#ruleNeedsText");

  const wantsText =
    $("#ruleWantsText");

  const savingsText =
    $("#ruleSavingsText");

  if (needsText) {
    needsText.textContent =
      `${analysis.needs}%`;
  }

  if (wantsText) {
    wantsText.textContent =
      `${analysis.wants}%`;
  }

  if (savingsText) {
    savingsText.textContent =
      `${analysis.savings}%`;
  }
}

/* =========================================================
   NET WORTH
   ========================================================= */

export function renderNetWorth(
  state
) {
  const element =
    $("#netWorthValue");

  if (!element) return;

  const assets =
    state.settings.netWorth.assets.reduce(
      (sum, asset) =>
        sum +
        Number(asset.amount || 0),
      0
    );

  const liabilities =
    state.settings.netWorth.liabilities.reduce(
      (sum, liability) =>
        sum +
        Number(liability.amount || 0),
      0
    );

  const netWorth =
    assets - liabilities;

  animateNumber({
    element,
    start: 0,
    end: netWorth,
    duration: 1200,
    formatter: (number) =>
      formatMoney(
        number,
        state.settings.baseCurrency
      ),
  });
}

/* =========================================================
   SUBSCRIPTIONS WIDGET
   ========================================================= */

export function renderSubscriptionWidget(
  state
) {
  const total =
    getMonthlySubscriptionTotal(
      state
    );

  const element =
    $("#subscriptionTotal");

  if (!element) return;

  animateNumber({
    element,
    start: 0,
    end: total,
    duration: 1200,
    formatter: (number) =>
      formatMoney(
        number,
        state.settings.baseCurrency
      ),
  });
}

/* =========================================================
   THEME
   ========================================================= */

function bindThemeToggle() {
  const toggle =
    $("#themeToggle");

  toggle?.addEventListener(
    "click",
    () => {
      const html =
        document.documentElement;

      const current =
        html.dataset.theme ||
        "dark";

      const next =
        current === "dark"
          ? "light"
          : "dark";

      html.dataset.theme = next;

      localStorage.setItem(
        "financeflow_theme",
        next
      );

      updateThemeIcon(next);

      showToast({
        type: "success",
        title: "Theme Updated",
        message:
          next === "dark"
            ? "Dark mode enabled."
            : "Light mode enabled.",
        icon:
          next === "dark"
            ? "🌙"
            : "☀️",
      });
    }
  );
}

function renderTheme(state) {
  const theme =
    localStorage.getItem(
      "financeflow_theme"
    ) ||
    state.settings.theme ||
    "dark";

  document.documentElement.dataset.theme =
    theme;

  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  const icon =
    $("#themeIcon");

  if (!icon) return;

  icon.textContent =
    theme === "dark"
      ? "🌙"
      : "☀️";
}

/* =========================================================
   CURRENCY
   ========================================================= */

function renderCurrencyOptions(
  state
) {
  const select =
    $("#baseCurrencySelect");

  if (!select) return;

  select.innerHTML =
    CURRENCIES.map(
      (currency) => {
        return `
          <option
            value="${currency.code}"
            ${
              currency.code ===
              state.settings.baseCurrency
                ? "selected"
                : ""
            }
          >
            ${currency.code}
            (${currency.symbol})
          </option>
        `;
      }
    ).join("");
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function bindNavigation() {
  $$(".nav-link").forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          navigateTo(
            button.dataset.page
          );
        }
      );
    }
  );

  $$(".mobile-tab").forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          navigateTo(
            button.dataset.page
          );
        }
      );
    }
  );
}

export function navigateTo(page) {
  currentPage = page;

  $$(".page").forEach((section) => {
    section.classList.remove("active");
  });

  $$(".nav-link").forEach((button) => {
    button.classList.remove("active");
  });

  $$(".mobile-tab").forEach(
    (button) => {
      button.classList.remove("active");
    }
  );

  const section =
    document.querySelector(
      `#page-${page}`
    );

  section?.classList.add("active");

  document
    .querySelector(
      `.nav-link[data-page="${page}"]`
    )
    ?.classList.add("active");

  document
    .querySelector(
      `.mobile-tab[data-page="${page}"]`
    )
    ?.classList.add("active");

  updatePageTitle(page);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function updatePageTitle(page) {
  const title =
    $("#pageTitle");

  if (!title) return;

  const labels = {
    dashboard: "Dashboard",
    transactions:
      "Transactions",
    analytics: "Analytics",
    budget: "Budget",
    goals: "Savings Goals",
    subscriptions:
      "Subscriptions",
    reports: "Reports",
    settings: "Settings",
  };

  title.textContent =
    labels[page] || "FinanceFlow";
}

/* =========================================================
   KEYBOARD SHORTCUTS
   ========================================================= */

function bindKeyboardShortcuts() {
  let easterEggBuffer = "";

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.target.matches(
          "input, textarea, select"
        )
      ) {
        return;
      }

      const key =
        event.key.toLowerCase();

      if (key === "d") {
        navigateTo("dashboard");
      }

      if (key === "a") {
        navigateTo("analytics");
      }

      if (key === "n") {
        $("#quickAddFab")?.click();
      }

      if (key === "escape") {
        closeAllModals();
      }

      easterEggBuffer +=
        event.key.toUpperCase();

      if (
        easterEggBuffer.length > 12
      ) {
        easterEggBuffer =
          easterEggBuffer.slice(-12);
      }

      if (
        easterEggBuffer.includes(
          "FINANCEFLOW"
        )
      ) {
        triggerPowerUserMode();

        easterEggBuffer = "";
      }
    }
  );
}

/* =========================================================
   POWER USER MODE
   ========================================================= */

function triggerPowerUserMode() {
  if (window.confetti) {
    window.confetti({
      particleCount: 220,
      spread: 120,
      origin: {
        y: 0.6,
      },
    });
  }

  showToast({
    type: "success",
    title: "Power User Unlocked",
    message:
      "You discovered the hidden FinanceFlow easter egg.",
    icon: "🏆",
  });

  const badge =
    createEl(
      "div",
      "power-user-badge",
      `
        <span>⚡</span>
        <strong>POWER USER</strong>
      `
    );

  document.body.appendChild(
    badge
  );

  requestAnimationFrame(() => {
    badge.classList.add("show");
  });

  setTimeout(() => {
    badge.classList.remove(
      "show"
    );

    setTimeout(() => {
      badge.remove();
    }, 300);
  }, 3000);
}

/* =========================================================
   GLOBAL UI
   ========================================================= */

function bindGlobalUI() {
  const converterBtn =
    $("#currencyWidgetBtn");

  converterBtn?.addEventListener(
    "click",
    () => {
      toggleCurrencyWidget();
    }
  );
}

function toggleCurrencyWidget() {
  let widget =
    $("#currencyWidget");

  if (widget) {
    widget.classList.toggle("show");

    return;
  }

  widget = document.createElement("div");

  widget.id = "currencyWidget";

  widget.className =
    "currency-widget show";

  widget.innerHTML = `
    <div class="currency-widget-header">
      <h3>Currency Converter</h3>

      <button
        class="icon-btn"
        id="closeCurrencyWidget"
      >
        ✕
      </button>
    </div>

    <div class="currency-widget-body">
      <input
        type="number"
        id="currencyAmount"
        value="1000"
        placeholder="Amount"
      />

      <div class="currency-select-grid">
        <select id="currencyFrom">
          ${CURRENCIES.map(
            (currency) => `
              <option value="${currency.code}">
                ${currency.code}
              </option>
            `
          ).join("")}
        </select>

        <button
          class="swap-btn"
          id="swapCurrenciesBtn"
        >
          ⇄
        </button>

        <select id="currencyTo">
          ${CURRENCIES.map(
            (currency) => `
              <option
                value="${currency.code}"
                ${
                  currency.code === "USD"
                    ? "selected"
                    : ""
                }
              >
                ${currency.code}
              </option>
            `
          ).join("")}
        </select>
      </div>

      <div
        class="currency-converted-value"
        id="currencyConvertedValue"
      >
        —
      </div>

      <small>
        Exchange rates are approximate and static.
      </small>
    </div>
  `;

  document.body.appendChild(
    widget
  );

  bindCurrencyConverter();
}

function bindCurrencyConverter() {
  const amount =
    $("#currencyAmount");

  const from =
    $("#currencyFrom");

  const to =
    $("#currencyTo");

  const result =
    $("#currencyConvertedValue");

  const update =
    debounce(() => {
      const value =
        Number(amount.value || 0);

      const fromCode =
        from.value;

      const toCode =
        to.value;

      const state =
        getState();

      const converted =
        window.financeFlowUtils
          ?.convertCurrency
          ? window.financeFlowUtils.convertCurrency(
              value,
              fromCode,
              toCode
            )
          : value;

      result.textContent =
        formatMoney(
          converted,
          toCode
        );

      result.classList.add(
        "pulse"
      );

      setTimeout(() => {
        result.classList.remove(
          "pulse"
        );
      }, 300);
    }, 150);

  amount?.addEventListener(
    "input",
    update
  );

  from?.addEventListener(
    "change",
    update
  );

  to?.addEventListener(
    "change",
    update
  );

  $("#swapCurrenciesBtn")
    ?.addEventListener(
      "click",
      () => {
        const temp =
          from.value;

        from.value = to.value;

        to.value = temp;

        update();
      }
    );

  $("#closeCurrencyWidget")
    ?.addEventListener(
      "click",
      () => {
        $("#currencyWidget")
          ?.remove();
      }
    );

  update();
}

/* =========================================================
   SAVED INDICATOR
   ========================================================= */

function renderSavedStatus() {
  let indicator =
    $("#savedIndicator");

  if (indicator) return;

  indicator =
    document.createElement("div");

  indicator.id =
    "savedIndicator";

  indicator.className =
    "saved-indicator";

  indicator.innerHTML = `
    <span>✓</span>
    Saved
  `;

  document.body.appendChild(
    indicator
  );
}

/* =========================================================
   MODALS
   ========================================================= */

export function closeAllModals() {
  $$(".modal-overlay").forEach(
    (modal) => {
      modal.classList.remove(
        "show"
      );
    }
  );

  $("#currencyWidget")
    ?.classList.remove("show");
}

/* =========================================================
   EXPORTS
   ========================================================= */

export function getCurrentPage() {
  return currentPage;
}