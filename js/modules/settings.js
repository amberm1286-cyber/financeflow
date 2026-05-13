/* =========================================================
   FinanceFlow — Settings Module
   File: js/modules/settings.js
   ========================================================= */

import {
  APP_CONFIG,
  CURRENCIES,
  DEFAULT_CATEGORIES,
} from "../config.js";

import {
  $,
  $$,
  safeText,
  formatMoney,
  uid,
  downloadBlob,
  debounce,
} from "../utils.js";

import {
  getState,
  setState,
  subscribe,
  createDemoState,
} from "../dataManager.js";

import {
  showToast,
  notifySettingsSaved,
} from "../notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let initialized = false;

/* =========================================================
   INIT
   ========================================================= */

export function initSettingsModule() {
  if (initialized) return;

  bindSettingsEvents();

  renderSettingsPage(getState());

  subscribe((state) => {
    renderSettingsPage(state);
  });

  initialized = true;

  console.log("⚙️ Settings Module Initialized");
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderSettingsPage(state) {
  renderProfileSettings(state);
  renderPreferenceSettings(state);
  renderCategoryManager(state);
  renderNetWorthManager(state);
  renderDataManagement(state);
  renderAboutSection();
}

/* =========================================================
   PROFILE SETTINGS
   ========================================================= */

function renderProfileSettings(state) {
  setValue("#settingsName", state.settings.name || "");
  setValue("#settingsAvatar", state.settings.avatar || "🧑‍💻");
  setValue("#settingsMonthlyIncome", state.settings.monthlyIncome || 0);

  const previewName = $("#settingsPreviewName");
  const previewAvatar = $("#settingsPreviewAvatar");

  if (previewName) previewName.textContent = state.settings.name || "User";
  if (previewAvatar) previewAvatar.textContent = state.settings.avatar || "🧑‍💻";
}

/* =========================================================
   PREFERENCES
   ========================================================= */

function renderPreferenceSettings(state) {
  const currencySelect = $("#settingsBaseCurrency");

  if (currencySelect) {
    currencySelect.innerHTML = CURRENCIES.map((currency) => {
      return `
        <option
          value="${currency.code}"
          ${currency.code === state.settings.baseCurrency ? "selected" : ""}
        >
          ${currency.code} — ${currency.name}
        </option>
      `;
    }).join("");
  }

  setValue("#settingsTheme", state.settings.theme || "dark");
  setValue("#settingsLanguage", state.settings.language || "en");

  setChecked(
    "#settingsBudgetWarnings",
    state.settings.notifications?.budgetWarnings ?? true
  );

  setChecked(
    "#settingsBillReminders",
    state.settings.notifications?.billReminders ?? true
  );

  setChecked(
    "#settingsWeeklySummary",
    state.settings.notifications?.weeklySummary ?? true
  );
}

/* =========================================================
   CATEGORY MANAGER
   ========================================================= */

function renderCategoryManager(state) {
  const container = $("#categoryManager");

  if (!container) return;

  const categories = state.categories || [];

  if (!categories.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>No categories available.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = categories.map((category) => {
    return `
      <article class="category-manager-row" data-category-id="${category.id}">
        <div class="category-manager-emoji">
          ${category.emoji || "💸"}
        </div>

        <div class="category-manager-info">
          <strong>${safeText(category.name)}</strong>
          <small>${safeText(category.type || "expense")}</small>
        </div>

        <div
          class="category-color-dot"
          style="background:${category.color || "#4F8EF7"}"
        ></div>

        <button
          class="category-delete-btn"
          data-id="${category.id}"
          title="Delete category"
        >
          🗑️
        </button>
      </article>
    `;
  }).join("");

  bindCategoryActions();
}

/* =========================================================
   NET WORTH MANAGER
   ========================================================= */

function renderNetWorthManager(state) {
  const assetList = $("#assetList");
  const liabilityList = $("#liabilityList");

  const assets = state.settings.netWorth?.assets || [];
  const liabilities = state.settings.netWorth?.liabilities || [];

  if (assetList) {
    assetList.innerHTML = assets.length
      ? assets.map((asset) => {
          return `
            <article class="net-worth-row">
              <div>
                <strong>${safeText(asset.name)}</strong>
                <small>Asset</small>
              </div>

              <strong>
                ${formatMoney(asset.amount, state.settings.baseCurrency)}
              </strong>

              <button class="icon-btn delete-asset-btn" data-id="${asset.id}">
                🗑️
              </button>
            </article>
          `;
        }).join("")
      : `
        <div class="empty-state compact">
          <p>No assets added.</p>
        </div>
      `;
  }

  if (liabilityList) {
    liabilityList.innerHTML = liabilities.length
      ? liabilities.map((liability) => {
          return `
            <article class="net-worth-row">
              <div>
                <strong>${safeText(liability.name)}</strong>
                <small>Liability</small>
              </div>

              <strong>
                ${formatMoney(liability.amount, state.settings.baseCurrency)}
              </strong>

              <button class="icon-btn delete-liability-btn" data-id="${liability.id}">
                🗑️
              </button>
            </article>
          `;
        }).join("")
      : `
        <div class="empty-state compact">
          <p>No liabilities added.</p>
        </div>
      `;
  }

  const assetTotal = assets.reduce(
    (sum, asset) => sum + Number(asset.amount || 0),
    0
  );

  const liabilityTotal = liabilities.reduce(
    (sum, liability) => sum + Number(liability.amount || 0),
    0
  );

  const netWorth = assetTotal - liabilityTotal;

  setText(
    "#settingsAssetTotal",
    formatMoney(assetTotal, state.settings.baseCurrency)
  );

  setText(
    "#settingsLiabilityTotal",
    formatMoney(liabilityTotal, state.settings.baseCurrency)
  );

  setText(
    "#settingsNetWorthTotal",
    formatMoney(netWorth, state.settings.baseCurrency)
  );

  bindNetWorthActions();
}

/* =========================================================
   DATA MANAGEMENT
   ========================================================= */

function renderDataManagement(state) {
  setText("#settingsVersion", `v${APP_CONFIG.version}`);
  setText("#settingsStorageKey", APP_CONFIG.storageKey);
  setText("#settingsDataUpdated", state.updatedAt || "Not saved yet");
}

/* =========================================================
   ABOUT
   ========================================================= */

function renderAboutSection() {
  const changelog = $("#mockChangelog");

  if (!changelog) return;

  changelog.innerHTML = `
    <article class="changelog-item">
      <strong>v1.0.0</strong>
      <p>Initial FinanceFlow release with dashboard, analytics, budgets, goals, subscriptions, reports, sync simulation, and local-first storage.</p>
    </article>

    <article class="changelog-item">
      <strong>Upcoming</strong>
      <p>Planned improvements include deeper forecasting, recurring transaction automation, and enhanced mobile gestures.</p>
    </article>
  `;
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindSettingsEvents() {
  bindProfileForm();
  bindPreferenceInputs();
  bindCategoryForm();
  bindNetWorthForms();
  bindDataActions();
}

/* =========================================================
   PROFILE FORM
   ========================================================= */

function bindProfileForm() {
  $("#settingsProfileForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfileSettings();
  });

  $("#settingsName")?.addEventListener(
    "input",
    debounce(() => {
      const previewName = $("#settingsPreviewName");

      if (previewName) {
        previewName.textContent = $("#settingsName").value || "User";
      }
    }, 120)
  );

  $("#settingsAvatar")?.addEventListener(
    "input",
    debounce(() => {
      const previewAvatar = $("#settingsPreviewAvatar");

      if (previewAvatar) {
        previewAvatar.textContent = $("#settingsAvatar").value || "🧑‍💻";
      }
    }, 120)
  );
}

function saveProfileSettings() {
  const state = getState();

  const nextSettings = {
    ...state.settings,
    name: $("#settingsName")?.value || "User",
    avatar: $("#settingsAvatar")?.value || "🧑‍💻",
    monthlyIncome: Number($("#settingsMonthlyIncome")?.value || 0),
  };

  setState(
    {
      ...state,
      settings: nextSettings,
    },
    {
      event: "settings:profile",
    }
  );

  notifySettingsSaved();
}

/* =========================================================
   PREFERENCE INPUTS
   ========================================================= */

function bindPreferenceInputs() {
  const inputs = [
    "#settingsBaseCurrency",
    "#settingsTheme",
    "#settingsLanguage",
    "#settingsBudgetWarnings",
    "#settingsBillReminders",
    "#settingsWeeklySummary",
  ];

  inputs.forEach((selector) => {
    $(selector)?.addEventListener("change", savePreferenceSettings);
  });
}

function savePreferenceSettings() {
  const state = getState();

  const theme = $("#settingsTheme")?.value || "dark";

  const nextSettings = {
    ...state.settings,

    baseCurrency: $("#settingsBaseCurrency")?.value || "INR",

    theme,

    language: $("#settingsLanguage")?.value || "en",

    notifications: {
      budgetWarnings: $("#settingsBudgetWarnings")?.checked ?? true,
      billReminders: $("#settingsBillReminders")?.checked ?? true,
      weeklySummary: $("#settingsWeeklySummary")?.checked ?? true,
    },
  };

  document.documentElement.dataset.theme = theme;

  localStorage.setItem("financeflow_theme", theme);

  setState(
    {
      ...state,
      settings: nextSettings,
    },
    {
      event: "settings:preferences",
    }
  );

  notifySettingsSaved();
}

/* =========================================================
   CATEGORY FORM
   ========================================================= */

function bindCategoryForm() {
  $("#addCategoryForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addCategory();
  });

  $("#resetCategoriesBtn")?.addEventListener("click", resetCategories);
}

function addCategory() {
  const state = getState();

  const name = $("#newCategoryName")?.value?.trim();
  const emoji = $("#newCategoryEmoji")?.value?.trim() || "💸";
  const color = $("#newCategoryColor")?.value || "#4F8EF7";
  const type = $("#newCategoryType")?.value || "expense";

  if (!name) {
    showToast({
      type: "warning",
      title: "Category Name Required",
      message: "Please enter a category name.",
      icon: "⚠️",
    });

    return;
  }

  const duplicate = state.categories.some(
    (category) => category.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    showToast({
      type: "warning",
      title: "Duplicate Category",
      message: "This category already exists.",
      icon: "⚠️",
    });

    return;
  }

  const category = {
    id: uid("cat"),
    name,
    emoji,
    color,
    type,
    ruleGroup: type === "income" ? "income" : "wants",
  };

  setState(
    {
      ...state,
      categories: [
        ...state.categories,
        category,
      ],
    },
    {
      event: "category:added",
    }
  );

  $("#addCategoryForm")?.reset();

  showToast({
    type: "success",
    title: "Category Added",
    message: `${name} category created.`,
    icon: emoji,
  });
}

function bindCategoryActions() {
  $$(".category-delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteCategory(button.dataset.id);
    });
  });
}

