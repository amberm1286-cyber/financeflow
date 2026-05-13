/* =========================================================
   FinanceFlow — Chart Manager
   File: js/chartManager.js
   ========================================================= */

import {
  CHART_COLORS,
} from "./config.js";

import {
  $,
  clearEl,
  formatMoney,
  getDaysInCurrentMonth,
  hideTooltip,
  showTooltip,
  svgToPngDownload,
} from "./utils.js";

import {
  getCategoryBreakdown,
  getDailyBalanceTrend,
  getDailySpendingMap,
  getDayOfWeekPattern,
  getIncomeExpenseByMonth,
} from "./analyticsEngine.js";

let incomeExpenseChartInstance = null;
let dayPatternChartInstance = null;

/* ---------- Main Render ---------- */

export function renderAllCharts(state) {
  renderSpendingHeatmap(state);
  renderCategoryDonut(state);
  renderIncomeExpenseChart(state);
  renderTrendLineChart(state);
  renderDayPatternChart(state);
}

/* ---------- Heatmap ---------- */

export function renderSpendingHeatmap(state) {
  const container = $("#spendingHeatmap");
  if (!container) return;

  clearEl(container);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyMap = getDailySpendingMap(state);
  const days = getDaysInCurrentMonth();
  const maxSpend = Math.max(...Array.from(dailyMap.values()), 1);

  const header = document.createElement("div");
  header.className = "heatmap-header";

  dayNames.forEach((day) => {
    const span = document.createElement("span");
    span.textContent = day;
    header.appendChild(span);
  });

  const grid = document.createElement("div");
  grid.className = "heatmap-grid";

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

  for (let i = 0; i < firstDay; i += 1) {
    const blank = document.createElement("div");
    blank.className = "heatmap-cell level-0";
    blank.style.opacity = "0.25";
    grid.appendChild(blank);
  }

  for (let day = 1; day <= days; day += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    const iso = date.toISOString().slice(0, 10);
    const amount = dailyMap.get(iso) || 0;
    const intensity = amount / maxSpend;

    let level = 0;
    if (intensity > 0.01) level = 1;
    if (intensity > 0.25) level = 2;
    if (intensity > 0.55) level = 3;
    if (intensity > 0.8) level = 4;

    const cell = document.createElement("button");
    cell.className = `heatmap-cell level-${level}`;
    cell.textContent = day;
    cell.title = `${iso}: ${formatMoney(amount, state.settings.baseCurrency)}`;

    cell.addEventListener("mouseenter", (event) => {
      showTooltip(
        event,
        `<strong>${iso}</strong><br>${formatMoney(
          amount,
          state.settings.baseCurrency
        )} spent`
      );
    });

    cell.addEventListener("mousemove", (event) => {
      showTooltip(
        event,
        `<strong>${iso}</strong><br>${formatMoney(
          amount,
          state.settings.baseCurrency
        )} spent`
      );
    });

    cell.addEventListener("mouseleave", hideTooltip);

    grid.appendChild(cell);
  }

  const legend = document.createElement("div");
  legend.className = "heatmap-legend";
  legend.innerHTML = `
    <span>Less</span>
    <span class="heatmap-legend-box level-0"></span>
    <span class="heatmap-legend-box level-1"></span>
    <span class="heatmap-legend-box level-2"></span>
    <span class="heatmap-legend-box level-3"></span>
    <span class="heatmap-legend-box level-4"></span>
    <span>More</span>
  `;

  container.appendChild(header);
  container.appendChild(grid);
  container.appendChild(legend);
}

/* ---------- Donut Chart ---------- */

