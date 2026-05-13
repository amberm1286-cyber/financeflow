/* =========================================================
   FinanceFlow — Data Manager
   File: js/dataManager.js
   ========================================================= */

import {
  APP_CONFIG,
  STORAGE_VERSION,
  DEFAULT_SETTINGS,
  DEFAULT_CATEGORIES,
  DEMO_TRANSACTIONS_RAW,
  DEMO_BUDGETS,
  DEMO_GOALS,
  DEMO_SUBSCRIPTIONS,
} from "./config.js";

import {
  uid,
  deepClone,
  todayISO,
  addDays,
  toISODate,
  showSavedIndicator,
} from "./utils.js";

/* ---------- Internal State ---------- */

let state = null;
let listeners = [];

const DEFAULT_STATE = {
  version: STORAGE_VERSION,
  createdAt: null,
  updatedAt: null,
  settings: deepClone(DEFAULT_SETTINGS),
  categories: deepClone(DEFAULT_CATEGORIES),
  transactions: [],
  budgets: [],
  goals: [],
  subscriptions: [],
  notifications: [],
  scoreHistory: [],
};

/* ---------- State Setup ---------- */

export function initData() {
  const saved = loadFromStorage();

  if (saved) {
    state = migrateState(saved);
  } else {
    state = createDemoState();
    saveState(false);
  }

  return getState();
}

export function getState() {
  if (!state) {
    initData();
  }

  return state;
}

export function setState(nextState, options = {}) {
  state = {
    ...deepClone(nextState),
    updatedAt: new Date().toISOString(),
  };

  saveState(options.notify !== false);
  emitChange(options.event || "state:updated");

  return getState();
}

export function subscribe(callback) {
  listeners.push(callback);

  return () => {
    listeners = listeners.filter((listener) => listener !== callback);
  };
}

function emitChange(eventName = "state:changed") {
  listeners.forEach((callback) => {
    callback(getState(), eventName);
  });

  window.dispatchEvent(
    new CustomEvent("financeflow:datachange", {
      detail: {
        event: eventName,
        state: getState(),
      },
    })
  );
}

/* ---------- Storage ---------- */

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) return null;

    return JSON.parse(raw);
  } catch (error) {
    console.error("FinanceFlow storage load failed:", error);
    return null;
  }
}

export function saveState(showIndicator = true) {
  if (!state) return;

  try {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(state));

    if (showIndicator) {
      showSavedIndicator();
    }

    window.dispatchEvent(
      new CustomEvent("financeflow:saved", {
        detail: { updatedAt: state.updatedAt },
      })
    );
  } catch (error) {
    console.error("FinanceFlow storage save failed:", error);
  }
}

function migrateState(savedState) {
  const migrated = {
    ...deepClone(DEFAULT_STATE),
    ...savedState,
    version: STORAGE_VERSION,
    settings: {
      ...deepClone(DEFAULT_SETTINGS),
      ...(savedState.settings || {}),
      notifications: {
        ...deepClone(DEFAULT_SETTINGS.notifications),
        ...(savedState.settings?.notifications || {}),
      },
      netWorth: {
        ...deepClone(DEFAULT_SETTINGS.netWorth),
        ...(savedState.settings?.netWorth || {}),
      },
    },
    categories: savedState.categories?.length
      ? savedState.categories
      : deepClone(DEFAULT_CATEGORIES),
    transactions: savedState.transactions || [],
    budgets: savedState.budgets || [],
    goals: savedState.goals || [],
    subscriptions: savedState.subscriptions || [],
    notifications: savedState.notifications || [],
    scoreHistory: savedState.scoreHistory || [],
  };

  return migrated;
}

/* ---------- Demo Data ---------- */

