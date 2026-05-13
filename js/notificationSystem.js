/* =========================================================
   FinanceFlow — Notification System
   File: js/notificationSystem.js
   ========================================================= */

import {
  APP_CONFIG,
} from "./config.js";

import {
  $,
  $$,
  createEl,
  formatDateTime,
  safeText,
  uid,
} from "./utils.js";

import {
  getState,
  setState,
} from "./dataManager.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

const MAX_NOTIFICATIONS = 20;

let notificationDrawerOpen = false;
let toastQueue = [];
let activeToasts = new Map();

/* =========================================================
   INIT
   ========================================================= */

export function initNotificationSystem() {
  createNotificationInfrastructure();
  bindNotificationEvents();
  renderNotificationCenter();
  updateNotificationBadge();

  showWeeklySummaryIfNeeded();

  console.log("✅ Notification System Initialized");
}

/* =========================================================
   INFRASTRUCTURE
   ========================================================= */

function createNotificationInfrastructure() {
  createToastContainer();
  createNotificationDrawer();
  createOverspendModal();
}

function createToastContainer() {
  if ($("#toastContainer")) return;

  const container = document.createElement("div");
  container.id = "toastContainer";
  container.className = "toast-container";

  document.body.appendChild(container);
}

function createNotificationDrawer() {
  if ($("#notificationDrawer")) return;

  const drawer = document.createElement("aside");

  drawer.id = "notificationDrawer";
  drawer.className = "notification-drawer";

  drawer.innerHTML = `
    <div class="notification-drawer-backdrop" id="notificationDrawerBackdrop"></div>

    <div class="notification-drawer-panel">
      <div class="notification-drawer-header">
        <div>
          <p class="eyebrow">FinanceFlow Alerts</p>
          <h3>Notification Center</h3>
        </div>

        <div class="notification-drawer-actions">
          <button class="icon-btn" id="clearNotificationsBtn" title="Clear notifications">
            🗑️
          </button>

          <button class="icon-btn" id="closeNotificationDrawerBtn" title="Close">
            ✕
          </button>
        </div>
      </div>

      <div class="notification-drawer-body" id="notificationList">
      </div>
    </div>
  `;

  document.body.appendChild(drawer);
}

