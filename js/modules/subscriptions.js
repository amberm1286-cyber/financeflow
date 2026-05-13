/* =========================================================
   FinanceFlow — Subscriptions Module
   File: js/modules/subscriptions.js
   ========================================================= */

import {
  $,
  $$,
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
  getMonthlySubscriptionTotal,
  getYearlySubscriptionTotal,
  getUpcomingSubscriptions,
  detectDuplicateSubscriptions,
} from "../analyticsEngine.js";

import {
  showToast,
} from "../notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let initialized = false;

let activeSort = "date";

let activeFilter = "all";

/* =========================================================
   INIT
   ========================================================= */

export function initSubscriptionsModule() {
  if (initialized) return;

  bindSubscriptionEvents();

  renderSubscriptionsPage(getState());

  subscribe((state) => {
    renderSubscriptionsPage(state);
  });

  initialized = true;

  console.log("🔄 Subscriptions Module Initialized");
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderSubscriptionsPage(state) {
  renderSubscriptionStats(state);
  renderSubscriptionList(state);
  renderUpcomingSubscriptions(state);
  renderDuplicateWarnings(state);
}

/* =========================================================
   STATS
   ========================================================= */

function renderSubscriptionStats(state) {
  const monthlyTotal = getMonthlySubscriptionTotal(state);
  const yearlyTotal = getYearlySubscriptionTotal(state);
  const income = Number(state.settings.monthlyIncome || 0);

  const percentOfIncome = income
    ? Math.round((monthlyTotal / income) * 100)
    : 0;

  setMetric(
    "#subscriptionMonthlyTotal",
    formatMoney(monthlyTotal, state.settings.baseCurrency)
  );

  setMetric(
    "#subscriptionYearlyTotal",
    formatMoney(yearlyTotal, state.settings.baseCurrency)
  );

  setMetric(
    "#subscriptionIncomePercent",
    `${percentOfIncome}%`
  );

  setMetric(
    "#subscriptionCount",
    `${state.subscriptions.length}`
  );
}

function setMetric(selector, value) {
  const element = $(selector);
  if (!element) return;
  element.textContent = value;
}

/* =========================================================
   LIST
   ========================================================= */

function renderSubscriptionList(state) {
  const container = $("#subscriptionList");

  if (!container) return;

  let subscriptions = [...(state.subscriptions || [])];

  subscriptions = filterSubscriptions(subscriptions);
  subscriptions = sortSubscriptions(subscriptions);

  const duplicates = detectDuplicateSubscriptions(state);
  const duplicateIds = new Set(
    duplicates.flatMap((group) => group.map((item) => item.id))
  );

  if (!subscriptions.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔄</div>
        <h3>No Subscriptions Found</h3>
        <p>Add recurring services to track monthly and yearly costs.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = subscriptions.map((subscription) => {
    const monthlyCost = normalizeMonthlyCost(subscription);
    const isDuplicate = duplicateIds.has(subscription.id);

    return `
      <article class="subscription-card ${isDuplicate ? "duplicate-warning" : ""}">
        <div class="subscription-main">
          <div class="subscription-icon">
            ${subscription.emoji || getSubscriptionEmoji(subscription.name)}
          </div>

          <div class="subscription-info">
            <strong>${safeText(subscription.name)}</strong>
            <small>${safeText(subscription.category || "General")}</small>

            <div class="subscription-meta">
              <span class="subscription-pill">
                🔁 ${safeText(subscription.billingCycle || "monthly")}
              </span>

              <span class="subscription-pill ${subscription.autoPay ? "autopay" : "manual"}">
                ${subscription.autoPay ? "✅ Auto-pay" : "🟡 Manual"}
              </span>

              <span class="subscription-pill">
                📅 ${formatDate(subscription.nextBillingDate, { short: true })}
              </span>

              <span class="subscription-pill">
                📊 ${formatMoney(monthlyCost, state.settings.baseCurrency)}/mo
              </span>
            </div>
          </div>
        </div>

        <div class="subscription-cost">
          <strong>${formatMoney(subscription.amount, state.settings.baseCurrency)}</strong>
          <span>${safeText(subscription.billingCycle || "monthly")}</span>

          <div class="subscription-actions">
            <button class="icon-btn edit-subscription-btn" data-id="${subscription.id}">
              ✏️
            </button>

            <button class="icon-btn delete-subscription-btn" data-id="${subscription.id}">
              🗑️
            </button>
          </div>
        </div>

        ${
          isDuplicate
            ? `
              <div class="duplicate-alert">
                <span>⚠️</span>
                <p>Possible duplicate subscription detected with similar amount and billing date.</p>
              </div>
            `
            : ""
        }
      </article>
    `;
  }).join("");

  bindSubscriptionCardEvents();
}

/* =========================================================
   UPCOMING
   ========================================================= */

function renderUpcomingSubscriptions(state) {
  const container = $("#upcomingSubscriptions");

  if (!container) return;

  const upcoming = getUpcomingSubscriptions(state, 31);

  if (!upcoming.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>No upcoming subscriptions this month.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = upcoming.map((subscription) => {
    return `
      <article class="upcoming-subscription-item">
        <div>
          <strong>
            ${subscription.emoji || getSubscriptionEmoji(subscription.name)}
            ${safeText(subscription.name)}
          </strong>

          <small>
            ${formatDate(subscription.nextBillingDate, { short: true })}
          </small>
        </div>

        <strong>
          ${formatMoney(subscription.amount, state.settings.baseCurrency)}
        </strong>
      </article>
    `;
  }).join("");
}

/* =========================================================
   DUPLICATE WARNINGS
   ========================================================= */

function renderDuplicateWarnings(state) {
  const container = $("#subscriptionDuplicateWarnings");

  if (!container) return;

  const duplicates = detectDuplicateSubscriptions(state);

  if (!duplicates.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>No duplicate subscriptions detected.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = duplicates.map((group) => {
    return `
      <article class="subscription-duplicate-card">
        <div class="duplicate-alert">
          <span>⚠️</span>

          <div>
            <strong>Possible Duplicate</strong>
            <p>
              ${group.map((item) => safeText(item.name)).join(" and ")}
              have similar billing patterns.
            </p>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindSubscriptionEvents() {
  $("#openSubscriptionModalBtn")?.addEventListener("click", () => {
    openSubscriptionModal();
  });

  $("#subscriptionSort")?.addEventListener("change", (event) => {
    activeSort = event.target.value;
    renderSubscriptionsPage(getState());
  });

  $("#subscriptionCategoryFilter")?.addEventListener("change", (event) => {
    activeFilter = event.target.value;
    renderSubscriptionsPage(getState());
  });

  $("#subscriptionSearch")?.addEventListener(
    "input",
    debounce(() => {
      renderSubscriptionsPage(getState());
    }, 180)
  );
}

/* =========================================================
   MODAL
   ========================================================= */

function openSubscriptionModal(subscription = null) {
  $("#subscriptionModal")?.remove();

  const modal = document.createElement("div");

  modal.id = "subscriptionModal";
  modal.className = "modal-overlay show";

  modal.innerHTML = `
    <div class="modal-card subscription-modal-card">
      <button class="modal-close-btn" id="closeSubscriptionModal">✕</button>

      <div class="modal-header">
        <p class="eyebrow">FinanceFlow</p>
        <h2>${subscription ? "Edit" : "Add"} Subscription</h2>
      </div>

      <form id="subscriptionForm" class="subscription-form">
        <div class="form-grid">
          <div class="input-group">
            <label>Service Name</label>
            <input
              type="text"
              id="subscriptionName"
              value="${subscription ? safeText(subscription.name) : ""}"
              placeholder="Netflix"
              required
            />
          </div>

          <div class="input-group">
            <label>Amount</label>
            <input
              type="number"
              id="subscriptionAmount"
              value="${subscription ? subscription.amount : ""}"
              required
            />
          </div>

          <div class="input-group">
            <label>Billing Cycle</label>
            <select id="subscriptionCycle">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div class="input-group">
            <label>Next Billing Date</label>
            <input
              type="date"
              id="subscriptionNextDate"
              value="${subscription ? subscription.nextBillingDate : new Date().toISOString().slice(0, 10)}"
              required
            />
          </div>

          <div class="input-group">
            <label>Category</label>
            <input
              type="text"
              id="subscriptionCategory"
              value="${subscription ? safeText(subscription.category || "") : "Subscriptions"}"
              required
            />
          </div>

          <div class="input-group">
            <label>Emoji</label>
            <input
              type="text"
              id="subscriptionEmoji"
              value="${subscription ? subscription.emoji || "🔄" : "🔄"}"
            />
          </div>
        </div>

        <label class="toggle-row">
          <span>Auto-pay enabled</span>
          <input
            type="checkbox"
            id="subscriptionAutoPay"
            ${subscription?.autoPay ? "checked" : ""}
          />
        </label>

        <button type="submit" class="btn btn-primary btn-full">
          ${subscription ? "Save Changes" : "Add Subscription"}
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  if (subscription) {
    $("#subscriptionCycle").value = subscription.billingCycle || "monthly";
  }

  bindSubscriptionForm(subscription);
}

function bindSubscriptionForm(subscription = null) {
  $("#closeSubscriptionModal")?.addEventListener("click", closeSubscriptionModal);

  $("#subscriptionForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (subscription) {
      updateSubscription(subscription.id);
    } else {
      addSubscription();
    }

    closeSubscriptionModal();
  });
}

function closeSubscriptionModal() {
  $("#subscriptionModal")?.remove();
}

/* =========================================================
   CRUD
   ========================================================= */

function addSubscription() {
  const state = getState();

  const subscription = {
    id: uid("sub"),
    name: $("#subscriptionName")?.value || "Subscription",
    amount: Number($("#subscriptionAmount")?.value || 0),
    billingCycle: $("#subscriptionCycle")?.value || "monthly",
    nextBillingDate:
      $("#subscriptionNextDate")?.value || new Date().toISOString().slice(0, 10),
    category: $("#subscriptionCategory")?.value || "Subscriptions",
    emoji:
      $("#subscriptionEmoji")?.value ||
      getSubscriptionEmoji($("#subscriptionName")?.value || ""),
    autoPay: $("#subscriptionAutoPay")?.checked || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setState(
    {
      ...state,
      subscriptions: [
        subscription,
        ...state.subscriptions,
      ],
    },
    {
      event: "subscription:added",
    }
  );

  showToast({
    type: "success",
    title: "Subscription Added",
    message: `${subscription.name} is now tracked.`,
    icon: "🔄",
  });
}

function updateSubscription(subscriptionId) {
  const state = getState();

  const subscriptions = state.subscriptions.map((subscription) => {
    if (subscription.id !== subscriptionId) return subscription;

    return {
      ...subscription,
      name: $("#subscriptionName")?.value || subscription.name,
      amount: Number($("#subscriptionAmount")?.value || 0),
      billingCycle: $("#subscriptionCycle")?.value || subscription.billingCycle,
      nextBillingDate:
        $("#subscriptionNextDate")?.value || subscription.nextBillingDate,
      category: $("#subscriptionCategory")?.value || subscription.category,
      emoji: $("#subscriptionEmoji")?.value || subscription.emoji,
      autoPay: $("#subscriptionAutoPay")?.checked || false,
      updatedAt: new Date().toISOString(),
    };
  });

  setState(
    {
      ...state,
      subscriptions,
    },
    {
      event: "subscription:updated",
    }
  );

  showToast({
    type: "success",
    title: "Subscription Updated",
    message: "Changes saved successfully.",
    icon: "✏️",
  });
}

function deleteSubscription(subscriptionId) {
  const state = getState();

  const subscription = state.subscriptions.find((item) => item.id === subscriptionId);

  if (!subscription) return;

  setState(
    {
      ...state,
      subscriptions: state.subscriptions.filter((item) => item.id !== subscriptionId),
    },
    {
      event: "subscription:deleted",
    }
  );

  showToast({
    type: "warning",
    title: "Subscription Deleted",
    message: `${subscription.name} was removed.`,
    icon: "🗑️",
  });
}

/* =========================================================
   CARD EVENTS
   ========================================================= */

function bindSubscriptionCardEvents() {
  $$(".edit-subscription-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const subscription = getState().subscriptions.find(
        (item) => item.id === button.dataset.id
      );

      if (subscription) {
        openSubscriptionModal(subscription);
      }
    });
  });

  $$(".delete-subscription-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteSubscription(button.dataset.id);
    });
  });
}

