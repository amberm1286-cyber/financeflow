/* =========================================================
   FinanceFlow — Config
   File: js/config.js
   ========================================================= */

export const APP_CONFIG = {
  name: "FinanceFlow",
  version: "1.0.0",
  storageKey: "financeflow_app_data_v1",
  channelName: "financeflow_sync_channel",
  defaultCurrency: "INR",
  defaultTheme: "dark",
};

export const STORAGE_VERSION = 1;

export const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "UPI",
  "Bank Transfer",
];

export const TRANSACTION_TYPES = {
  INCOME: "income",
  EXPENSE: "expense",
};

export const DEFAULT_SETTINGS = {
  name: "Amber",
  avatar: "🧑‍💻",
  monthlyIncome: 50000,
  baseCurrency: "INR",
  theme: "dark",
  language: "en",
  notifications: {
    budgetWarnings: true,
    billReminders: true,
    weeklySummary: true,
  },
  netWorth: {
    assets: [
      { id: "asset_demo_1", name: "Savings Account", amount: 42000 },
      { id: "asset_demo_2", name: "Investments", amount: 18000 },
    ],
    liabilities: [
      { id: "debt_demo_1", name: "Credit Card Due", amount: 4500 },
    ],
  },
};

export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", name: "Danish Krone" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
];

export const EXCHANGE_RATES_INR_BASE = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  JPY: 1.82,
  CAD: 0.016,
  AUD: 0.018,
  AED: 0.044,
  SGD: 0.016,
  CHF: 0.011,
  CNY: 0.087,
  NZD: 0.02,
  SEK: 0.13,
  NOK: 0.13,
  DKK: 0.083,
  PLN: 0.048,
  THB: 0.44,
  KRW: 16.2,
  ZAR: 0.22,
  BRL: 0.061,
};

export const DEFAULT_CATEGORIES = [
  { id: "cat_food", name: "Food", emoji: "🍔", color: "#FF9F43", type: "expense", ruleGroup: "needs" },
  { id: "cat_transport", name: "Transport", emoji: "🚕", color: "#4F8EF7", type: "expense", ruleGroup: "needs" },
  { id: "cat_shopping", name: "Shopping", emoji: "🛍️", color: "#7C3AED", type: "expense", ruleGroup: "wants" },
  { id: "cat_entertainment", name: "Entertainment", emoji: "🎬", color: "#FF4757", type: "expense", ruleGroup: "wants" },
  { id: "cat_bills", name: "Bills", emoji: "🧾", color: "#FFD166", type: "expense", ruleGroup: "needs" },
  { id: "cat_subscriptions", name: "Subscriptions", emoji: "🔄", color: "#A78BFA", type: "expense", ruleGroup: "wants" },
  { id: "cat_health", name: "Health", emoji: "💊", color: "#00FFB2", type: "expense", ruleGroup: "needs" },
  { id: "cat_education", name: "Education", emoji: "📚", color: "#38BDF8", type: "expense", ruleGroup: "needs" },
  { id: "cat_salary", name: "Salary", emoji: "💼", color: "#00FFB2", type: "income", ruleGroup: "income" },
  { id: "cat_freelance", name: "Freelance", emoji: "💻", color: "#4F8EF7", type: "income", ruleGroup: "income" },
  { id: "cat_gifts", name: "Gifts", emoji: "🎁", color: "#F472B6", type: "income", ruleGroup: "income" },
  { id: "cat_savings", name: "Savings", emoji: "🏦", color: "#00FFB2", type: "saving", ruleGroup: "savings" },
];

export const GOAL_CATEGORIES = [
  "Emergency Fund",
  "Travel",
  "Gadget",
  "Education",
  "Vehicle",
  "Investment",
  "Home",
  "Other",
];

export const GOAL_ICONS = ["🚨", "✈️", "📱", "🎓", "🚗", "📈", "🏠", "💎", "💻", "🌍"];

export const TRANSACTION_EMOJIS = [
  "🍔", "☕", "🚕", "🛍️", "🎬", "🧾", "💊", "📚", "💼", "💻",
  "🏦", "🎁", "🍕", "⛽", "🏋️", "🎮", "🧴", "📦", "🚌", "🛒",
];

