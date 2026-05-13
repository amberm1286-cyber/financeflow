/* =========================================================
   FinanceFlow — Main Application Entry
   File: js/app.js
   ========================================================= */

/*
  FinanceFlow is a pure HTML/CSS/JavaScript fintech dashboard.
  This file is intentionally the final orchestration layer.

  Responsibilities:
  - boot app safely
  - initialize localStorage data
  - initialize UI, charts, notifications, sync, reports, and modules
  - connect global keyboard shortcuts
  - connect offline/online state
  - bridge older/newer DOM IDs safely
  - expose safe helpers for modules
  - prevent one broken module from killing the whole app
*/

/* =========================================================
   APP BOOT STATE
   ========================================================= */

const FinanceFlowApp = {
  name: "FinanceFlow",
  version: "1.0.0",
  booted: false,
  modules: {},
  failedModules: [],
  bootStartedAt: performance.now(),
};

/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  bootFinanceFlow();
});

/* =========================================================
   MAIN BOOT
   ========================================================= */

async function bootFinanceFlow() {
  if (FinanceFlowApp.booted) return;

  try {
    setBootingState(true);

    bridgeLegacyDomIds();

    createMissingMobileTabbar();

    createGlobalSafetyElements();

    await loadCoreModules();

    await initializeDataLayer();

    exposeGlobalHelpers();

    await initializeCoreSystems();

    await initializeFeatureModules();

    bindGlobalAppEvents();

    bindGlobalKeyboardShortcuts();

    bindNetworkEvents();

    bindModalSafety();

    bindCurrencyDrawerFallback();

    bindSettingsFallbacks();

    bindReportFallbacks();

    runStartupAnimations();

    showStartupWelcome();

    FinanceFlowApp.booted = true;

    window.FinanceFlowApp = FinanceFlowApp;

    console.log(
      `%c✅ FinanceFlow v${FinanceFlowApp.version} booted successfully`,
      "color:#00FFB2;font-weight:900;"
    );
  } catch (error) {
    console.error("FinanceFlow boot failed:", error);

    showBootError(error);
  } finally {
    setBootingState(false);
  }
}

/* =========================================================
   DYNAMIC MODULE LOADER
   ========================================================= */

async function loadCoreModules() {
  const moduleMap = {
    config: "./config.js",
    utils: "./utils.js",
    dataManager: "./dataManager.js",
    analyticsEngine: "./analyticsEngine.js",
    chartManager: "./chartManager.js",
    notificationSystem: "./notificationSystem.js",
    syncManager: "./syncManager.js",
    pdfExporter: "./pdfExporter.js",
    uiManager: "./uiManager.js",
  };

  for (const [key, path] of Object.entries(moduleMap)) {
    try {
      FinanceFlowApp.modules[key] = await import(path);
    } catch (error) {
      FinanceFlowApp.failedModules.push({
        key,
        path,
        error,
      });

      console.error(`Failed to load ${key}:`, error);
    }
  }
}

async function initializeDataLayer() {
  const dataManager = FinanceFlowApp.modules.dataManager;

  if (!dataManager?.initData) {
    throw new Error("Data Manager failed to load. App cannot continue.");
  }

  const state = dataManager.initData();

  normalizeStateShape(state);

  return state;
}

async function initializeCoreSystems() {
  const notificationSystem = FinanceFlowApp.modules.notificationSystem;
  const syncManager = FinanceFlowApp.modules.syncManager;
  const pdfExporter = FinanceFlowApp.modules.pdfExporter;
  const uiManager = FinanceFlowApp.modules.uiManager;

  safeInit("Notification System", () => {
    notificationSystem?.initNotificationSystem?.();
  });

  safeInit("Sync Manager", () => {
    syncManager?.initSyncManager?.();
  });

  safeInit("PDF Exporter", () => {
    pdfExporter?.initPDFExporter?.();
  });

  safeInit("UI Manager", () => {
    uiManager?.initUIManager?.();
  });
}