/* =========================================================
   FILTER / SORT
   ========================================================= */

function filterSubscriptions(subscriptions) {
  const search = ($("#subscriptionSearch")?.value || "").toLowerCase().trim();

  return subscriptions.filter((subscription) => {
    const searchMatch =
      !search ||
      subscription.name.toLowerCase().includes(search) ||
      (subscription.category || "").toLowerCase().includes(search);

    const categoryMatch =
      activeFilter === "all" ||
      (subscription.category || "Subscriptions") === activeFilter;

    return searchMatch && categoryMatch;
  });
}

function sortSubscriptions(subscriptions) {
  return subscriptions.sort((a, b) => {
    if (activeSort === "cost") {
      return Number(b.amount || 0) - Number(a.amount || 0);
    }

    if (activeSort === "category") {
      return String(a.category || "").localeCompare(String(b.category || ""));
    }

    return new Date(a.nextBillingDate) - new Date(b.nextBillingDate);
  });
}

/* =========================================================
   HELPERS
   ========================================================= */

function normalizeMonthlyCost(subscription) {
  const amount = Number(subscription.amount || 0);
  const cycle = subscription.billingCycle || "monthly";

  if (cycle === "weekly") return amount * 4.33;
  if (cycle === "yearly") return amount / 12;

  return amount;
}

function getSubscriptionEmoji(name = "") {
  const lower = name.toLowerCase();

  if (lower.includes("netflix")) return "📺";
  if (lower.includes("spotify")) return "🎵";
  if (lower.includes("youtube")) return "▶️";
  if (lower.includes("prime")) return "📦";
  if (lower.includes("icloud")) return "☁️";
  if (lower.includes("adobe")) return "🎨";
  if (lower.includes("gym")) return "🏋️";
  if (lower.includes("domain")) return "🌐";

  return "🔄";
}