export const SUBSCRIPTION_PRESETS = [
  { keyword: "netflix", category: "Subscriptions", emoji: "🎬" },
  { keyword: "spotify", category: "Subscriptions", emoji: "🎵" },
  { keyword: "prime", category: "Subscriptions", emoji: "📦" },
  { keyword: "youtube", category: "Subscriptions", emoji: "▶️" },
  { keyword: "apple", category: "Subscriptions", emoji: "🍎" },
  { keyword: "google", category: "Subscriptions", emoji: "🔎" },
  { keyword: "chatgpt", category: "Subscriptions", emoji: "🤖" },
  { keyword: "gym", category: "Health", emoji: "🏋️" },
  { keyword: "uber", category: "Transport", emoji: "🚕" },
  { keyword: "zomato", category: "Food", emoji: "🍔" },
  { keyword: "swiggy", category: "Food", emoji: "🍔" },
  { keyword: "amazon", category: "Shopping", emoji: "🛍️" },
];

export const FINANCIAL_QUOTES = [
  "Do not save what is left after spending; spend what is left after saving.",
  "A budget is not restriction. It is permission to spend with confidence.",
  "Small daily savings quietly become big future freedom.",
  "Track your money today so your future self does not have to guess.",
  "The strongest financial habit is consistency, not perfection.",
  "Money becomes powerful when every rupee has a purpose.",
  "Your spending pattern is a story. FinanceFlow helps you read it.",
  "A good budget turns financial stress into financial control.",
];

export const KEYBOARD_SHORTCUTS = {
  newTransaction: "n",
  dashboard: "d",
  analytics: "a",
  close: "Escape",
};

export const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
};

export const DEMO_SUBSCRIPTIONS = [
  {
    id: "sub_netflix",
    service: "Netflix",
    emoji: "🎬",
    amount: 649,
    cycle: "monthly",
    nextBillingDate: null,
    category: "Subscriptions",
    autoPay: true,
  },
  {
    id: "sub_spotify",
    service: "Spotify",
    emoji: "🎵",
    amount: 119,
    cycle: "monthly",
    nextBillingDate: null,
    category: "Subscriptions",
    autoPay: true,
  },
  {
    id: "sub_cloud",
    service: "Cloud Storage",
    emoji: "☁️",
    amount: 199,
    cycle: "monthly",
    nextBillingDate: null,
    category: "Utilities",
    autoPay: false,
  },
];

export const DEMO_BUDGETS = [
  { id: "budget_food", category: "Food", limit: 8500, rollover: true, warningLevels: [75, 90, 100] },
  { id: "budget_transport", category: "Transport", limit: 4500, rollover: false, warningLevels: [75, 90, 100] },
  { id: "budget_entertainment", category: "Entertainment", limit: 3500, rollover: false, warningLevels: [75, 90, 100] },
  { id: "budget_shopping", category: "Shopping", limit: 6500, rollover: true, warningLevels: [75, 90, 100] },
];

export const DEMO_GOALS = [
  {
    id: "goal_emergency",
    name: "Emergency Fund",
    targetAmount: 60000,
    currentAmount: 22000,
    deadline: null,
    emoji: "🚨",
    priority: "high",
    category: "Emergency Fund",
    milestonesHit: [],
  },
  {
    id: "goal_laptop",
    name: "New Laptop",
    targetAmount: 85000,
    currentAmount: 28000,
    deadline: null,
    emoji: "💻",
    priority: "medium",
    category: "Gadget",
    milestonesHit: [],
  },
  {
    id: "goal_travel",
    name: "Travel Fund",
    targetAmount: 50000,
    currentAmount: 12500,
    deadline: null,
    emoji: "✈️",
    priority: "low",
    category: "Travel",
    milestonesHit: [],
  },
];

