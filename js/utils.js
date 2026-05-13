/* =========================================================
   FinanceFlow — Utilities
   File: js/utils.js
   ========================================================= */

import {
  CURRENCIES,
  EXCHANGE_RATES_INR_BASE,
  CHART_COLORS,
} from "./config.js";

/* ---------- DOM Helpers ---------- */

export const $ = (selector, parent = document) => parent.querySelector(selector);

export const $$ = (selector, parent = document) => {
  return Array.from(parent.querySelectorAll(selector));
};

export function createEl(tag, className = "", html = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (html) element.innerHTML = html;
  return element;
}

export function clearEl(element) {
  if (element) element.innerHTML = "";
}

export function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- IDs / Clone ---------- */

export function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/* ---------- Currency Helpers ---------- */

export function getCurrency(code = "INR") {
  return CURRENCIES.find((currency) => currency.code === code) || CURRENCIES[0];
}

export function convertCurrency(amount, from = "INR", to = "INR") {
  const numericAmount = Number(amount) || 0;

  if (from === to) return numericAmount;

  const fromRate = EXCHANGE_RATES_INR_BASE[from] || 1;
  const toRate = EXCHANGE_RATES_INR_BASE[to] || 1;

  const amountInINR = numericAmount / fromRate;
  return amountInINR * toRate;
}

export function formatMoney(amount, currencyCode = "INR", compact = false) {
  const currency = getCurrency(currencyCode);
  const numericAmount = Number(amount) || 0;

  if (compact && Math.abs(numericAmount) >= 100000) {
    return `${currency.symbol}${(numericAmount / 100000).toFixed(1)}L`;
  }

  if (compact && Math.abs(numericAmount) >= 1000) {
    return `${currency.symbol}${(numericAmount / 1000).toFixed(1)}K`;
  }

  return `${currency.symbol}${Math.round(numericAmount).toLocaleString("en-IN")}`;
}

export function formatSignedMoney(amount, currencyCode = "INR") {
  const numericAmount = Number(amount) || 0;
  const sign = numericAmount >= 0 ? "+" : "-";
  return `${sign}${formatMoney(Math.abs(numericAmount), currencyCode)}`;
}

/* ---------- Date Helpers ---------- */

export function toISODate(date = new Date()) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function todayISO() {
  return toISODate(new Date());
}

export function getMonthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: toISODate(start),
    end: toISODate(end),
  };
}

export function getLastSixMonthKeys() {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthKey(date));
  }

  return months;
}

export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return toISODate(d);
}

export function formatDate(dateInput, options = {}) {
  if (!dateInput) return "—";

  const date = new Date(dateInput);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: options.short ? "short" : "long",
    year: options.noYear ? undefined : "numeric",
  });
}