function createOverspendModal() {
  if ($("#overspendModal")) return;

  const modal = document.createElement("div");

  modal.id = "overspendModal";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card overspend-modal-card">
      <button class="modal-close-btn" id="closeOverspendModalBtn">✕</button>

      <div class="overspend-emoji">🚨</div>

      <h2>Budget Overspent</h2>

      <p class="overspend-description" id="overspendDescription">
        You've exceeded your budget.
      </p>

      <div class="overspend-stats">
        <div class="overspend-stat">
          <span>Overspent By</span>
          <strong id="overspendAmount">₹0</strong>
        </div>

        <div class="overspend-stat">
          <span>Category</span>
          <strong id="overspendCategory">Food</strong>
        </div>
      </div>

      <div class="smart-suggestion-card">
        <span>💡</span>

        <div>
          <strong>Smart Cut Suggestion</strong>

          <p id="overspendSuggestion">
            Try reducing non-essential spending this week.
          </p>
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="overspendOkayBtn">
        Understood
      </button>
    </div>
  `;

  document.body.appendChild(modal);
}

/* =========================================================
   EVENT BINDINGS
   ========================================================= */

function bindNotificationEvents() {
  const notificationBtn = $("#notificationBtn");
  const closeDrawerBtn =
    $("#closeNotificationDrawerBtn") ||
    $("#closeNotificationDrawer");
  const backdrop = $("#notificationDrawerBackdrop");
  const clearBtn = $("#clearNotificationsBtn");

  notificationBtn?.addEventListener("click", toggleNotificationDrawer);

  closeDrawerBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeNotificationDrawer();
  });

  backdrop?.addEventListener("click", closeNotificationDrawer);

  clearBtn?.addEventListener("click", clearNotifications);

  $("#closeOverspendModalBtn")?.addEventListener("click", hideOverspendModal);

  $("#overspendOkayBtn")?.addEventListener("click", hideOverspendModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNotificationDrawer();
      hideOverspendModal();
    }
  });

  window.addEventListener("financeflow:datachange", () => {
    renderNotificationCenter();
    updateNotificationBadge();
  });
}

/* =========================================================
   TOASTS
   ========================================================= */

export function showToast({
  type = "info",
  title = "Notification",
  message = "",
  icon = "🔔",
  duration = 4000,
  persist = true,
} = {}) {
  const id = uid("toast");

  const toast = {
    id,
    type,
    title,
    message,
    icon,
    createdAt: new Date().toISOString(),
  };

  toastQueue.push(toast);

  if (persist) {
    addNotification({
      type,
      title,
      message,
      icon,
    });
  }

  renderToast(toast, duration);

  return id;
}

function renderToast(toast, duration) {
  const container = $("#toastContainer");
  if (!container) return;

  const toastEl = document.createElement("div");

  toastEl.className = `toast toast-${toast.type}`;
  toastEl.dataset.toastId = toast.id;

  toastEl.innerHTML = `
    <div class="toast-icon">
      ${toast.icon}
    </div>

    <div class="toast-content">
      <strong>${safeText(toast.title)}</strong>
      <p>${safeText(toast.message)}</p>
    </div>

    <button class="toast-close-btn">
      ✕
    </button>

    <div class="toast-progress"></div>
  `;

  container.appendChild(toastEl);

  activeToasts.set(toast.id, toastEl);

  requestAnimationFrame(() => {
    toastEl.classList.add("show");
  });

  const progress = toastEl.querySelector(".toast-progress");

  if (progress) {
    progress.style.animationDuration = `${duration}ms`;
  }

  const closeBtn = toastEl.querySelector(".toast-close-btn");

  closeBtn?.addEventListener("click", () => {
    removeToast(toast.id);
  });

  setTimeout(() => {
    removeToast(toast.id);
  }, duration);
}

function removeToast(id) {
  const toastEl = activeToasts.get(id);

  if (!toastEl) return;

  toastEl.classList.remove("show");
  toastEl.classList.add("hide");

  setTimeout(() => {
    toastEl.remove();
    activeToasts.delete(id);
  }, 260);
}

/* =========================================================
   NOTIFICATION CENTER
   ========================================================= */

export function addNotification({
  type = "info",
  title = "Notification",
  message = "",
  icon = "🔔",
} = {}) {
  const state = getState();

  const notification = {
    id: uid("notif"),
    type,
    title,
    message,
    icon,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const notifications = [
    notification,
    ...(state.notifications || []),
  ].slice(0, MAX_NOTIFICATIONS);

  setState({
    ...state,
    notifications,
  }, {
    notify: false,
    event: "notifications:updated",
  });

  renderNotificationCenter();
  updateNotificationBadge();
}

export function clearNotifications() {
  const state = getState();

  setState({
    ...state,
    notifications: [],
  }, {
    notify: false,
    event: "notifications:cleared",
  });

  renderNotificationCenter();
  updateNotificationBadge();

  showToast({
    type: "success",
    title: "Notifications Cleared",
    message: "Your notification center is now empty.",
    icon: "🧹",
    persist: false,
  });
}

export function markAllNotificationsRead() {
  const state = getState();

  const updated = (state.notifications || []).map((notification) => ({
    ...notification,
    read: true,
  }));

  setState({
    ...state,
    notifications: updated,
  }, {
    notify: false,
    event: "notifications:read",
  });

  updateNotificationBadge();
}

export function renderNotificationCenter() {
  const container = $("#notificationList");

  if (!container) return;

  const state = getState();
  const notifications = state.notifications || [];

  if (!notifications.length) {
    container.innerHTML = `
      <div class="empty-state notification-empty">
        <div class="empty-state-icon">🔔</div>
        <h3>No Notifications Yet</h3>
        <p>Your alerts and updates will appear here.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = notifications.map((notification) => {
    return `
      <article
        class="notification-item ${notification.read ? "read" : "unread"}"
        data-notification-id="${notification.id}"
      >
        <div class="notification-item-icon ${notification.type}">
          ${notification.icon}
        </div>

        <div class="notification-item-content">
          <div class="notification-item-top">
            <strong>${safeText(notification.title)}</strong>

            <span>
              ${formatDateTime(notification.createdAt)}
            </span>
          </div>

          <p>${safeText(notification.message)}</p>
        </div>
      </article>
    `;
  }).join("");
}