export function renderCategoryDonut(state) {
  const container = $("#categoryDonut");
  if (!container) return;

  clearEl(container);

  const data = getCategoryBreakdown(state);
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (!data.length || total <= 0) {
    container.innerHTML = `<div class="empty-state">No expense data yet.</div>`;
    return;
  }

  const size = 240;
  const radius = 86;
  const circumference = 2 * Math.PI * radius;

  const wrap = document.createElement("div");
  wrap.className = "donut-wrap";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "donut-svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  let offset = 0;

  data.forEach((item, index) => {
    const segment = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const percentage = item.amount / total;
    const dash = percentage * circumference;
    const color = item.color || CHART_COLORS[index % CHART_COLORS.length];

    segment.setAttribute("class", "donut-segment");
    segment.setAttribute("cx", size / 2);
    segment.setAttribute("cy", size / 2);
    segment.setAttribute("r", radius);
    segment.setAttribute("stroke", color);
    segment.setAttribute("stroke-dasharray", `${dash} ${circumference - dash}`);
    segment.setAttribute("stroke-dashoffset", -offset);

    segment.addEventListener("mouseenter", (event) => {
      showTooltip(
        event,
        `<strong>${item.category}</strong><br>${formatMoney(
          item.amount,
          state.settings.baseCurrency
        )}`
      );
    });

    segment.addEventListener("mousemove", (event) => {
      showTooltip(
        event,
        `<strong>${item.category}</strong><br>${formatMoney(
          item.amount,
          state.settings.baseCurrency
        )}`
      );
    });

    segment.addEventListener("mouseleave", hideTooltip);

    svg.appendChild(segment);
    offset += dash;
  });

  const center = document.createElement("div");
  center.className = "donut-center";
  center.innerHTML = `
    <strong>${formatMoney(total, state.settings.baseCurrency, true)}</strong>
    <span>Total spent</span>
  `;

  wrap.appendChild(svg);
  wrap.appendChild(center);

  const legend = document.createElement("div");
  legend.className = "chart-legend";

  data.forEach((item, index) => {
    const color = item.color || CHART_COLORS[index % CHART_COLORS.length];
    const row = document.createElement("div");
    row.className = "legend-item";
    row.innerHTML = `
      <span class="legend-dot" style="background:${color}"></span>
      <strong>${item.category}</strong>
      <span>${formatMoney(item.amount, state.settings.baseCurrency, true)}</span>
    `;
    legend.appendChild(row);
  });

  container.appendChild(wrap);
  container.appendChild(legend);
}

/* ---------- Income vs Expense Chart.js ---------- */

export function renderIncomeExpenseChart(state) {
  const canvas = $("#incomeExpenseChart");
  if (!canvas || typeof Chart === "undefined") return;

  const data = getIncomeExpenseByMonth(state);
  const labels = data.map((item) => item.month.slice(5));

  if (incomeExpenseChartInstance) {
    incomeExpenseChartInstance.destroy();
  }

  incomeExpenseChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: data.map((item) => item.income),
          backgroundColor: "rgba(0, 255, 178, 0.65)",
          borderColor: "rgba(0, 255, 178, 1)",
          borderWidth: 1,
          borderRadius: 10,
        },
        {
          label: "Expense",
          data: data.map((item) => item.expenses),
          backgroundColor: "rgba(255, 71, 87, 0.65)",
          borderColor: "rgba(255, 71, 87, 1)",
          borderWidth: 1,
          borderRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: "easeOutQuart",
      },
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text"),
            font: {
              weight: "bold",
            },
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatMoney(
                context.raw,
                state.settings.baseCurrency
              )}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--muted"),
          },
          grid: {
            color: "rgba(255,255,255,0.06)",
          },
        },
        y: {
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--muted"),
            callback(value) {
              return formatMoney(value, state.settings.baseCurrency, true);
            },
          },
          grid: {
            color: "rgba(255,255,255,0.06)",
          },
        },
      },
    },
  });
}

/* ---------- Trend Line SVG ---------- */

