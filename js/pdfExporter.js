/* =========================================================
   FinanceFlow — PDF Exporter
   File: js/pdfExporter.js
   ========================================================= */

import {
  APP_CONFIG,
} from "./config.js";

import {
  formatDate,
  formatMoney,
  getCurrentMonthRange,
  safeText,
  sum,
} from "./utils.js";

import {
  getState,
} from "./dataManager.js";

import {
  getDashboardSummary,
  getFinancialScore,
  getCategoryBreakdown,
  getBudgetUsage,
  getGoalProjection,
  getMonthlySubscriptionTotal,
} from "./analyticsEngine.js";

import {
  notifyPDFExported,
  showToast,
} from "./notificationSystem.js";

/* =========================================================
   PDF EXPORTER
   ========================================================= */

let exportInProgress = false;

/* =========================================================
   INIT
   ========================================================= */

export function initPDFExporter() {
  bindPDFExportEvents();

  console.log("📄 PDF Exporter Initialized");
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindPDFExportEvents() {
  const exportMonthBtn = document.querySelector("#exportMonthBtn");
  const exportCustomBtn = document.querySelector("#exportCustomBtn");

  exportMonthBtn?.addEventListener("click", () => {
    exportMonthlyReport();
  });

  exportCustomBtn?.addEventListener("click", () => {
    exportCustomRangeReport();
  });
}

/* =========================================================
   MAIN EXPORTS
   ========================================================= */

export async function exportMonthlyReport() {
  if (exportInProgress) return;

  const range = getCurrentMonthRange();

  await generatePDFReport({
    startDate: range.start,
    endDate: range.end,
    reportType: "monthly",
  });
}

export async function exportCustomRangeReport() {
  if (exportInProgress) return;

  const startInput = document.querySelector("#reportStartDate");
  const endInput = document.querySelector("#reportEndDate");

  const startDate = startInput?.value;
  const endDate = endInput?.value;

  if (!startDate || !endDate) {
    showToast({
      type: "warning",
      title: "Select Date Range",
      message: "Please choose both start and end dates.",
      icon: "📅",
    });

    return;
  }

  await generatePDFReport({
    startDate,
    endDate,
    reportType: "custom",
  });
}

/* =========================================================
   PDF GENERATION
   ========================================================= */

export async function generatePDFReport({
  startDate,
  endDate,
  reportType = "monthly",
} = {}) {
  if (exportInProgress) return;

  exportInProgress = true;

  showReportLoading(true);

  try {
    const state = getState();

    const transactions = filterTransactionsByDate(
      state.transactions,
      startDate,
      endDate
    );

    const reportData = buildReportData({
      state,
      transactions,
      startDate,
      endDate,
    });

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    generateCoverPage(doc, reportData);

    generateExecutiveSummary(doc, reportData);

    generateCategoryBreakdown(doc, reportData);

    generateTopTransactions(doc, reportData);

    generateBudgetSummary(doc, reportData);

    generateGoalsSummary(doc, reportData);

    generateSubscriptionSummary(doc, reportData);

    generateFooter(doc);

    const filename = createFilename(reportType);

    doc.save(filename);

    notifyPDFExported();

    showReportStatus(
      "success",
      `PDF report generated successfully: ${filename}`
    );
  } catch (error) {
    console.error("PDF generation failed:", error);

    showToast({
      type: "error",
      title: "PDF Export Failed",
      message: "Something went wrong while generating the report.",
      icon: "❌",
    });

    showReportStatus(
      "error",
      "Failed to generate report."
    );
  } finally {
    exportInProgress = false;

    showReportLoading(false);
  }
}

/* =========================================================
   REPORT DATA
   ========================================================= */

function buildReportData({
  state,
  transactions,
  startDate,
  endDate,
}) {
  const currency = state.settings.baseCurrency;

  const income = sum(
    transactions
      .filter((transaction) => transaction.type === "income")
      .map((transaction) => Number(transaction.amount || 0))
  );

  const expenses = sum(
    transactions
      .filter((transaction) => transaction.type === "expense")
      .map((transaction) => Number(transaction.amount || 0))
  );

  const savings = income - expenses;

  const dashboardSummary = getDashboardSummary(state);

  const score = getFinancialScore(state);

  const categories = getCategoryBreakdown({
    ...state,
    transactions,
  });

  const topTransactions = [...transactions]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    state,
    currency,
    startDate,
    endDate,
    income,
    expenses,
    savings,
    categories,
    score,
    topTransactions,
    dashboardSummary,
  };
}