function updateNotificationBadge() {
  const badge = $("#notificationBadge");

  if (!badge) return;

  const state = getState();

  const unreadCount = (state.notifications || []).filter(
    (notification) => !notification.read
  ).length;

  badge.textContent = unreadCount;

  badge.style.display = unreadCount ? "grid" : "none";
}

/* =========================================================
   DRAWER
   ========================================================= */

export function openNotificationDrawer() {
  const drawer = $("#notificationDrawer");

  if (!drawer) return;

  drawer.classList.add("open");

  notificationDrawerOpen = true;

  markAllNotificationsRead();
}

export function closeNotificationDrawer() {
  const drawer = $("#notificationDrawer");

  if (!drawer) return;

  drawer.classList.remove("open");

  notificationDrawerOpen = false;
}

export function toggleNotificationDrawer() {
  if (notificationDrawerOpen) {
    closeNotificationDrawer();
  } else {
    openNotificationDrawer();
  }
}

/* =========================================================
   BUDGET WARNING HELPERS
   ========================================================= */

export function triggerBudgetWarning({
  category = "Budget",
  percentage = 0,
  amount = 0,
  limit = 0,
  currency = "INR",
} = {}) {
  let type = "info";
  let icon = "📊";
  let title = "Budget Update";

  if (percentage >= 100) {
    type = "error";
    icon = "🚨";
    title = "Budget Exceeded";
  } else if (percentage >= 90) {
    type = "warning";
    icon = "⚠️";
    title = "Critical Budget Alert";
  } else if (percentage >= 75) {
    type = "warning";
    icon = "📉";
    title = "Budget Warning";
  }

  const rounded = Math.round(percentage);

  showToast({
    type,
    icon,
    title,
    message: `${category} budget is ${rounded}% used.`,
  });

  if (percentage >= 100) {
    showOverspendModal({
      category,
      amount: amount - limit,
      currency,
    });
  }
}

/* =========================================================
   OVERSPEND MODAL
   ========================================================= */

export function showOverspendModal({
  category = "Budget",
  amount = 0,
  currency = "INR",
} = {}) {
  const modal = $("#overspendModal");

  if (!modal) return;

  const suggestions = [
    "Pause impulse purchases for the next 7 days.",
    "Review recurring subscriptions in this category.",
    "Try switching to lower-cost alternatives this week.",
    "Use the 50/30/20 rule to rebalance spending.",
    "Reduce weekend spending to recover your monthly budget.",
  ];

  const suggestion =
    suggestions[Math.floor(Math.random() * suggestions.length)];

  $("#overspendCategory").textContent = category;

  $("#overspendAmount").textContent =
    `${getCurrencySymbol(currency)}${Math.abs(Math.round(amount)).toLocaleString("en-IN")}`;

  $("#overspendDescription").textContent =
    `You've exceeded your ${category} budget limit.`;

  $("#overspendSuggestion").textContent = suggestion;

  modal.classList.add("show");

  document.body.style.overflow = "hidden";
}

export function hideOverspendModal() {
  const modal = $("#overspendModal");

  if (!modal) return;

  modal.classList.remove("show");

  document.body.style.overflow = "";
}