export function createDemoState() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const transactions = DEMO_TRANSACTIONS_RAW.map((item, index) => {
    const day = Math.min(index + 1, 28);
    const date = new Date(currentYear, currentMonth, day);

    return {
      id: uid("txn"),
      name: item[0],
      type: item[1],
      category: item[2],
      amount: item[3],
      method: item[4],
      note: item[5],
      tags: item[6],
      date: toISODate(date),
      emoji: getCategoryEmoji(item[2]),
      recurring: item[2] === "Subscriptions",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const budgets = DEMO_BUDGETS.map((budget) => ({
    ...budget,
    id: uid("budget"),
    month: getCurrentMonthKey(),
    spent: 0,
    warningsTriggered: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const goals = DEMO_GOALS.map((goal, index) => ({
    ...goal,
    id: uid("goal"),
    deadline: addDays(todayISO(), 90 + index * 45),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const subscriptions = DEMO_SUBSCRIPTIONS.map((subscription, index) => ({
    ...subscription,
    id: uid("sub"),
    nextBillingDate: addDays(todayISO(), 3 + index * 6),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const createdAt = new Date().toISOString();

  return {
    ...deepClone(DEFAULT_STATE),
    createdAt,
    updatedAt: createdAt,
    transactions,
    budgets,
    goals,
    subscriptions,
    notifications: [
      createNotificationObject({
        title: "Welcome to FinanceFlow",
        message: "Demo data has been loaded so your dashboard looks alive.",
        type: "success",
        icon: "🚀",
      }),
    ],
    scoreHistory: createDemoScoreHistory(),
  };
}

function createDemoScoreHistory() {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

    months.push({
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      score: 610 + Math.round(Math.random() * 95),
    });
  }

  return months;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCategoryEmoji(categoryName) {
  const category = DEFAULT_CATEGORIES.find((cat) => cat.name === categoryName);
  return category?.emoji || "💳";
}

/* ---------- Reset / Export / Import ---------- */

export function resetToDemoData() {
  state = createDemoState();
  saveState(true);
  emitChange("demo:reset");
  return getState();
}

export function clearAllData() {
  state = {
    ...deepClone(DEFAULT_STATE),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveState(true);
  emitChange("data:cleared");

  return getState();
}

export function exportData() {
  return JSON.stringify(getState(), null, 2);
}

export function importData(jsonText) {
  const parsed = JSON.parse(jsonText);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid FinanceFlow JSON file.");
  }

  state = migrateState(parsed);
  saveState(true);
  emitChange("data:imported");

  return getState();
}

/* ---------- Transactions CRUD ---------- */

export function addTransaction(transaction) {
  const newTransaction = {
    id: uid("txn"),
    name: transaction.name || "Untitled Transaction",
    type: transaction.type || "expense",
    category: transaction.category || "Other",
    amount: Number(transaction.amount) || 0,
    method: transaction.method || "UPI",
    note: transaction.note || "",
    tags: Array.isArray(transaction.tags) ? transaction.tags : [],
    date: transaction.date || todayISO(),
    emoji: transaction.emoji || "💳",
    recurring: Boolean(transaction.recurring),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.transactions.unshift(newTransaction);
  saveState(true);
  emitChange("transaction:added");

  return newTransaction;
}

export function updateTransaction(id, updates) {
  state.transactions = state.transactions.map((transaction) => {
    if (transaction.id !== id) return transaction;

    return {
      ...transaction,
      ...updates,
      amount: updates.amount != null ? Number(updates.amount) : transaction.amount,
      tags: updates.tags != null ? updates.tags : transaction.tags,
      updatedAt: new Date().toISOString(),
    };
  });

  saveState(true);
  emitChange("transaction:updated");

  return getTransaction(id);
}

export function deleteTransaction(id) {
  state.transactions = state.transactions.filter((transaction) => transaction.id !== id);
  saveState(true);
  emitChange("transaction:deleted");
}

export function bulkDeleteTransactions(ids = []) {
  const idSet = new Set(ids);
  state.transactions = state.transactions.filter((transaction) => !idSet.has(transaction.id));

  saveState(true);
  emitChange("transaction:bulkDeleted");
}

export function getTransaction(id) {
  return state.transactions.find((transaction) => transaction.id === id) || null;
}

/* ---------- Budgets CRUD ---------- */

export function addBudget(budget) {
  const newBudget = {
    id: uid("budget"),
    category: budget.category,
    limit: Number(budget.limit) || 0,
    month: budget.month || getCurrentMonthKey(),
    rollover: Boolean(budget.rollover),
    warningLevels: [75, 90, 100],
    warningsTriggered: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.budgets.unshift(newBudget);
  saveState(true);
  emitChange("budget:added");

  return newBudget;
}

export function updateBudget(id, updates) {
  state.budgets = state.budgets.map((budget) => {
    if (budget.id !== id) return budget;

    return {
      ...budget,
      ...updates,
      limit: updates.limit != null ? Number(updates.limit) : budget.limit,
      rollover: updates.rollover != null ? Boolean(updates.rollover) : budget.rollover,
      updatedAt: new Date().toISOString(),
    };
  });

  saveState(true);
  emitChange("budget:updated");

  return getBudget(id);
}

export function deleteBudget(id) {
  state.budgets = state.budgets.filter((budget) => budget.id !== id);
  saveState(true);
  emitChange("budget:deleted");
}

export function getBudget(id) {
  return state.budgets.find((budget) => budget.id === id) || null;
}

export function markBudgetWarningTriggered(budgetId, level) {
  state.budgets = state.budgets.map((budget) => {
    if (budget.id !== budgetId) return budget;

    const warnings = new Set(budget.warningsTriggered || []);
    warnings.add(level);

    return {
      ...budget,
      warningsTriggered: Array.from(warnings),
      updatedAt: new Date().toISOString(),
    };
  });

  saveState(false);
}

/* ---------- Goals CRUD ---------- */

export function addGoal(goal) {
  const newGoal = {
    id: uid("goal"),
    name: goal.name || "New Goal",
    targetAmount: Number(goal.targetAmount) || 0,
    currentAmount: Number(goal.currentAmount) || 0,
    deadline: goal.deadline || addDays(todayISO(), 120),
    emoji: goal.emoji || "🎯",
    priority: goal.priority || "medium",
    category: goal.category || "Other",
    milestonesHit: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.goals.unshift(newGoal);
  saveState(true);
  emitChange("goal:added");

  return newGoal;
}

export function updateGoal(id, updates) {
  state.goals = state.goals.map((goal) => {
    if (goal.id !== id) return goal;

    return {
      ...goal,
      ...updates,
      targetAmount:
        updates.targetAmount != null ? Number(updates.targetAmount) : goal.targetAmount,
      currentAmount:
        updates.currentAmount != null ? Number(updates.currentAmount) : goal.currentAmount,
      updatedAt: new Date().toISOString(),
    };
  });

  saveState(true);
  emitChange("goal:updated");

  return getGoal(id);
}

export function addMoneyToGoal(id, amount) {
  const numericAmount = Number(amount) || 0;

  state.goals = state.goals.map((goal) => {
    if (goal.id !== id) return goal;

    const nextAmount = Math.min(
      Number(goal.targetAmount) || 0,
      Number(goal.currentAmount || 0) + numericAmount
    );

    return {
      ...goal,
      currentAmount: nextAmount,
      updatedAt: new Date().toISOString(),
    };
  });

  saveState(true);
  emitChange("goal:moneyAdded");

  return getGoal(id);
}

export function markGoalMilestone(goalId, milestone) {
  state.goals = state.goals.map((goal) => {
    if (goal.id !== goalId) return goal;

    const milestones = new Set(goal.milestonesHit || []);
    milestones.add(milestone);

    return {
      ...goal,
      milestonesHit: Array.from(milestones),
      updatedAt: new Date().toISOString(),
    };
  });

  saveState(false);
}

export function deleteGoal(id) {
  state.goals = state.goals.filter((goal) => goal.id !== id);
  saveState(true);
  emitChange("goal:deleted");
}

export function getGoal(id) {
  return state.goals.find((goal) => goal.id === id) || null;
}

/* ---------- Subscriptions CRUD ---------- */

export function addSubscription(subscription) {
  const newSubscription = {
    id: uid("sub"),
    service: subscription.service || "New Subscription",
    emoji: subscription.emoji || "🔄",
    amount: Number(subscription.amount) || 0,
    cycle: subscription.cycle || "monthly",
    nextBillingDate: subscription.nextBillingDate || addDays(todayISO(), 7),
    category: subscription.category || "Subscriptions",
    autoPay: Boolean(subscription.autoPay),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.subscriptions.unshift(newSubscription);
  saveState(true);
  emitChange("subscription:added");

  return newSubscription;
}

export function updateSubscription(id, updates) {
  state.subscriptions = state.subscriptions.map((subscription) => {
    if (subscription.id !== id) return subscription;

    return {
      ...subscription,
      ...updates,
      amount:
        updates.amount != null ? Number(updates.amount) : subscription.amount,
      autoPay:
        updates.autoPay != null ? Boolean(updates.autoPay) : subscription.autoPay,
      updatedAt: new Date().toISOString(),
    };
  });

  saveState(true);
  emitChange("subscription:updated");

  return getSubscription(id);
}

export function deleteSubscription(id) {
  state.subscriptions = state.subscriptions.filter(
    (subscription) => subscription.id !== id
  );

  saveState(true);
  emitChange("subscription:deleted");
}

export function getSubscription(id) {
  return state.subscriptions.find((subscription) => subscription.id === id) || null;
}

/* ---------- Settings ---------- */

export function updateSettings(updates) {
  state.settings = {
    ...state.settings,
    ...updates,
    notifications: {
      ...state.settings.notifications,
      ...(updates.notifications || {}),
    },
    netWorth: {
      ...state.settings.netWorth,
      ...(updates.netWorth || {}),
    },
  };

  saveState(true);
  emitChange("settings:updated");

  return state.settings;
}

export function addCategory(category) {
  const newCategory = {
    id: uid("cat"),
    name: category.name,
    emoji: category.emoji || "💳",
    color: category.color || "#4F8EF7",
    type: category.type || "expense",
    ruleGroup: category.ruleGroup || "wants",
  };

  state.categories.push(newCategory);
  saveState(true);
  emitChange("category:added");

  return newCategory;
}

export function updateCategory(id, updates) {
  state.categories = state.categories.map((category) => {
    if (category.id !== id) return category;
    return { ...category, ...updates };
  });

  saveState(true);
  emitChange("category:updated");
}

export function deleteCategory(id) {
  state.categories = state.categories.filter((category) => category.id !== id);
  saveState(true);
  emitChange("category:deleted");
}

/* ---------- Notifications ---------- */

export function createNotificationObject({
  title,
  message,
  type = "info",
  icon = "🔔",
}) {
  return {
    id: uid("note"),
    title,
    message,
    type,
    icon,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export function addNotification(notification) {
  const newNotification = createNotificationObject(notification);

  state.notifications.unshift(newNotification);
  state.notifications = state.notifications.slice(0, 20);

  saveState(false);
  emitChange("notification:added");

  return newNotification;
}

export function markNotificationRead(id) {
  state.notifications = state.notifications.map((notification) => {
    if (notification.id !== id) return notification;
    return { ...notification, read: true };
  });

  saveState(false);
  emitChange("notification:read");
}

export function clearNotifications() {
  state.notifications = [];
  saveState(true);
  emitChange("notifications:cleared");
}

/* ---------- Net Worth ---------- */

export function updateNetWorth(type, items) {
  if (!["assets", "liabilities"].includes(type)) return state.settings.netWorth;

  state.settings.netWorth = {
    ...state.settings.netWorth,
    [type]: items,
  };

  saveState(true);
  emitChange("networth:updated");

  return state.settings.netWorth;
}

/* ---------- External Sync Support ---------- */

export function replaceStateFromSync(incomingState) {
  if (!incomingState || typeof incomingState !== "object") return;

  state = migrateState(incomingState);
  saveState(false);
  emitChange("sync:received");
}

export function getSerializableState() {
  return deepClone(getState());
}