/* =========================================================
   COVER PAGE
   ========================================================= */

function generateCoverPage(doc, data) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, pageWidth, 297, "F");

  doc.setTextColor(255, 255, 255);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);

  doc.text("FinanceFlow", 20, 50);

  doc.setFontSize(18);

  doc.text("Smart Financial Intelligence Report", 20, 65);

  doc.setDrawColor(79, 142, 247);
  doc.setLineWidth(1.2);

  doc.line(20, 75, 110, 75);

  doc.setFont("helvetica", "normal");

  doc.setFontSize(14);

  doc.text(
    `Prepared for: ${safeText(data.state.settings.name)}`,
    20,
    100
  );

  doc.text(
    `Date Range: ${formatDate(data.startDate)} → ${formatDate(data.endDate)}`,
    20,
    112
  );

  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    20,
    124
  );

  doc.setFillColor(79, 142, 247);
  doc.roundedRect(20, 150, 170, 65, 8, 8, "F");

  doc.setTextColor(255, 255, 255);

  doc.setFont("helvetica", "bold");

  doc.setFontSize(18);

  doc.text("Executive Snapshot", 30, 170);

  doc.setFontSize(13);

  doc.text(
    `Income: ${formatMoney(data.income, data.currency)}`,
    30,
    188
  );

  doc.text(
    `Expenses: ${formatMoney(data.expenses, data.currency)}`,
    30,
    200
  );

  doc.text(
    `Net Savings: ${formatMoney(data.savings, data.currency)}`,
    30,
    212
  );

  doc.addPage();
}

/* =========================================================
   EXECUTIVE SUMMARY
   ========================================================= */

function generateExecutiveSummary(doc, data) {
  addSectionTitle(
    doc,
    "📊 Executive Summary",
    20
  );

  drawMetricCard(
    doc,
    20,
    38,
    52,
    28,
    "Income",
    formatMoney(data.income, data.currency),
    [0, 255, 178]
  );

  drawMetricCard(
    doc,
    78,
    38,
    52,
    28,
    "Expenses",
    formatMoney(data.expenses, data.currency),
    [255, 71, 87]
  );

  drawMetricCard(
    doc,
    136,
    38,
    52,
    28,
    "Savings",
    formatMoney(data.savings, data.currency),
    [79, 142, 247]
  );

  drawMetricCard(
    doc,
    20,
    76,
    80,
    30,
    "Financial Score",
    `${data.score.score}/850`,
    [124, 58, 237]
  );

  drawMetricCard(
    doc,
    108,
    76,
    80,
    30,
    "Net Worth",
    formatMoney(
      data.dashboardSummary.netWorth,
      data.currency
    ),
    [255, 209, 102]
  );

  doc.setFont("helvetica", "bold");

  doc.setFontSize(14);

  doc.setTextColor(20, 25, 35);

  doc.text(
    "Financial Health",
    20,
    130
  );

  doc.setFont("helvetica", "normal");

  doc.setFontSize(11);

  doc.setTextColor(70, 70, 80);

  const healthText = generateHealthNarrative(data);

  const split = doc.splitTextToSize(
    healthText,
    170
  );

  doc.text(split, 20, 140);

  doc.addPage();
}

/* =========================================================
   CATEGORY BREAKDOWN
   ========================================================= */

function generateCategoryBreakdown(doc, data) {
  addSectionTitle(
    doc,
    "💸 Category-wise Expense Breakdown",
    20
  );

  const categories = data.categories;

  if (!categories.length) {
    doc.setFontSize(12);

    doc.text(
      "No expense categories available.",
      20,
      40
    );

    doc.addPage();

    return;
  }

  let y = 42;

  categories.forEach((category, index) => {
    if (y > 250) {
      doc.addPage();

      y = 30;
    }

    const percentage =
      data.expenses > 0
        ? ((category.amount / data.expenses) * 100).toFixed(1)
        : 0;

    doc.setFillColor(
      index % 2 === 0 ? 245 : 252,
      247,
      255
    );

    doc.roundedRect(
      20,
      y - 8,
      170,
      18,
      4,
      4,
      "F"
    );

    doc.setTextColor(20, 25, 35);

    doc.setFont("helvetica", "bold");

    doc.setFontSize(12);

    doc.text(
      `${category.emoji || "💳"} ${category.category}`,
      26,
      y
    );

    doc.setFont("helvetica", "normal");

    doc.text(
      formatMoney(category.amount, data.currency),
      120,
      y
    );

    doc.text(
      `${percentage}%`,
      170,
      y
    );

    y += 24;
  });

  doc.addPage();
}