/* =========================================================
   WEEKLY SUMMARY
   ========================================================= */

function showWeeklySummaryIfNeeded() {
  const today = new Date();

  const isMonday = today.getDay() === 1;

  if (!isMonday) return;

  const storageKey = "financeflow_weekly_summary_seen";
  const currentWeek = getWeekKey(today);

  if (localStorage.getItem(storageKey) === currentWeek) {
    return;
  }

  localStorage.setItem(storageKey, currentWeek);

  const state = getState();

  const totalExpenses = state.transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  showToast({
    type: "info",
    title: "Weekly Spending Summary",
    icon: "📅",
    message: `You've spent ₹${Math.round(totalExpenses).toLocaleString("en-IN")} recently.`,
  });
}

/* =========================================================
   PUBLIC HELPERS
   ========================================================= */

export function notifyTransactionAdded(transactionName = "Transaction") {
  showToast({
    type: "success",
    title: "Transaction Added",
    icon: "💸",
    message: `${transactionName} was added successfully.`,
  });
}

export function notifyTransactionDeleted(transactionName = "Transaction") {
  showToast({
    type: "warning",
    title: "Transaction Deleted",
    icon: "🗑️",
    message: `${transactionName} was removed.`,
  });
}

export function notifyGoalMilestone(goalName, milestone = 25) {
  let icon = "🎯";

  if (milestone >= 100) icon = "🏆";
  else if (milestone >= 75) icon = "🚀";
  else if (milestone >= 50) icon = "🔥";

  showToast({
    type: "success",
    title: "Goal Milestone Reached",
    icon,
    message: `${goalName} reached ${milestone}% progress.`,
  });
}

export function notifySyncComplete() {
  showToast({
    type: "success",
    title: "Sync Complete",
    icon: "☁️",
    message: "FinanceFlow Cloud backup completed successfully.",
  });
}

export function notifyPDFExported() {
  showToast({
    type: "success",
    title: "PDF Report Generated",
    icon: "📄",
    message: "Your financial report is ready.",
  });
}

export function notifySettingsSaved() {
  showToast({
    type: "success",
    title: "Settings Saved",
    icon: "⚙️",
    message: "Your preferences were updated.",
  });
}

/* =========================================================
   UTILS
   ========================================================= */

function getCurrencySymbol(currencyCode = "INR") {
  const map = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
    AED: "د.إ",
    SGD: "S$",
  };

  return map[currencyCode] || "₹";
}

function getWeekKey(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), 0, 1);

  const pastDays = Math.floor(
    (date - firstDay) / (24 * 60 * 60 * 1000)
  );

  const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);

  return `${date.getFullYear()}-W${week}`;
}

/* =========================================================
   GLOBAL STYLES INJECTION
   ========================================================= */

injectNotificationStyles();