async function initializeFeatureModules() {
  const featureModules = [
    {
      key: "dashboardModule",
      path: "./modules/dashboard.js",
      init: "initDashboardModule",
    },
    {
      key: "transactionsModule",
      path: "./modules/transactions.js",
      init: "initTransactionsModule",
    },
    {
      key: "analyticsModule",
      path: "./modules/analytics.js",
      init: "initAnalyticsModule",
    },
    {
      key: "budgetModule",
      path: "./modules/budget.js",
      init: "initBudgetModule",
    },
    {
      key: "goalsModule",
      path: "./modules/goals.js",
      init: "initGoalsModule",
    },
    {
      key: "subscriptionsModule",
      path: "./modules/subscriptions.js",
      init: "initSubscriptionsModule",
    },
    {
      key: "reportsModule",
      path: "./modules/reports.js",
      init: "initReportsModule",
    },
    {
      key: "settingsModule",
      path: "./modules/settings.js",
      init: "initSettingsModule",
    },
  ];

  for (const moduleConfig of featureModules) {
    try {
      const loadedModule = await import(moduleConfig.path);

      FinanceFlowApp.modules[moduleConfig.key] = loadedModule;

      loadedModule?.[moduleConfig.init]?.();
    } catch (error) {
      FinanceFlowApp.failedModules.push({
        key: moduleConfig.key,
        path: moduleConfig.path,
        error,
      });

      console.error(`Failed to initialize ${moduleConfig.key}:`, error);

      showSoftWarning(
        `${moduleConfig.key.replace("Module", "")} module could not start. Other parts of FinanceFlow will continue working.`
      );
    }
  }
}

function safeInit(name, callback) {
  try {
    callback();
  } catch (error) {
    FinanceFlowApp.failedModules.push({
      key: name,
      error,
    });

    console.error(`${name} failed:`, error);

    showSoftWarning(`${name} could not start safely.`);
  }
}

/* =========================================================
   STATE NORMALIZATION
   ========================================================= */

function normalizeStateShape(state) {
  if (!state) return;

  const dataManager = FinanceFlowApp.modules.dataManager;

  const normalized = {
    ...state,
    settings: {
      name: state.settings?.name || "Amber",
      avatar: state.settings?.avatar || "🧑‍💻",
      monthlyIncome: Number(state.settings?.monthlyIncome || 50000),
      baseCurrency: state.settings?.baseCurrency || "INR",
      theme: state.settings?.theme || "dark",
      language: state.settings?.language || "en",
      notifications: {
        budgetWarnings: state.settings?.notifications?.budgetWarnings ?? true,
        billReminders: state.settings?.notifications?.billReminders ?? true,
        weeklySummary: state.settings?.notifications?.weeklySummary ?? true,
      },
      netWorth: {
        assets: state.settings?.netWorth?.assets || [],
        liabilities: state.settings?.netWorth?.liabilities || [],
      },
    },
    categories: Array.isArray(state.categories) ? state.categories : [],
    transactions: Array.isArray(state.transactions) ? state.transactions : [],
    budgets: Array.isArray(state.budgets) ? state.budgets : [],
    goals: Array.isArray(state.goals) ? state.goals : [],
    subscriptions: Array.isArray(state.subscriptions) ? state.subscriptions : [],
    notifications: Array.isArray(state.notifications) ? state.notifications : [],
    scoreHistory: Array.isArray(state.scoreHistory) ? state.scoreHistory : [],
    updatedAt: state.updatedAt || new Date().toISOString(),
  };

  normalized.budgets = normalized.budgets.map((budget) => ({
    ...budget,
    amount: Number(budget.amount ?? budget.limit ?? 0),
    limit: Number(budget.limit ?? budget.amount ?? 0),
    month:
      budget.month ||
      new Date().toISOString().slice(0, 7),
    warningsTriggered: budget.warningsTriggered || [],
  }));

  normalized.subscriptions = normalized.subscriptions.map((subscription) => ({
    ...subscription,
    name: subscription.name || subscription.service || "Subscription",
    service: subscription.service || subscription.name || "Subscription",
    billingCycle: subscription.billingCycle || subscription.cycle || "monthly",
    cycle: subscription.cycle || subscription.billingCycle || "monthly",
  }));

  dataManager?.setState?.(normalized, {
    notify: false,
    event: "app:normalized",
  });
}

/* =========================================================
   GLOBAL HELPERS FOR MODULES
   ========================================================= */

function exposeGlobalHelpers() {
  const utils = FinanceFlowApp.modules.utils;
  const config = FinanceFlowApp.modules.config;

  window.financeFlowUtils = {
    ...(window.financeFlowUtils || {}),

    convertCurrency:
      utils?.convertCurrency ||
      ((amount) => Number(amount) || 0),

    formatMoney:
      utils?.formatMoney ||
      ((amount, currency = "INR") => `${currency} ${Number(amount || 0)}`),

    getCurrency:
      utils?.getCurrency ||
      ((code = "INR") => ({ code, symbol: code })),

    safeText:
      utils?.safeText ||
      ((value) => String(value ?? "")),

    downloadBlob:
      utils?.downloadBlob ||
      downloadBlobFallback,
  };

  window.FinanceFlowConfig = {
    ...(config || {}),
  };
}