export const DEMO_TRANSACTIONS_RAW = [
  ["Salary Credit", "income", "Salary", 50000, "Bank Transfer", "Monthly income", ["salary"]],
  ["Freelance Website Fix", "income", "Freelance", 8500, "UPI", "Client payment", ["work"]],
  ["Zomato Dinner", "expense", "Food", 620, "UPI", "Dinner order", ["food"]],
  ["College Canteen", "expense", "Food", 180, "Cash", "Lunch", ["college"]],
  ["Metro Card Recharge", "expense", "Transport", 500, "UPI", "Travel recharge", ["commute"]],
  ["Uber Ride", "expense", "Transport", 340, "Card", "Cab to market", ["commute"]],
  ["Netflix", "expense", "Subscriptions", 649, "Card", "Monthly plan", ["subscription"]],
  ["Spotify", "expense", "Subscriptions", 119, "UPI", "Music plan", ["subscription"]],
  ["Amazon Order", "expense", "Shopping", 1850, "Card", "Accessories", ["shopping"]],
  ["Groceries", "expense", "Food", 2450, "UPI", "Weekly groceries", ["home"]],
  ["Movie Night", "expense", "Entertainment", 760, "UPI", "Cinema", ["fun"]],
  ["Phone Recharge", "expense", "Bills", 299, "UPI", "Mobile plan", ["utility"]],
  ["Medicine", "expense", "Health", 430, "Cash", "Pharmacy", ["health"]],
  ["Course Material", "expense", "Education", 1200, "Card", "Learning resources", ["study"]],
  ["Cafe Coffee", "expense", "Food", 260, "UPI", "Cafe work session", ["food"]],
  ["Gift Received", "income", "Gifts", 2500, "UPI", "Family gift", ["gift"]],
  ["Bus Ticket", "expense", "Transport", 90, "Cash", "Local bus", ["commute"]],
  ["Gaming Pass", "expense", "Entertainment", 499, "Card", "Game subscription", ["fun"]],
  ["Electricity Bill", "expense", "Bills", 1750, "Bank Transfer", "Monthly bill", ["home"]],
  ["Books", "expense", "Education", 950, "UPI", "Programming book", ["study"]],
  ["Snacks", "expense", "Food", 210, "Cash", "Evening snacks", ["food"]],
  ["Clothing", "expense", "Shopping", 2300, "Card", "New clothes", ["shopping"]],
  ["Doctor Visit", "expense", "Health", 900, "Cash", "Checkup", ["health"]],
  ["Cloud Storage", "expense", "Subscriptions", 199, "Card", "Storage plan", ["subscription"]],
  ["Stationery", "expense", "Education", 320, "UPI", "Notebook and pens", ["study"]],
  ["Restaurant", "expense", "Food", 1350, "Card", "Dinner outside", ["food"]],
  ["Fuel", "expense", "Transport", 1000, "UPI", "Scooter fuel", ["commute"]],
  ["Family Shopping", "expense", "Shopping", 1700, "UPI", "House items", ["shopping"]],
  ["Internet Bill", "expense", "Bills", 799, "Bank Transfer", "WiFi bill", ["utility"]],
  ["Savings Transfer", "expense", "Savings", 5000, "Bank Transfer", "Moved to savings", ["saving"]],
];

export const SCORE_WEIGHTS = {
  savingsRate: 30,
  budgetAdherence: 20,
  expenseConsistency: 15,
  goalProgress: 20,
  subscriptionRatio: 10,
  loggingStreak: 5,
};

export const SCORE_BADGES = [
  { min: 0, max: 399, label: "Poor", color: "#FF4757" },
  { min: 400, max: 549, label: "Fair", color: "#FFD166" },
  { min: 550, max: 699, label: "Good", color: "#4F8EF7" },
  { min: 700, max: 799, label: "Very Good", color: "#00FFB2" },
  { min: 800, max: 850, label: "Excellent", color: "#00FFB2" },
];

export const BILLING_CYCLES = [
  { value: "weekly", label: "Weekly", multiplier: 4.33 },
  { value: "monthly", label: "Monthly", multiplier: 1 },
  { value: "yearly", label: "Yearly", multiplier: 1 / 12 },
];

export const CHART_COLORS = [
  "#4F8EF7",
  "#7C3AED",
  "#00FFB2",
  "#FF4757",
  "#FFD166",
  "#FF9F43",
  "#38BDF8",
  "#F472B6",
  "#A78BFA",
  "#34D399",
];