/* =========================================================
   TOP TRANSACTIONS
   ========================================================= */

function generateTopTransactions(doc, data) {
  addSectionTitle(
    doc,
    "🔥 Top Transactions",
    20
  );

  let y = 42;

  data.topTransactions.forEach((transaction, index) => {
    doc.setFillColor(
      248,
      250,
      255
    );

    doc.roundedRect(
      20,
      y - 7,
      170,
      18,
      4,
      4,
      "F"
    );

    doc.setFont("helvetica", "bold");

    doc.setFontSize(11);

    doc.setTextColor(20, 25, 35);

    doc.text(
      `${index + 1}. ${safeText(transaction.name)}`,
      26,
      y
    );

    doc.setFont("helvetica", "normal");

    doc.text(
      formatMoney(transaction.amount, data.currency),
      145,
      y
    );

    y += 24;
  });

  doc.addPage();
}

/* =========================================================
   BUDGET SUMMARY
   ========================================================= */

function generateBudgetSummary(doc, data) {
  addSectionTitle(
    doc,
    "💰 Budget Performance",
    20
  );

  const budgets = data.state.budgets || [];

  if (!budgets.length) {
    doc.text(
      "No budgets created.",
      20,
      40
    );

    doc.addPage();

    return;
  }

  let y = 42;

  budgets.forEach((budget) => {
    const usage = getBudgetUsage(
      data.state,
      budget
    );

    const progress = Math.min(
      usage.percentage,
      100
    );

    doc.setFont("helvetica", "bold");

    doc.setFontSize(12);

    doc.text(
      `${budget.emoji || "📦"} ${budget.category}`,
      20,
      y
    );

    doc.setFont("helvetica", "normal");

    doc.text(
      `${formatMoney(
        usage.spent,
        data.currency
      )} / ${formatMoney(
        budget.amount,
        data.currency
      )}`,
      120,
      y
    );

    doc.setFillColor(230, 235, 245);

    doc.roundedRect(
      20,
      y + 5,
      160,
      6,
      3,
      3,
      "F"
    );

    if (progress < 75) {
      doc.setFillColor(0, 255, 178);
    } else if (progress < 100) {
      doc.setFillColor(255, 209, 102);
    } else {
      doc.setFillColor(255, 71, 87);
    }

    doc.roundedRect(
      20,
      y + 5,
      1.6 * progress,
      6,
      3,
      3,
      "F"
    );

    y += 28;

    if (y > 250) {
      doc.addPage();

      y = 30;
    }
  });

  doc.addPage();
}

/* =========================================================
   GOALS SUMMARY
   ========================================================= */

function generateGoalsSummary(doc, data) {
  addSectionTitle(
    doc,
    "🎯 Savings Goals",
    20
  );

  const goals = data.state.goals || [];

  if (!goals.length) {
    doc.text(
      "No goals available.",
      20,
      40
    );

    doc.addPage();

    return;
  }

  let y = 42;

  goals.forEach((goal) => {
    const progress =
      goal.targetAmount > 0
        ? (
            (goal.currentAmount /
              goal.targetAmount) *
            100
          ).toFixed(1)
        : 0;

    const projection =
      getGoalProjection(goal);

    doc.setFillColor(
      248,
      250,
      255
    );

    doc.roundedRect(
      20,
      y - 8,
      170,
      32,
      5,
      5,
      "F"
    );

    doc.setFont("helvetica", "bold");

    doc.setFontSize(12);

    doc.text(
      `${goal.emoji || "🎯"} ${safeText(goal.name)}`,
      26,
      y
    );

    doc.setFont("helvetica", "normal");

    doc.setFontSize(10);

    doc.text(
      `Progress: ${progress}%`,
      26,
      y + 10
    );

    doc.text(
      `Projected Completion: ${projection.text}`,
      26,
      y + 18
    );

    doc.text(
      formatMoney(
        goal.currentAmount,
        data.currency
      ),
      150,
      y
    );

    y += 42;

    if (y > 250) {
      doc.addPage();

      y = 30;
    }
  });

  doc.addPage();
}

/* =========================================================
   SUBSCRIPTIONS
   ========================================================= */