/* =========================================================
   DOM ID BRIDGE
   ========================================================= */

function bridgeLegacyDomIds() {
  const aliases = {
    addTransactionBtn: "openTransactionModalBtn",
    addSubscriptionBtn: "openSubscriptionModalBtn",
    exportMonthReportBtn: "exportMonthBtn",
    exportCustomReportBtn: "exportCustomBtn",
    exportCustomReportBtnAlt: "exportCustomBtn",
    reportStartDate: "reportCustomStart",
    reportEndDate: "reportCustomEnd",
    settingName: "settingsName",
    settingAvatar: "settingsAvatar",
    settingIncome: "settingsMonthlyIncome",
    baseCurrencySelect: "settingsBaseCurrency",
    themeSelect: "settingsTheme",
    languageSelect: "settingsLanguage",
    notifyBudget: "settingsBudgetWarnings",
    notifyBills: "settingsBillReminders",
    notifyWeekly: "settingsWeeklySummary",
    exportJsonBtn: "exportAllDataBtn",
    importJsonInput: "importAllDataInput",
    resetDemoBtn: "resetDemoDataBtn",
    clearDataBtn: "clearAllDataBtn",
    addCategoryBtn: "addCategorySubmitBtn",
    subscriptionIncomeRatio: "subscriptionIncomePercent",
  };

  Object.entries(aliases).forEach(([existingId, expectedId]) => {
    const existing = document.getElementById(existingId);
    const expected = document.getElementById(expectedId);

    if (existing && !expected) {
      existing.dataset.originalId = existingId;
      existing.id = expectedId;
    }
  });

  ensureFormWrapper("settingsProfileForm", [
    "settingsName",
    "settingsAvatar",
    "settingsMonthlyIncome",
  ]);

  ensureFormWrapper("addCategoryForm", [
    "newCategoryName",
    "newCategoryEmoji",
    "newCategoryColor",
    "newCategoryType",
    "addCategorySubmitBtn",
  ]);

  ensureButtonType("addCategorySubmitBtn", "submit");
}

function ensureFormWrapper(formId, childIds = []) {
  if (document.getElementById(formId)) return;

  const children = childIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!children.length) return;

  const first = children[0];

  if (!first.parentElement) return;

  const form = document.createElement("form");
  form.id = formId;
  form.className = "settings-inline-form";

  first.parentElement.insertBefore(form, first);

  children.forEach((child) => {
    form.appendChild(child);
  });
}

function ensureButtonType(id, type) {
  const button = document.getElementById(id);
  if (button && button.tagName === "BUTTON") {
    button.type = type;
  }
}

/* =========================================================
   MOBILE TABBAR
   ========================================================= */

function createMissingMobileTabbar() {
  if (document.querySelector(".mobile-tabbar")) return;

  const pages = [
    ["dashboard", "🏠", "Home"],
    ["transactions", "💸", "Txns"],
    ["analytics", "📊", "Data"],
    ["budget", "💰", "Budget"],
    ["settings", "⚙️", "More"],
  ];

  const tabbar = document.createElement("nav");
  tabbar.className = "mobile-tabbar";
  tabbar.setAttribute("aria-label", "Mobile navigation");

  tabbar.innerHTML = pages
    .map(
      ([page, icon, label], index) => `
        <button
          class="mobile-tab ${index === 0 ? "active" : ""}"
          data-page="${page}"
          aria-label="${label}"
        >
          ${icon}
          <span>${label}</span>
        </button>
      `
    )
    .join("");

  document.body.appendChild(tabbar);
}

/* =========================================================
   GLOBAL SAFETY ELEMENTS
   ========================================================= */