function deleteCategory(categoryId) {
  const state = getState();

  const category = state.categories.find((item) => item.id === categoryId);

  if (!category) return;

  setState(
    {
      ...state,
      categories: state.categories.filter((item) => item.id !== categoryId),
    },
    {
      event: "category:deleted",
    }
  );

  showToast({
    type: "warning",
    title: "Category Deleted",
    message: `${category.name} removed from category manager.`,
    icon: "🗑️",
  });
}

function resetCategories() {
  const state = getState();

  setState(
    {
      ...state,
      categories: structuredCloneSafe(DEFAULT_CATEGORIES),
    },
    {
      event: "category:reset",
    }
  );

  showToast({
    type: "success",
    title: "Categories Reset",
    message: "Default FinanceFlow categories restored.",
    icon: "♻️",
  });
}

/* =========================================================
   NET WORTH FORMS
   ========================================================= */

function bindNetWorthForms() {
  $("#addAssetForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addNetWorthItem("asset");
  });

  $("#addLiabilityForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addNetWorthItem("liability");
  });
}

function addNetWorthItem(type) {
  const state = getState();

  const nameSelector = type === "asset" ? "#assetName" : "#liabilityName";
  const amountSelector = type === "asset" ? "#assetAmount" : "#liabilityAmount";

  const name = $(nameSelector)?.value?.trim();
  const amount = Number($(amountSelector)?.value || 0);

  if (!name || amount <= 0) {
    showToast({
      type: "warning",
      title: "Invalid Entry",
      message: "Please enter a valid name and amount.",
      icon: "⚠️",
    });

    return;
  }

  const item = {
    id: uid(type),
    name,
    amount,
  };

  const currentNetWorth = state.settings.netWorth || {
    assets: [],
    liabilities: [],
  };

  const nextNetWorth = {
    assets:
      type === "asset"
        ? [
            item,
            ...(currentNetWorth.assets || []),
          ]
        : currentNetWorth.assets || [],

    liabilities:
      type === "liability"
        ? [
            item,
            ...(currentNetWorth.liabilities || []),
          ]
        : currentNetWorth.liabilities || [],
  };

  setState(
    {
      ...state,
      settings: {
        ...state.settings,
        netWorth: nextNetWorth,
      },
    },
    {
      event: `networth:${type}:added`,
    }
  );

  if (type === "asset") {
    $("#addAssetForm")?.reset();
  } else {
    $("#addLiabilityForm")?.reset();
  }

  showToast({
    type: "success",
    title: type === "asset" ? "Asset Added" : "Liability Added",
    message: `${name} added to net worth tracker.`,
    icon: type === "asset" ? "📈" : "📉",
  });
}