function generateSubscriptionSummary(doc, data) {
  addSectionTitle(
    doc,
    "🔄 Subscription Summary",
    20
  );

  const subscriptions =
    data.state.subscriptions || [];

  const monthlyTotal =
    getMonthlySubscriptionTotal(data.state);

  doc.setFont("helvetica", "bold");

  doc.setFontSize(14);

  doc.text(
    `Monthly Subscription Cost: ${formatMoney(monthlyTotal, data.currency)}`,
    20,
    40
  );

  let y = 58;

  subscriptions.forEach((subscription) => {
    doc.setFillColor(
      248,
      250,
      255
    );

    doc.roundedRect(
      20,
      y - 7,
      170,
      18,
      4,
      4,
      "F"
    );

    doc.setFont("helvetica", "bold");

    doc.setFontSize(11);

    doc.text(
      safeText(subscription.name),
      26,
      y
    );

    doc.setFont("helvetica", "normal");

    doc.text(
      `${formatMoney(
        subscription.amount,
        data.currency
      )} / ${subscription.billingCycle}`,
      110,
      y
    );

    doc.text(
      formatDate(subscription.nextBillingDate),
      155,
      y
    );

    y += 24;

    if (y > 250) {
      doc.addPage();

      y = 30;
    }
  });
}

/* =========================================================
   FOOTER
   ========================================================= */

function generateFooter(doc) {
  const pages =
    doc.internal.getNumberOfPages();

  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const pageWidth =
      doc.internal.pageSize.getWidth();

    doc.setDrawColor(220, 225, 235);

    doc.line(
      20,
      pageHeight - 16,
      pageWidth - 20,
      pageHeight - 16
    );

    doc.setFont("helvetica", "normal");

    doc.setFontSize(9);

    doc.setTextColor(120, 120, 130);

    doc.text(
      `Generated by FinanceFlow v${APP_CONFIG.version}`,
      20,
      pageHeight - 8
    );

    doc.text(
      `Page ${i} of ${pages}`,
      pageWidth - 40,
      pageHeight - 8
    );
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function addSectionTitle(doc, title, y) {
  doc.setFont("helvetica", "bold");

  doc.setFontSize(20);

  doc.setTextColor(20, 25, 35);

  doc.text(title, 20, y);
}

function drawMetricCard(
  doc,
  x,
  y,
  width,
  height,
  title,
  value,
  color
) {
  doc.setFillColor(
    color[0],
    color[1],
    color[2]
  );

  doc.roundedRect(
    x,
    y,
    width,
    height,
    6,
    6,
    "F"
  );

  doc.setTextColor(255, 255, 255);

  doc.setFont("helvetica", "bold");

  doc.setFontSize(10);

  doc.text(title, x + 8, y + 10);

  doc.setFontSize(15);

  doc.text(value, x + 8, y + 21);
}

function generateHealthNarrative(data) {
  const score = data.score.score;

  if (score >= 750) {
    return "Your finances are in excellent condition. Strong savings habits, balanced budgeting, and healthy spending patterns are helping you stay financially resilient.";
  }

  if (score >= 650) {
    return "Your finances are stable and improving. Continue maintaining consistent savings and budget discipline to further strengthen your financial health.";
  }

  if (score >= 500) {
    return "Your financial position is average. Consider reducing discretionary spending and increasing savings contributions to improve long-term stability.";
  }

  return "Your finances need attention. Focus on controlling overspending, creating emergency savings, and tracking expenses consistently.";
}

function filterTransactionsByDate(
  transactions,
  startDate,
  endDate
) {
  return transactions.filter(
    (transaction) =>
      transaction.date >= startDate &&
      transaction.date <= endDate
  );
}

function createFilename(type) {
  const now = new Date();

  const date =
    now.toISOString().slice(0, 10);

  return `financeflow-${type}-report-${date}.pdf`;
}

/* =========================================================
   REPORT UI HELPERS
   ========================================================= */

function showReportLoading(show = true) {
  const loading =
    document.querySelector("#reportLoading");

  if (!loading) return;

  loading.style.display = show
    ? "flex"
    : "none";
}

function showReportStatus(
  type = "success",
  message = ""
) {
  const status =
    document.querySelector("#reportStatus");

  if (!status) return;

  status.className =
    `report-status ${type}`;

  status.innerHTML = `
    <strong>
      ${type === "success" ? "✅ Success" : "❌ Error"}
    </strong>

    <p>${safeText(message)}</p>
  `;

  status.style.display = "block";

  setTimeout(() => {
    status.style.display = "none";
  }, 5000);
}

/* =========================================================
   COMPATIBILITY EXPORT ALIASES
   ========================================================= */

export const exportMonthlyPDFReport = exportMonthlyReport;

export const exportCustomPDFReport = exportCustomRangeReport;