function createGlobalSafetyElements() {
  if (!document.getElementById("appBootOverlay")) {
    const overlay = document.createElement("div");

    overlay.id = "appBootOverlay";
    overlay.className = "app-boot-overlay";

    overlay.innerHTML = `
      <div class="app-boot-card">
        <div class="app-boot-logo">💸</div>
        <strong>FinanceFlow</strong>
        <span>Starting budget intelligence...</span>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  if (!document.getElementById("appStatusBanner")) {
    const banner = document.createElement("div");

    banner.id = "appStatusBanner";
    banner.className = "app-status-banner";

    document.body.appendChild(banner);
  }

  injectAppStyles();
}

function setBootingState(isBooting) {
  const overlay = document.getElementById("appBootOverlay");

  if (!overlay) return;

  if (isBooting) {
    overlay.classList.add("show");
  } else {
    setTimeout(() => {
      overlay.classList.remove("show");
    }, 450);
  }
}

/* =========================================================
   GLOBAL EVENTS
   ========================================================= */

function bindGlobalAppEvents() {
  const dataManager = FinanceFlowApp.modules.dataManager;

  window.addEventListener("financeflow:datachange", (event) => {
    updateDocumentTitle(event.detail?.state);

    pulseSavedIndicator();

    refreshChartsSafely(event.detail?.state);
  });

  window.addEventListener("financeflow:saved", () => {
    pulseSavedIndicator();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshApp();
    }
  });

  window.addEventListener("beforeunload", () => {
    const state = dataManager?.getState?.();

    if (state) {
      localStorage.setItem(
        "financeflow_last_session",
        new Date().toISOString()
      );
    }
  });
}

function refreshApp() {
  const state = FinanceFlowApp.modules.dataManager?.getState?.();

  if (!state) return;

  FinanceFlowApp.modules.uiManager?.renderApp?.(state);
  FinanceFlowApp.modules.chartManager?.renderAllCharts?.(state);
}

/* =========================================================
   KEYBOARD SHORTCUTS
   ========================================================= */

function bindGlobalKeyboardShortcuts() {
  let secretBuffer = "";

  document.addEventListener("keydown", (event) => {
    const target = event.target;

    const isTyping =
      target &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);

    if (!isTyping) {
      const key = event.key.toLowerCase();

      if (key === "d") {
        navigateFallback("dashboard");
      }

      if (key === "a") {
        navigateFallback("analytics");
      }

      if (key === "n") {
        event.preventDefault();
        clickAny(["quickAddFab", "openTransactionModalBtn", "addTransactionBtn"]);
      }

      if (event.key === "Escape") {
        closeAllOverlays();
      }
    }

    secretBuffer += event.key.toUpperCase();

    if (secretBuffer.length > 16) {
      secretBuffer = secretBuffer.slice(-16);
    }

    if (secretBuffer.includes("FINANCEFLOW")) {
      triggerPowerUserUnlock();
      secretBuffer = "";
    }
  });
}

/* =========================================================
   NAVIGATION FALLBACK
   ========================================================= */

function navigateFallback(page) {
  const uiManager = FinanceFlowApp.modules.uiManager;

  if (uiManager?.navigateTo) {
    uiManager.navigateTo(page);
    return;
  }

  document.querySelectorAll(".page").forEach((section) => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".nav-link, .mobile-tab").forEach((button) => {
    button.classList.remove("active");
  });

  document.getElementById(`page-${page}`)?.classList.add("active");

  document
    .querySelector(`.nav-link[data-page="${page}"]`)
    ?.classList.add("active");

  document
    .querySelector(`.mobile-tab[data-page="${page}"]`)
    ?.classList.add("active");

  const title = document.getElementById("pageTitle");

  if (title) {
    title.textContent = page
      .split("-")
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

/* =========================================================
   NETWORK STATE
   ========================================================= */

function bindNetworkEvents() {
  window.addEventListener("online", () => {
    showSoftSuccess("Back online. FinanceFlow remains local-first and synced.");
  });

  window.addEventListener("offline", () => {
    showSoftWarning("You are offline. FinanceFlow still works with local data.");
  });

  if (!navigator.onLine) {
    showSoftWarning("Offline mode active. All data is saved locally.");
  }
}

/* =========================================================
   MODAL SAFETY
   ========================================================= */

function bindModalSafety() {
  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest(
      ".modal-close-btn, #closeModalBtn, [data-close-modal]"
    );

    if (closeButton) {
      closeAllOverlays();
    }

    if (event.target.classList.contains("modal-overlay")) {
      event.target.classList.remove("show");
      event.target.remove();
    }
  });
}

function closeAllOverlays() {
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.classList.remove("show");

    if (
      modal.id !== "overspendModal" &&
      modal.id !== "modalBackdrop"
    ) {
      setTimeout(() => modal.remove(), 160);
    }
  });

  document.querySelectorAll(".notification-drawer.open").forEach((drawer) => {
    drawer.classList.remove("open");
  });

  document.querySelectorAll(".currency-widget.show").forEach((widget) => {
    widget.classList.remove("show");
  });

  document.getElementById("currencyDrawer")?.classList.remove("open");

  document.body.style.overflow = "";
}

/* =========================================================
   CURRENCY DRAWER FALLBACK
   ========================================================= */

function bindCurrencyDrawerFallback() {
  const config = FinanceFlowApp.modules.config;
  const utils = FinanceFlowApp.modules.utils;

  const currencies = config?.CURRENCIES || [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
  ];

  const amount = document.getElementById("currencyAmount");
  const from = document.getElementById("currencyFrom");
  const to = document.getElementById("currencyTo");
  const result = document.getElementById("currencyResult");

  if (from && !from.children.length) {
    from.innerHTML = currencies
      .map((currency) => `<option value="${currency.code}">${currency.code}</option>`)
      .join("");
  }

  if (to && !to.children.length) {
    to.innerHTML = currencies
      .map(
        (currency) => `
          <option value="${currency.code}" ${currency.code === "USD" ? "selected" : ""}>
            ${currency.code}
          </option>
        `
      )
      .join("");
  }

  const update = () => {
    if (!amount || !from || !to || !result) return;

    const converted =
      utils?.convertCurrency?.(
        Number(amount.value || 0),
        from.value,
        to.value
      ) || Number(amount.value || 0);

    result.textContent =
      utils?.formatMoney?.(converted, to.value) ||
      `${to.value} ${Math.round(converted)}`;
  };

  amount?.addEventListener("input", update);
  from?.addEventListener("change", update);
  to?.addEventListener("change", update);

  document.getElementById("currencyWidgetBtn")?.addEventListener("click", () => {
    const drawer = document.getElementById("currencyDrawer");

    if (drawer) {
      drawer.classList.add("open");
      update();
    }
  });

  document.getElementById("closeCurrencyDrawer")?.addEventListener("click", () => {
    document.getElementById("currencyDrawer")?.classList.remove("open");
  });

  document.getElementById("swapCurrencyBtn")?.addEventListener("click", () => {
    if (!from || !to) return;

    const temp = from.value;
    from.value = to.value;
    to.value = temp;

    update();

    const drawer = document.getElementById("currencyDrawer");
    drawer?.classList.add("flip");

    setTimeout(() => drawer?.classList.remove("flip"), 450);
  });

  update();
}

/* =========================================================
   SETTINGS FALLBACKS
   ========================================================= */

function bindSettingsFallbacks() {
  const dataManager = FinanceFlowApp.modules.dataManager;

  document.getElementById("saveProfileBtn")?.addEventListener("click", () => {
    const state = dataManager?.getState?.();
    if (!state) return;

    const nextState = {
      ...state,
      settings: {
        ...state.settings,
        name:
          document.getElementById("settingsName")?.value ||
          state.settings.name,
        avatar:
          document.getElementById("settingsAvatar")?.value ||
          state.settings.avatar,
        monthlyIncome:
          Number(document.getElementById("settingsMonthlyIncome")?.value || 0) ||
          state.settings.monthlyIncome,
      },
    };

    dataManager.setState(nextState, {
      event: "settings:profileFallback",
    });

    showSoftSuccess("Profile saved.");
  });

  document.getElementById("savePreferencesBtn")?.addEventListener("click", () => {
    const state = dataManager?.getState?.();
    if (!state) return;

    const theme = document.getElementById("settingsTheme")?.value || "dark";

    const nextState = {
      ...state,
      settings: {
        ...state.settings,
        baseCurrency:
          document.getElementById("settingsBaseCurrency")?.value ||
          state.settings.baseCurrency,
        theme,
        language:
          document.getElementById("settingsLanguage")?.value ||
          "en",
        notifications: {
          budgetWarnings:
            document.getElementById("settingsBudgetWarnings")?.checked ?? true,
          billReminders:
            document.getElementById("settingsBillReminders")?.checked ?? true,
          weeklySummary:
            document.getElementById("settingsWeeklySummary")?.checked ?? true,
        },
      },
    };

    document.documentElement.dataset.theme = theme === "system"
      ? getSystemTheme()
      : theme;

    localStorage.setItem("financeflow_theme", theme);

    dataManager.setState(nextState, {
      event: "settings:preferencesFallback",
    });

    showSoftSuccess("Preferences saved.");
  });
}

/* =========================================================
   REPORT FALLBACKS
   ========================================================= */

function bindReportFallbacks() {
  const pdfExporter = FinanceFlowApp.modules.pdfExporter;

  const monthButton =
    document.getElementById("exportMonthBtn") ||
    document.getElementById("exportMonthReportBtn");

  const customButton =
    document.getElementById("exportCustomBtn") ||
    document.getElementById("exportCustomReportBtn");

  monthButton?.addEventListener("click", async () => {
    if (pdfExporter?.exportMonthlyReport) {
      await pdfExporter.exportMonthlyReport();
      return;
    }

    simpleJsonReportFallback("month");
  });

  customButton?.addEventListener("click", async () => {
    if (pdfExporter?.exportCustomRangeReport) {
      await pdfExporter.exportCustomRangeReport();
      return;
    }

    simpleJsonReportFallback("custom");
  });
}

function simpleJsonReportFallback(type) {
  const state = FinanceFlowApp.modules.dataManager?.getState?.();

  if (!state) return;

  const blob = new Blob(
    [
      JSON.stringify(
        {
          type,
          generatedAt: new Date().toISOString(),
          app: "FinanceFlow",
          state,
        },
        null,
        2
      ),
    ],
    {
      type: "application/json",
    }
  );

  downloadBlobFallback(
    blob,
    `financeflow-${type}-report-${new Date().toISOString().slice(0, 10)}.json`
  );

  showSoftSuccess("Report fallback exported as JSON.");
}

/* =========================================================
   STARTUP ANIMATIONS
   ========================================================= */

function runStartupAnimations() {
  document.body.classList.add("financeflow-ready");

  const cards = document.querySelectorAll(
    ".stat-card, .glass-card, .summary-grid > *, .dashboard-grid > *"
  );

  cards.forEach((card, index) => {
    card.style.animationDelay = `${Math.min(index * 45, 600)}ms`;
    card.classList.add("app-card-enter");
  });

  setTimeout(() => {
    cards.forEach((card) => {
      card.classList.remove("app-card-enter");
      card.style.animationDelay = "";
    });
  }, 1800);
}

function showStartupWelcome() {
  const state = FinanceFlowApp.modules.dataManager?.getState?.();

  const lastSession = localStorage.getItem("financeflow_last_session");

  if (sessionStorage.getItem("financeflow_welcomed_this_session")) return;

  sessionStorage.setItem("financeflow_welcomed_this_session", "true");

  if (lastSession) {
    showSoftSuccess("Welcome back. FinanceFlow is synced and ready.");
  } else {
    showSoftSuccess(`Welcome to FinanceFlow, ${state?.settings?.name || "User"}.`);
  }
}

/* =========================================================
   CHART REFRESH
   ========================================================= */

function refreshChartsSafely(state) {
  if (!state) return;

  window.clearTimeout(refreshChartsSafely.timer);

  refreshChartsSafely.timer = window.setTimeout(() => {
    try {
      FinanceFlowApp.modules.chartManager?.renderAllCharts?.(state);
    } catch (error) {
      console.warn("Chart refresh skipped:", error);
    }
  }, 120);
}

/* =========================================================
   NOTIFICATION FALLBACKS
   ========================================================= */

function showSoftSuccess(message) {
  const notificationSystem = FinanceFlowApp.modules.notificationSystem;

  if (notificationSystem?.showToast) {
    notificationSystem.showToast({
      type: "success",
      title: "FinanceFlow",
      message,
      icon: "✅",
    });

    return;
  }

  showStatusBanner(message, "success");
}

function showSoftWarning(message) {
  const notificationSystem = FinanceFlowApp.modules.notificationSystem;

  if (notificationSystem?.showToast) {
    notificationSystem.showToast({
      type: "warning",
      title: "FinanceFlow Notice",
      message,
      icon: "⚠️",
      persist: false,
    });

    return;
  }

  showStatusBanner(message, "warning");
}

function showStatusBanner(message, type = "info") {
  const banner = document.getElementById("appStatusBanner");

  if (!banner) return;

  banner.className = `app-status-banner show ${type}`;
  banner.textContent = message;

  window.clearTimeout(showStatusBanner.timer);

  showStatusBanner.timer = window.setTimeout(() => {
    banner.classList.remove("show");
  }, 3600);
}

/* =========================================================
   SAVED INDICATOR
   ========================================================= */

function pulseSavedIndicator() {
  const indicator = document.getElementById("savedIndicator");

  if (!indicator) return;

  indicator.classList.add("show");

  window.clearTimeout(pulseSavedIndicator.timer);

  pulseSavedIndicator.timer = window.setTimeout(() => {
    indicator.classList.remove("show");
  }, 900);
}

/* =========================================================
   DOCUMENT TITLE
   ========================================================= */

function updateDocumentTitle(state) {
  if (!state) return;

  const unread = (state.notifications || []).filter((item) => !item.read).length;

  document.title = unread
    ? `(${unread}) FinanceFlow | Smart Personal Finance Platform`
    : "FinanceFlow | Smart Personal Finance Platform";
}

/* =========================================================
   POWER USER EASTER EGG
   ========================================================= */

function triggerPowerUserUnlock() {
  if (typeof window.confetti === "function") {
    window.confetti({
      particleCount: 240,
      spread: 130,
      origin: {
        y: 0.65,
      },
    });
  }

  const badge = document.createElement("div");

  badge.className = "power-user-unlock";

  badge.innerHTML = `
    <span>⚡</span>
    <strong>POWER USER UNLOCKED</strong>
    <small>FinanceFlow master mode activated</small>
  `;

  document.body.appendChild(badge);

  requestAnimationFrame(() => badge.classList.add("show"));

  setTimeout(() => {
    badge.classList.remove("show");

    setTimeout(() => badge.remove(), 320);
  }, 3300);

  showSoftSuccess("Power User Unlocked.");
}

/* =========================================================
   BOOT ERROR
   ========================================================= */

function showBootError(error) {
  const overlay = document.getElementById("appBootOverlay");

  if (!overlay) return;

  overlay.classList.add("show", "error");

  overlay.innerHTML = `
    <div class="app-boot-card error">
      <div class="app-boot-logo">⚠️</div>
      <strong>FinanceFlow could not start</strong>
      <span>${escapeHTML(error?.message || "Unknown startup error")}</span>
      <button class="btn btn-primary" id="reloadFinanceFlowBtn">
        Reload App
      </button>
    </div>
  `;

  document.getElementById("reloadFinanceFlowBtn")?.addEventListener("click", () => {
    window.location.reload();
  });
}

/* =========================================================
   SMALL HELPERS
   ========================================================= */

function clickAny(ids = []) {
  for (const id of ids) {
    const element = document.getElementById(id);

    if (element) {
      element.click();
      return true;
    }
  }

  return false;
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadBlobFallback(blob, filename = "financeflow-export.json") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}

/* =========================================================
   STYLE INJECTION
   ========================================================= */

function injectAppStyles() {
  if (document.getElementById("financeFlowAppStyles")) return;

  const style = document.createElement("style");

  style.id = "financeFlowAppStyles";

  style.textContent = `
    .app-boot-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at 30% 20%, rgba(79,142,247,0.2), transparent 34%),
        radial-gradient(circle at 72% 20%, rgba(124,58,237,0.22), transparent 34%),
        rgba(10, 15, 30, 0.92);
      backdrop-filter: blur(22px);
      -webkit-backdrop-filter: blur(22px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 320ms ease;
    }

    .app-boot-overlay.show {
      opacity: 1;
      pointer-events: auto;
    }

    .app-boot-card {
      width: min(380px, calc(100vw - 32px));
      padding: 28px;
      border-radius: 30px;
      border: 1px solid var(--border);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05)),
        rgba(10,15,30,0.9);
      box-shadow: var(--shadow);
      text-align: center;
      display: grid;
      gap: 10px;
      justify-items: center;
    }

    html[data-theme="light"] .app-boot-card {
      background: rgba(255,255,255,0.94);
    }

    .app-boot-logo {
      width: 74px;
      height: 74px;
      display: grid;
      place-items: center;
      border-radius: 26px;
      background: var(--gradient-main);
      box-shadow: var(--glow-blue);
      font-size: 2rem;
      animation: appBootFloat 1.6s ease-in-out infinite;
    }

    .app-boot-card strong {
      font-size: 1.5rem;
      letter-spacing: -0.05em;
    }

    .app-boot-card span {
      color: var(--text-soft);
      font-weight: 800;
      line-height: 1.5;
    }

    .app-boot-card.error {
      border-color: rgba(255,71,87,0.35);
      box-shadow: var(--shadow), 0 0 35px rgba(255,71,87,0.18);
    }

    @keyframes appBootFloat {
      0%, 100% {
        transform: translateY(0) scale(1);
      }

      50% {
        transform: translateY(-6px) scale(1.04);
      }
    }

    .app-status-banner {
      position: fixed;
      top: 18px;
      left: 50%;
      z-index: 6000;
      transform: translate(-50%, -18px);
      min-width: min(420px, calc(100vw - 24px));
      padding: 13px 16px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06)),
        rgba(10,15,30,0.9);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: var(--shadow-soft);
      color: var(--text);
      text-align: center;
      font-weight: 900;
      opacity: 0;
      pointer-events: none;
      transition:
        opacity 260ms ease,
        transform 260ms ease;
    }

    html[data-theme="light"] .app-status-banner {
      background: rgba(255,255,255,0.94);
    }

    .app-status-banner.show {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    .app-status-banner.success {
      border-color: rgba(0,255,178,0.24);
      box-shadow: var(--shadow-soft), 0 0 24px rgba(0,255,178,0.14);
    }

    .app-status-banner.warning {
      border-color: rgba(255,209,102,0.28);
      box-shadow: var(--shadow-soft), 0 0 24px rgba(255,209,102,0.14);
    }

    .financeflow-ready .brand-logo {
      animation: appBrandReady 900ms ease both;
    }

    @keyframes appBrandReady {
      from {
        transform: scale(0.92) rotate(-4deg);
      }

      to {
        transform: scale(1) rotate(0deg);
      }
    }

    .app-card-enter {
      animation: appCardEnter 680ms cubic-bezier(0.2,0.8,0.2,1) both;
    }

    @keyframes appCardEnter {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.98);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .currency-drawer {
      position: fixed;
      right: 20px;
      top: 100px;
      z-index: 3500;
      width: min(380px, calc(100vw - 32px));
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: 28px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05)),
        rgba(10,15,30,0.92);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow: var(--shadow);
      opacity: 0;
      pointer-events: none;
      transform: translateY(-12px) scale(0.96);
      transition:
        opacity 260ms ease,
        transform 260ms ease;
    }

    html[data-theme="light"] .currency-drawer {
      background: rgba(255,255,255,0.94);
    }

    .currency-drawer.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .currency-drawer.flip {
      animation: currencyFlip 440ms ease;
    }

    @keyframes currencyFlip {
      0% {
        transform: rotateY(0deg);
      }

      50% {
        transform: rotateY(8deg) scale(1.02);
      }

      100% {
        transform: rotateY(0deg);
      }
    }

    .power-user-unlock {
      position: fixed;
      left: 50%;
      top: 50%;
      z-index: 8000;
      width: min(390px, calc(100vw - 32px));
      padding: 26px;
      border: 1px solid rgba(0,255,178,0.28);
      border-radius: 32px;
      background:
        radial-gradient(circle at top left, rgba(0,255,178,0.18), transparent 38%),
        linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05)),
        rgba(10,15,30,0.94);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow:
        var(--shadow),
        0 0 38px rgba(0,255,178,0.18);
      text-align: center;
      display: grid;
      gap: 8px;
      justify-items: center;
      opacity: 0;
      transform: translate(-50%, -42%) scale(0.9);
      pointer-events: none;
      transition:
        opacity 320ms ease,
        transform 320ms cubic-bezier(0.2,0.8,0.2,1);
    }

    .power-user-unlock.show {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }

    .power-user-unlock span {
      width: 70px;
      height: 70px;
      border-radius: 25px;
      display: grid;
      place-items: center;
      background: var(--gradient-green);
      color: #06111f;
      font-size: 2rem;
      box-shadow: 0 0 28px rgba(0,255,178,0.28);
    }

    .power-user-unlock strong {
      font-size: 1.35rem;
      letter-spacing: -0.05em;
    }

    .power-user-unlock small {
      color: var(--text-soft);
      font-weight: 850;
    }

    @media (max-width: 760px) {
      .app-status-banner {
        top: 12px;
        border-radius: 22px;
      }

      .currency-drawer {
        left: 12px;
        right: 12px;
        top: 88px;
        width: auto;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   FINAL FAB CLICK FALLBACK
   ========================================================= */

document.addEventListener("click", (event) => {
  const fab = event.target.closest("#quickAddFab");

  if (!fab) return;

  event.preventDefault();

  const existingModal = document.getElementById("quickTransactionModal");

  if (existingModal) {
    existingModal.classList.add("show");
    return;
  }

  const addButton =
    document.getElementById("openTransactionModalBtn") ||
    document.getElementById("addTransactionBtn");

  if (addButton) {
    addButton.click();
  }
});