function bindNetWorthActions() {
  $$(".delete-asset-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteNetWorthItem("asset", button.dataset.id);
    });
  });

  $$(".delete-liability-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteNetWorthItem("liability", button.dataset.id);
    });
  });
}

function deleteNetWorthItem(type, itemId) {
  const state = getState();

  const currentNetWorth = state.settings.netWorth || {
    assets: [],
    liabilities: [],
  };

  const nextNetWorth = {
    assets:
      type === "asset"
        ? (currentNetWorth.assets || []).filter((item) => item.id !== itemId)
        : currentNetWorth.assets || [],

    liabilities:
      type === "liability"
        ? (currentNetWorth.liabilities || []).filter((item) => item.id !== itemId)
        : currentNetWorth.liabilities || [],
  };

  setState(
    {
      ...state,
      settings: {
        ...state.settings,
        netWorth: nextNetWorth,
      },
    },
    {
      event: `networth:${type}:deleted`,
    }
  );

  showToast({
    type: "warning",
    title: type === "asset" ? "Asset Removed" : "Liability Removed",
    message: "Net worth tracker updated.",
    icon: "🗑️",
  });
}

/* =========================================================
   DATA ACTIONS
   ========================================================= */

function bindDataActions() {
  $("#exportAllDataBtn")?.addEventListener("click", exportAllData);

  $("#importAllDataInput")?.addEventListener("change", importAllData);

  $("#clearAllDataBtn")?.addEventListener("click", confirmClearAllData);

  $("#resetDemoDataBtn")?.addEventListener("click", resetToDemoData);
}