export function formatDateTime(dateInput = new Date()) {
  return new Date(dateInput).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRelativeTime(dateInput) {
  const date = new Date(dateInput);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isWithinRange(date, start, end) {
  const value = toISODate(date);
  if (start && value < start) return false;
  if (end && value > end) return false;
  return true;
}

export function isSameDay(a, b) {
  return toISODate(a) === toISODate(b);
}

export function isCurrentMonth(date) {
  return getMonthKey(date) === getMonthKey(new Date());
}

export function getDaysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

export function getDayName(dateInput, short = true) {
  return new Date(dateInput).toLocaleDateString("en-IN", {
    weekday: short ? "short" : "long",
  });
}

/* ---------- Math Helpers ---------- */

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function percent(value, total) {
  if (!total) return 0;
  return clamp((Number(value) / Number(total)) * 100, 0, 999);
}

export function average(values = []) {
  const nums = values.map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export function sum(values = []) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

/* ---------- Transaction Helpers ---------- */

export function getCategoryByName(categories, name) {
  return categories.find(
    (category) => category.name.toLowerCase() === String(name).toLowerCase()
  );
}

export function filterTransactions(transactions, filters = {}) {
  return transactions.filter((transaction) => {
    const amount = Number(transaction.amount) || 0;
    const search = String(filters.search || "").toLowerCase().trim();

    if (search) {
      const haystack = [
        transaction.name,
        transaction.note,
        transaction.category,
        transaction.method,
        ...(transaction.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    if (filters.type && filters.type !== "all" && transaction.type !== filters.type) {
      return false;
    }

    if (
      filters.category &&
      filters.category !== "all" &&
      transaction.category !== filters.category
    ) {
      return false;
    }

    if (filters.startDate && transaction.date < filters.startDate) return false;
    if (filters.endDate && transaction.date > filters.endDate) return false;

    if (filters.minAmount !== "" && filters.minAmount != null) {
      if (amount < Number(filters.minAmount)) return false;
    }

    if (filters.maxAmount !== "" && filters.maxAmount != null) {
      if (amount > Number(filters.maxAmount)) return false;
    }

    return true;
  });
}

export function getTransactionTotals(transactions = []) {
  const income = sum(
    transactions
      .filter((transaction) => transaction.type === "income")
      .map((transaction) => transaction.amount)
  );

  const expenses = sum(
    transactions
      .filter((transaction) => transaction.type === "expense")
      .map((transaction) => transaction.amount)
  );

  return {
    income,
    expenses,
    savings: income - expenses,
    balance: income - expenses,
  };
}

export function groupByCategory(transactions = [], type = "expense") {
  const map = new Map();

  transactions
    .filter((transaction) => !type || transaction.type === type)
    .forEach((transaction) => {
      const key = transaction.category || "Other";
      map.set(key, (map.get(key) || 0) + Number(transaction.amount || 0));
    });

  return Array.from(map.entries())
    .map(([category, amount], index) => ({
      category,
      amount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function groupByDate(transactions = [], type = "expense") {
  const map = new Map();

  transactions
    .filter((transaction) => !type || transaction.type === type)
    .forEach((transaction) => {
      const key = transaction.date;
      map.set(key, (map.get(key) || 0) + Number(transaction.amount || 0));
    });

  return map;
}

export function groupByMonth(transactions = []) {
  const map = new Map();

  transactions.forEach((transaction) => {
    const month = getMonthKey(transaction.date);

    if (!map.has(month)) {
      map.set(month, { income: 0, expenses: 0 });
    }

    const current = map.get(month);

    if (transaction.type === "income") {
      current.income += Number(transaction.amount || 0);
    } else {
      current.expenses += Number(transaction.amount || 0);
    }
  });

  return map;
}

export function sortByDateDesc(items = []) {
  return [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ---------- CSV Helpers ---------- */

export function parseCSV(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const parseLine = (line) => {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/\s+/g, "")
  );

  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });
}

/* ---------- File Helpers ---------- */

export function downloadTextFile(filename, content, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));

    reader.readAsText(file);
  });
}

/* ---------- Animation Helpers ---------- */

export function animateNumber(element, from, to, formatter = (v) => v, duration = 850) {
  if (!element) return;

  const start = performance.now();
  const startValue = Number(from) || 0;
  const endValue = Number(to) || 0;

  function frame(now) {
    const progress = clamp((now - start) / duration, 0, 1);
    const eased = 1 - (1 - progress) ** 3;
    const value = startValue + (endValue - startValue) * eased;

    element.textContent = formatter(value);

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

export function setProgressBar(element, value, max = 100) {
  if (!element) return;

  const percentage = clamp((Number(value) / Number(max || 1)) * 100, 0, 140);
  requestAnimationFrame(() => {
    element.style.width = `${Math.min(percentage, 100)}%`;
  });
}

export function showSavedIndicator() {
  const indicator = $("#savedIndicator");
  if (!indicator) return;

  indicator.classList.add("show");

  window.clearTimeout(showSavedIndicator.timer);
  showSavedIndicator.timer = window.setTimeout(() => {
    indicator.classList.remove("show");
  }, 950);
}

/* ---------- Timing Helpers ---------- */

export function debounce(callback, delay = 250) {
  let timer;

  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}

export function throttle(callback, delay = 250) {
  let waiting = false;

  return (...args) => {
    if (waiting) return;

    callback(...args);
    waiting = true;

    window.setTimeout(() => {
      waiting = false;
    }, delay);
  };
}

/* ---------- Confetti ---------- */

export function fireConfetti(options = {}) {
  if (typeof window.confetti !== "function") return;

  window.confetti({
    particleCount: options.particleCount || 140,
    spread: options.spread || 80,
    origin: options.origin || { y: 0.68 },
  });
}

/* ---------- Streak Helpers ---------- */

export function calculateLoggingStreak(transactions = []) {
  const dates = new Set(transactions.map((transaction) => transaction.date));
  let streak = 0;
  let cursor = todayISO();

  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/* ---------- Subscription Helpers ---------- */

export function getMonthlySubscriptionCost(subscription) {
  const amount = Number(subscription.amount) || 0;

  if (subscription.cycle === "weekly") return amount * 4.33;
  if (subscription.cycle === "yearly") return amount / 12;

  return amount;
}

export function getYearlySubscriptionCost(subscription) {
  return getMonthlySubscriptionCost(subscription) * 12;
}

export function daysUntil(dateInput) {
  return daysBetween(todayISO(), dateInput);
}

/* ---------- Chart / SVG Helpers ---------- */

export function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export function showTooltip(event, html) {
  const tooltip = $("#chartTooltip");
  if (!tooltip) return;

  tooltip.innerHTML = html;
  tooltip.style.opacity = "1";
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
}

export function hideTooltip() {
  const tooltip = $("#chartTooltip");
  if (!tooltip) return;
  tooltip.style.opacity = "0";
}

export function svgToPngDownload(svgElement, filename = "financeflow-chart.png") {
  if (!svgElement) return;

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = svgElement.clientWidth * 2 || 1200;
    canvas.height = svgElement.clientHeight * 2 || 800;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0A0F1E";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(pngUrl);
    });
  };

  image.src = url;
}

/* ---------- Smart Helpers ---------- */

export function getSmartCategorySuggestion(name = "", presets = []) {
  const lower = String(name).toLowerCase();

  return presets.find((preset) => lower.includes(preset.keyword)) || null;
}

export function getRandomItem(items = []) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

export function normalizeTags(value) {
  if (Array.isArray(value)) return value;

  return String(value || "")
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
}

export function getSeverityByPercent(value) {
  if (value >= 100) return "danger";
  if (value >= 75) return "warn";
  return "good";
}

/* =========================================================
   COMPATIBILITY EXPORT ALIASES
   ========================================================= */

export const downloadBlob = (content, filename = "financeflow-download.txt", type = "text/plain") => {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
};