export function renderTrendLineChart(state) {
  const container = $("#trendLineChart");
  if (!container) return;

  clearEl(container);

  const data = getDailyBalanceTrend(state);

  if (!data.length) {
    container.innerHTML = `<div class="empty-state">No trend data yet.</div>`;
    return;
  }

  const width = 720;
  const height = 260;
  const padding = 34;

  const values = data.map((item) => item.balance);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  const xScale = (index) => {
    return padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
  };

  const yScale = (value) => {
    return height - padding - ((value - min) / range) * (height - padding * 2);
  };

  const points = data.map((item, index) => ({
    x: xScale(index),
    y: yScale(item.balance),
    ...item,
  }));

  const path = buildSmoothPath(points);
  const areaPath = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "trend-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  svg.innerHTML = `
    <defs>
      <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#4F8EF7" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <line class="chart-grid-line" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}"></line>
    <line class="chart-grid-line" x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}"></line>
    <path class="trend-area" d="${areaPath}"></path>
    <path class="trend-line" d="${path}"></path>
  `;

  points.forEach((point) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "trend-point");
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", 4);

    circle.addEventListener("mouseenter", (event) => {
      showTooltip(
        event,
        `<strong>Day ${point.day}</strong><br>Balance: ${formatMoney(
          point.balance,
          state.settings.baseCurrency
        )}`
      );
    });

    circle.addEventListener("mousemove", (event) => {
      showTooltip(
        event,
        `<strong>Day ${point.day}</strong><br>Balance: ${formatMoney(
          point.balance,
          state.settings.baseCurrency
        )}`
      );
    });

    circle.addEventListener("mouseleave", hideTooltip);

    svg.appendChild(circle);
  });

  container.appendChild(svg);
}

/* ---------- Radar Chart.js ---------- */

export function renderDayPatternChart(state) {
  const canvas = $("#dayPatternChart");
  if (!canvas || typeof Chart === "undefined") return;

  const data = getDayOfWeekPattern(state);

  if (dayPatternChartInstance) {
    dayPatternChartInstance.destroy();
  }

  dayPatternChartInstance = new Chart(canvas, {
    type: "radar",
    data: {
      labels: data.map((item) => item.day),
      datasets: [
        {
          label: "Spending",
          data: data.map((item) => item.amount),
          backgroundColor: "rgba(124, 58, 237, 0.22)",
          borderColor: "rgba(124, 58, 237, 1)",
          pointBackgroundColor: "rgba(0, 255, 178, 1)",
          pointBorderColor: "#0A0F1E",
          pointHoverRadius: 6,
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
      },
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text"),
            font: {
              weight: "bold",
            },
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              return formatMoney(context.raw, state.settings.baseCurrency);
            },
          },
        },
      },
      scales: {
        r: {
          angleLines: {
            color: "rgba(255,255,255,0.08)",
          },
          grid: {
            color: "rgba(255,255,255,0.08)",
          },
          pointLabels: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--text-soft"),
            font: {
              weight: "bold",
            },
          },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue("--muted"),
            backdropColor: "transparent",
            callback(value) {
              return formatMoney(value, state.settings.baseCurrency, true);
            },
          },
        },
      },
    },
  });
}

/* ---------- Export ---------- */

export function exportVisibleChartAsPng() {
  const svg =
    $("#trendLineChart svg") ||
    $("#categoryDonut svg") ||
    $("#spendingHeatmap svg");

  if (svg) {
    svgToPngDownload(svg, "financeflow-chart.png");
    return true;
  }

  const canvas = $("#incomeExpenseChart") || $("#dayPatternChart");

  if (canvas) {
    const link = document.createElement("a");
    link.download = "financeflow-chart.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    return true;
  }

  return false;
}

/* ---------- Helpers ---------- */

function buildSmoothPath(points) {
  if (!points.length) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];

    const controlX = (previous.x + current.x) / 2;

    path += ` C ${controlX} ${previous.y}, ${controlX} ${current.y}, ${current.x} ${current.y}`;
  }

  return path;
}

/* =========================================================
   COMPATIBILITY EXPORT ALIASES
   ========================================================= */

export const exportChartAsPNG = (selectorOrId = "") => {
  const id = String(selectorOrId).replace("#", "");
  const element = document.getElementById(id) || document.querySelector(selectorOrId);

  if (!element) return;

  if (element.tagName?.toLowerCase() === "svg") {
    svgToPngDownload(element, `${id || "financeflow-chart"}.png`);
  }
};