function exportAllData() {
  const state = getState();

  const blob = new Blob(
    [
      JSON.stringify(state, null, 2),
    ],
    {
      type: "application/json",
    }
  );

  downloadBlob(
    blob,
    `financeflow-full-backup-${new Date().toISOString().slice(0, 10)}.json`
  );

  showToast({
    type: "success",
    title: "Data Exported",
    message: "Full FinanceFlow JSON backup downloaded.",
    icon: "💾",
  });
}

async function importAllData(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  try {
    const text = await file.text();
    const imported = JSON.parse(text);

    if (!imported || typeof imported !== "object") {
      throw new Error("Invalid data");
    }

    const state = getState();

    setState(
      {
        ...state,
        ...imported,
        updatedAt: new Date().toISOString(),
      },
      {
        event: "data:imported",
      }
    );

    showToast({
      type: "success",
      title: "Data Imported",
      message: "Backup restored successfully.",
      icon: "📥",
    });
  } catch (error) {
    console.error(error);

    showToast({
      type: "error",
      title: "Import Failed",
      message: "Invalid or corrupted JSON backup.",
      icon: "❌",
    });
  } finally {
    event.target.value = "";
  }
}

function confirmClearAllData() {
  openConfirmationModal({
    title: "Clear All Data?",
    message:
      "This will permanently delete all FinanceFlow data from this browser. This action cannot be undone.",
    confirmText: "Clear Data",
    icon: "⚠️",
    onConfirm: clearAllData,
  });
}