function injectNotificationStyles() {
  if ($("#notificationSystemStyles")) return;

  const style = document.createElement("style");

  style.id = "notificationSystemStyles";

  style.textContent = `
    /* =====================================================
       Toasts
       ===================================================== */

    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 5000;
      display: grid;
      gap: 12px;
      width: min(380px, calc(100vw - 24px));
      pointer-events: none;
    }

    .toast {
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: 54px 1fr 34px;
      gap: 12px;
      align-items: start;
      padding: 14px;
      border-radius: 22px;
      border: 1px solid var(--border);
      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,0.11),
          rgba(255,255,255,0.05)
        ),
        rgba(10,15,30,0.92);

      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);

      box-shadow: var(--shadow-soft);

      opacity: 0;
      transform: translateX(40px) scale(0.96);

      transition:
        opacity 260ms ease,
        transform 260ms ease;

      pointer-events: auto;
    }

    html[data-theme="light"] .toast {
      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,0.95),
          rgba(255,255,255,0.88)
        );
    }

    .toast.show {
      opacity: 1;
      transform: translateX(0) scale(1);
    }

    .toast.hide {
      opacity: 0;
      transform: translateX(36px) scale(0.96);
    }

    .toast-success {
      border-color: rgba(0,255,178,0.22);
      box-shadow:
        var(--shadow-soft),
        0 0 24px rgba(0,255,178,0.16);
    }

    .toast-warning {
      border-color: rgba(255,209,102,0.24);
      box-shadow:
        var(--shadow-soft),
        0 0 24px rgba(255,209,102,0.14);
    }

    .toast-error {
      border-color: rgba(255,71,87,0.24);
      box-shadow:
        var(--shadow-soft),
        0 0 24px rgba(255,71,87,0.18);
    }

    .toast-icon {
      width: 54px;
      height: 54px;
      border-radius: 18px;
      border: 1px solid var(--border);
      background: var(--surface);
      display: grid;
      place-items: center;
      font-size: 1.4rem;
    }

    .toast-content strong {
      display: block;
      margin-bottom: 5px;
      font-size: 0.95rem;
      letter-spacing: -0.03em;
    }

    .toast-content p {
      margin: 0;
      color: var(--text-soft);
      font-size: 0.84rem;
      line-height: 1.5;
      font-weight: 700;
    }

    .toast-close-btn {
      width: 34px;
      height: 34px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      color: var(--text);
      font-weight: 900;
    }

    .toast-progress {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 3px;
      width: 100%;
      transform-origin: left;
      background: var(--gradient-main);
      animation: toastProgress linear forwards;
    }

    @keyframes toastProgress {
      from {
        transform: scaleX(1);
      }

      to {
        transform: scaleX(0);
      }
    }

    /* =====================================================
       Notification Drawer
       ===================================================== */

    .notification-drawer {
      position: fixed;
      inset: 0;
      z-index: 4500;
      pointer-events: none;
    }

    .notification-drawer.open {
      pointer-events: auto;
    }

    .notification-drawer-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.52);
      opacity: 0;
      transition: opacity 260ms ease;
    }

    .notification-drawer.open .notification-drawer-backdrop {
      opacity: 1;
    }

    .notification-drawer-panel {
      position: absolute;
      top: 0;
      right: 0;
      width: min(430px, 100vw);
      height: 100%;
      padding: 24px;
      display: flex;
      flex-direction: column;
      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,0.08),
          rgba(255,255,255,0.04)
        ),
        rgba(10,15,30,0.96);

      border-left: 1px solid var(--border);

      backdrop-filter: blur(26px);
      -webkit-backdrop-filter: blur(26px);

      transform: translateX(100%);
      transition: transform 320ms cubic-bezier(0.2,0.8,0.2,1);

      box-shadow: var(--shadow);
    }

    html[data-theme="light"] .notification-drawer-panel {
      background: rgba(255,255,255,0.95);
    }

    .notification-drawer.open .notification-drawer-panel {
      transform: translateX(0);
    }

    .notification-drawer-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 18px;
    }

    .notification-drawer-header h3 {
      margin: 4px 0 0;
      letter-spacing: -0.05em;
      font-size: 1.6rem;
    }

    .notification-drawer-actions {
      display: flex;
      gap: 8px;
    }

    .notification-drawer-body {
      flex: 1;
      overflow: auto;
      display: grid;
      gap: 12px;
      padding-right: 4px;
    }

    .notification-item {
      display: grid;
      grid-template-columns: 56px 1fr;
      gap: 12px;
      padding: 14px;
      border: 1px solid var(--border);
      border-radius: 22px;
      background: var(--surface-soft);
      transition:
        border-color var(--ease),
        transform var(--ease),
        background var(--ease);
    }

    .notification-item:hover {
      transform: translateY(-2px);
      border-color: var(--border-strong);
    }

    .notification-item.unread {
      border-color: rgba(79,142,247,0.22);
      background:
        radial-gradient(
          circle at top left,
          rgba(79,142,247,0.14),
          transparent 38%
        ),
        var(--surface-soft);
    }

    .notification-item-icon {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      border: 1px solid var(--border);
      background: var(--surface);
      font-size: 1.4rem;
    }

    .notification-item-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }

    .notification-item-top strong {
      font-size: 0.94rem;
      letter-spacing: -0.03em;
    }

    .notification-item-top span {
      color: var(--muted);
      font-size: 0.72rem;
      font-weight: 850;
      white-space: nowrap;
    }

    .notification-item p {
      margin: 0;
      color: var(--text-soft);
      font-size: 0.84rem;
      line-height: 1.55;
      font-weight: 750;
    }

    /* =====================================================
       Overspend Modal
       ===================================================== */

    .overspend-modal-card {
      width: min(520px, calc(100vw - 24px));
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .overspend-emoji {
      font-size: 4rem;
      margin-bottom: 12px;
    }

    .overspend-modal-card h2 {
      margin: 0 0 12px;
      font-size: 2rem;
      letter-spacing: -0.06em;
    }

    .overspend-description {
      margin: 0 auto 22px;
      max-width: 360px;
      color: var(--text-soft);
      line-height: 1.6;
      font-weight: 750;
    }

    .overspend-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }

    .overspend-stat {
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: var(--surface-soft);
    }

    .overspend-stat span {
      display: block;
      margin-bottom: 7px;
      color: var(--muted);
      font-size: 0.74rem;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .overspend-stat strong {
      font-size: 1.4rem;
      letter-spacing: -0.05em;
    }

    .smart-suggestion-card {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      text-align: left;
      margin-bottom: 18px;
      padding: 16px;
      border-radius: 20px;
      border: 1px solid rgba(79,142,247,0.2);
      background:
        radial-gradient(
          circle at top left,
          rgba(79,142,247,0.14),
          transparent 34%
        ),
        var(--surface-soft);
    }

    .smart-suggestion-card span {
      font-size: 1.5rem;
    }

    .smart-suggestion-card strong {
      display: block;
      margin-bottom: 6px;
    }

    .smart-suggestion-card p {
      margin: 0;
      color: var(--text-soft);
      line-height: 1.55;
      font-size: 0.88rem;
    }

    /* =====================================================
       Empty
       ===================================================== */

    .notification-empty {
      min-height: 300px;
    }

    /* =====================================================
       Responsive
       ===================================================== */

    @media (max-width: 760px) {
      .toast-container {
        left: 12px;
        right: 12px;
        top: 12px;
        width: auto;
      }

      .toast {
        grid-template-columns: 48px 1fr 28px;
        padding: 12px;
      }

      .toast-icon {
        width: 48px;
        height: 48px;
      }

      .notification-drawer-panel {
        width: 100%;
        padding: 18px;
      }

      .overspend-stats {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   NOTIFICATION DRAWER SAFETY PATCH
   ========================================================= */

document.addEventListener("click", (event) => {
  if (
    event.target.closest("#closeNotificationDrawerBtn") ||
    event.target.id === "notificationDrawerBackdrop"
  ) {
    const drawer = document.getElementById("notificationDrawer");
    drawer?.classList.remove("open");
    document.body.style.overflow = "";
  }
});

/* =========================================================
   FINAL FIX — Existing HTML Notification Drawer Compatibility
   ========================================================= */

function forceCloseNotificationDrawer() {
  const drawer = document.getElementById("notificationDrawer");

  if (!drawer) return;

  drawer.classList.remove("open", "show", "active");
  document.body.style.overflow = "";
}

document.addEventListener("click", (event) => {
  const closeClicked =
    event.target.closest("#closeNotificationDrawer") ||
    event.target.closest("#closeNotificationDrawerBtn") ||
    event.target.closest("#notificationDrawerBackdrop");

  if (closeClicked) {
    event.preventDefault();
    event.stopPropagation();
    forceCloseNotificationDrawer();
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(forceCloseNotificationDrawer, 100);
});