function clearAllData() {
  const emptyState = {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      name: "User",
      avatar: "🧑‍💻",
      monthlyIncome: 0,
      baseCurrency: "INR",
      theme: "dark",
      language: "en",
      notifications: {
        budgetWarnings: true,
        billReminders: true,
        weeklySummary: true,
      },
      netWorth: {
        assets: [],
        liabilities: [],
      },
    },
    categories: structuredCloneSafe(DEFAULT_CATEGORIES),
    transactions: [],
    budgets: [],
    goals: [],
    subscriptions: [],
    notifications: [],
    scoreHistory: [],
  };

  setState(emptyState, {
    event: "data:cleared",
  });

  showToast({
    type: "warning",
    title: "Data Cleared",
    message: "All local FinanceFlow data has been removed.",
    icon: "🧹",
  });
}

function resetToDemoData() {
  openConfirmationModal({
    title: "Reset to Demo Data?",
    message:
      "This will replace current data with the FinanceFlow demo dataset.",
    confirmText: "Reset Demo",
    icon: "♻️",
    onConfirm: () => {
      setState(createDemoState(), {
        event: "data:demoReset",
      });

      showToast({
        type: "success",
        title: "Demo Data Restored",
        message: "FinanceFlow demo data has been reloaded.",
        icon: "♻️",
      });
    },
  });
}

/* =========================================================
   CONFIRMATION MODAL
   ========================================================= */

function openConfirmationModal({
  title,
  message,
  confirmText,
  icon,
  onConfirm,
}) {
  $("#settingsConfirmModal")?.remove();

  const modal = document.createElement("div");

  modal.id = "settingsConfirmModal";
  modal.className = "modal-overlay show";

  modal.innerHTML = `
    <div class="modal-card settings-confirm-card">
      <button class="modal-close-btn" id="closeSettingsConfirmModal">
        ✕
      </button>

      <div class="settings-confirm-icon">
        ${icon}
      </div>

      <h2>${safeText(title)}</h2>

      <p>${safeText(message)}</p>

      <div class="modal-actions">
        <button class="btn" id="cancelSettingsConfirmBtn">
          Cancel
        </button>

        <button class="btn btn-danger" id="confirmSettingsActionBtn">
          ${safeText(confirmText)}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  $("#closeSettingsConfirmModal")?.addEventListener("click", closeConfirmationModal);
  $("#cancelSettingsConfirmBtn")?.addEventListener("click", closeConfirmationModal);

  $("#confirmSettingsActionBtn")?.addEventListener("click", () => {
    onConfirm?.();
    closeConfirmationModal();
  });
}

function closeConfirmationModal() {
  $("#settingsConfirmModal")?.remove();
}

/* =========================================================
   HELPERS
   ========================================================= */

function setValue(selector, value) {
  const element = $(selector);

  if (!element) return;

  element.value = value;
}

function setText(selector, value) {
  const element = $(selector);

  if (!element) return;

  element.textContent = value;
}

function setChecked(selector, checked) {
  const element = $(selector);

  if (!element) return;

  element.checked = Boolean(checked);
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}