/* =========================================================
   FinanceFlow — Analytics Engine
   File: js/analyticsEngine.js
   ========================================================= */

import {
  SCORE_WEIGHTS,
  SCORE_BADGES,
} from "./config.js";

import {
  average,
  calculateLoggingStreak,
  clamp,
  daysBetween,
  formatMoney,
  getCurrentMonthRange,
  getDaysInCurrentMonth,
  getLastSixMonthKeys,
  getMonthlySubscriptionCost,
  getTransactionTotals,
  groupByCategory,
  groupByDate,
  groupByMonth,
  isCurrentMonth,
  percent,
  round,
  sum,
  todayISO,
} from "./utils.js";

/* ---------- Dashboard Summary ---------- */

export function getCurrentMonthTransactions(transactions = []) {
  return transactions.filter((transaction) => isCurrentMonth(transaction.date));
}

export function getDashboardSummary(state) {
  const currentTransactions = getCurrentMonthTransactions(state.transactions);
  const totals = getTransactionTotals(currentTransactions);

  const allIncome = sum(
    state.transactions
      .filter((transaction) => transaction.type === "income")
      .map((transaction) => transaction.amount)
  );

  const allExpenses = sum(
    state.transactions
      .filter((transaction) => transaction.type === "expense")
      .map((transaction) => transaction.amount)
  );

  const netWorth = calculateNetWorth(state);

  return {
    monthlyIncome: totals.income,
    monthlyExpenses: totals.expenses,
    netSavings: totals.savings,
    totalBalance: allIncome - allExpenses,
    netWorth,
    savingsRate: totals.income ? round((totals.savings / totals.income) * 100, 1) : 0,
  };
}

export function getTodaySummary(transactions = []) {
  const today = todayISO();

  const todayTransactions = transactions.filter(
    (transaction) => transaction.date === today
  );

  const total = sum(
    todayTransactions
      .filter((transaction) => transaction.type === "expense")
      .map((transaction) => transaction.amount)
  );

  return {
    transactions: todayTransactions,
    total,
  };
}

/* ---------- Category Analytics ---------- */

export function getTopCategoriesThisMonth(state, limit = 3) {
  const currentTransactions = getCurrentMonthTransactions(state.transactions);
  return groupByCategory(currentTransactions, "expense").slice(0, limit);
}

export function getCategoryBreakdown(state) {
  const currentTransactions = getCurrentMonthTransactions(state.transactions);
  return groupByCategory(currentTransactions, "expense");
}

export function getDailySpendingMap(state) {
  const currentTransactions = getCurrentMonthTransactions(state.transactions);
  return groupByDate(currentTransactions, "expense");
}

export function getIncomeExpenseByMonth(state) {
  const monthMap = groupByMonth(state.transactions);
  const monthKeys = getLastSixMonthKeys();

  return monthKeys.map((month) => {
    const values = monthMap.get(month) || { income: 0, expenses: 0 };

    return {
      month,
      income: values.income,
      expenses: values.expenses,
    };
  });
}

export function getDailyBalanceTrend(state) {
  const { start } = getCurrentMonthRange();
  const days = getDaysInCurrentMonth();
  const result = [];

  let runningBalance = 0;

  for (let day = 1; day <= days; day += 1) {
    const date = new Date(start);
    date.setDate(day);

    const iso = date.toISOString().slice(0, 10);

    const dayTransactions = state.transactions.filter(
      (transaction) => transaction.date === iso
    );

    dayTransactions.forEach((transaction) => {
      if (transaction.type === "income") {
        runningBalance += Number(transaction.amount) || 0;
      } else {
        runningBalance -= Number(transaction.amount) || 0;
      }
    });

    result.push({
      date: iso,
      day,
      balance: runningBalance,
    });
  }

  return result;
}

export function getDayOfWeekPattern(state) {
  const totals = {
    Sun: 0,
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
  };

  const names = Object.keys(totals);

  getCurrentMonthTransactions(state.transactions)
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const day = names[new Date(transaction.date).getDay()];
      totals[day] += Number(transaction.amount) || 0;
    });

  return names.map((day) => ({
    day,
    amount: totals[day],
  }));
}

export function compareDateRanges(state, rangeA, rangeB) {
  const getTotal = (range) => {
    const transactions = state.transactions.filter((transaction) => {
      return transaction.date >= range.start && transaction.date <= range.end;
    });

    return getTransactionTotals(transactions);
  };

  const a = getTotal(rangeA);
  const b = getTotal(rangeB);

  const difference = a.expenses - b.expenses;
  const differencePercent = b.expenses ? (difference / b.expenses) * 100 : 0;

  return {
    rangeA: a,
    rangeB: b,
    difference,
    differencePercent: round(differencePercent, 1),
  };
}

/* ---------- Budget Analytics ---------- */

export function getBudgetUsage(state, budget) {
  const spent = sum(
    state.transactions
      .filter((transaction) => {
        return (
          transaction.type === "expense" &&
          transaction.category === budget.category &&
          transaction.date.startsWith(budget.month)
        );
      })
      .map((transaction) => transaction.amount)
  );

  const limit = Number(budget.limit) || 0;
  const usedPercent = percent(spent, limit);
  const remaining = limit - spent;

  return {
    ...budget,
    spent,
    limit,
    remaining,
    usedPercent,
    status:
      usedPercent >= 100 ? "danger" : usedPercent >= 75 ? "warn" : "good",
  };
}

export function getAllBudgetUsage(state) {
  return state.budgets.map((budget) => getBudgetUsage(state, budget));
}

export function getSuggestedBudget(state, categoryName) {
  const monthlyMap = new Map();

  state.transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.category === categoryName
    )
    .forEach((transaction) => {
      const month = transaction.date.slice(0, 7);
      monthlyMap.set(
        month,
        (monthlyMap.get(month) || 0) + Number(transaction.amount || 0)
      );
    });

  const values = Array.from(monthlyMap.values()).slice(-3);
  const suggested = average(values);

  return Math.round(suggested || 0);
}

export function getBudgetHistory(state, categoryName) {
  const months = getLastSixMonthKeys();

  return months.map((month) => {
    const spent = sum(
      state.transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" &&
            transaction.category === categoryName &&
            transaction.date.startsWith(month)
        )
        .map((transaction) => transaction.amount)
    );

    const budget = state.budgets.find(
      (item) => item.category === categoryName && item.month === month
    );

    const limit = budget?.limit || getSuggestedBudget(state, categoryName) || spent || 1;

    return {
      month,
      spent,
      limit,
      usedPercent: percent(spent, limit),
    };
  });
}

/* ---------- Goals Analytics ---------- */

export function getGoalProgress(goal) {
  const target = Number(goal.targetAmount) || 0;
  const current = Number(goal.currentAmount) || 0;
  const percentage = percent(current, target);
  const remaining = Math.max(0, target - current);

  const daysLeft = goal.deadline ? daysBetween(todayISO(), goal.deadline) : null;
  const monthsLeft = daysLeft ? Math.max(1, Math.ceil(daysLeft / 30)) : null;
  const monthlyNeeded = monthsLeft ? remaining / monthsLeft : 0;

  return {
    ...goal,
    percentage,
    remaining,
    daysLeft,
    monthsLeft,
    monthlyNeeded,
    completed: percentage >= 100,
  };
}

export function getAllGoalProgress(state) {
  return state.goals.map(getGoalProgress);
}

export function getNextMilestones(goal) {
  const progress = getGoalProgress(goal);
  const milestones = [25, 50, 75, 100];

  return milestones.filter((milestone) => {
    return (
      progress.percentage >= milestone &&
      !(goal.milestonesHit || []).includes(milestone)
    );
  });
}

/* ---------- Subscriptions Analytics ---------- */

export function getSubscriptionTotals(state) {
  const monthly = sum(
    state.subscriptions.map((subscription) =>
      getMonthlySubscriptionCost(subscription)
    )
  );

  const yearly = monthly * 12;
  const income = Number(state.settings.monthlyIncome) || 0;
  const ratio = income ? (monthly / income) * 100 : 0;

  return {
    monthly,
    yearly,
    incomeRatio: round(ratio, 1),
  };
}

export function getUpcomingSubscriptions(state) {
  return [...state.subscriptions].sort(
    (a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate)
  );
}

export function getUpcomingBills(state, days = 7) {
  const today = todayISO();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + days);
  const end = endDate.toISOString().slice(0, 10);

  return state.subscriptions
    .filter((subscription) => {
      return (
        subscription.nextBillingDate >= today &&
        subscription.nextBillingDate <= end
      );
    })
    .sort((a, b) => new Date(a.nextBillingDate) - new Date(b.nextBillingDate));
}

export function detectDuplicateSubscriptions(state) {
  const groups = new Map();

  state.subscriptions.forEach((subscription) => {
    const key = `${subscription.amount}_${subscription.nextBillingDate}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(subscription);
  });

  return Array.from(groups.values()).filter((group) => group.length > 1).flat();
}

/* ---------- Net Worth ---------- */

export function calculateNetWorth(state) {
  const assets = sum((state.settings.netWorth?.assets || []).map((item) => item.amount));
  const liabilities = sum(
    (state.settings.netWorth?.liabilities || []).map((item) => item.amount)
  );

  return assets - liabilities;
}

/* ---------- 50/30/20 Rule ---------- */

export function analyzeRule502030(state) {
  const currentTransactions = getCurrentMonthTransactions(state.transactions);
  const income = getTransactionTotals(currentTransactions).income || state.settings.monthlyIncome || 0;

  const categoryMap = new Map(
    state.categories.map((category) => [category.name, category.ruleGroup])
  );

  const totals = {
    needs: 0,
    wants: 0,
    savings: 0,
  };

  currentTransactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const group = categoryMap.get(transaction.category) || "wants";

      if (group === "savings") {
        totals.savings += Number(transaction.amount) || 0;
      } else if (group === "needs") {
        totals.needs += Number(transaction.amount) || 0;
      } else {
        totals.wants += Number(transaction.amount) || 0;
      }
    });

  const result = {
    needs: income ? round((totals.needs / income) * 100, 1) : 0,
    wants: income ? round((totals.wants / income) * 100, 1) : 0,
    savings: income ? round((totals.savings / income) * 100, 1) : 0,
    raw: totals,
  };

  const isHealthy =
    result.needs <= 55 &&
    result.wants <= 35 &&
    result.savings >= 15;

  return {
    ...result,
    status: isHealthy ? "Healthy" : "Needs tuning",
  };
}

/* ---------- Financial Score ---------- */

export function calculateFinancialScore(state) {
  const summary = getDashboardSummary(state);
  const budgets = getAllBudgetUsage(state);
  const goals = getAllGoalProgress(state);
  const subscriptions = getSubscriptionTotals(state);
  const streak = calculateLoggingStreak(state.transactions);

  const savingsRateScore = clamp(summary.savingsRate, 0, 30);

  const budgetAdherenceScore = budgets.length
    ? average(
        budgets.map((budget) => {
          if (budget.usedPercent <= 75) return 20;
          if (budget.usedPercent <= 90) return 14;
          if (budget.usedPercent <= 100) return 8;
          return 2;
        })
      )
    : 14;

  const expenseConsistencyScore = calculateExpenseConsistencyScore(state);
  const goalProgressScore = goals.length
    ? clamp(average(goals.map((goal) => goal.percentage)) / 5, 0, 20)
    : 8;

  const subscriptionRatioScore = clamp(10 - subscriptions.incomeRatio / 2, 0, 10);
  const streakScore = clamp(streak, 0, 5);

  const factorScores = {
    savingsRate: round(savingsRateScore, 1),
    budgetAdherence: round(budgetAdherenceScore, 1),
    expenseConsistency: round(expenseConsistencyScore, 1),
    goalProgress: round(goalProgressScore, 1),
    subscriptionRatio: round(subscriptionRatioScore, 1),
    loggingStreak: round(streakScore, 1),
  };

  const totalWeighted =
    factorScores.savingsRate +
    factorScores.budgetAdherence +
    factorScores.expenseConsistency +
    factorScores.goalProgress +
    factorScores.subscriptionRatio +
    factorScores.loggingStreak;

  const score = Math.round((totalWeighted / 100) * 850);
  const badge = getScoreBadge(score);

  return {
    score: clamp(score, 0, 850),
    badge,
    factors: [
      {
        key: "savingsRate",
        label: "Savings Rate",
        score: factorScores.savingsRate,
        max: SCORE_WEIGHTS.savingsRate,
        tip: "Try saving a fixed amount right after income arrives.",
      },
      {
        key: "budgetAdherence",
        label: "Budget Adherence",
        score: factorScores.budgetAdherence,
        max: SCORE_WEIGHTS.budgetAdherence,
        tip: "Keep category spending below 75% until the last week of the month.",
      },
      {
        key: "expenseConsistency",
        label: "Expense Consistency",
        score: factorScores.expenseConsistency,
        max: SCORE_WEIGHTS.expenseConsistency,
        tip: "Avoid large unplanned spending spikes across the month.",
      },
      {
        key: "goalProgress",
        label: "Goal Progress",
        score: factorScores.goalProgress,
        max: SCORE_WEIGHTS.goalProgress,
        tip: "Add small weekly contributions to your savings goals.",
      },
      {
        key: "subscriptionRatio",
        label: "Subscription Ratio",
        score: factorScores.subscriptionRatio,
        max: SCORE_WEIGHTS.subscriptionRatio,
        tip: "Review subscriptions that are not used often.",
      },
      {
        key: "loggingStreak",
        label: "Logging Streak",
        score: factorScores.loggingStreak,
        max: SCORE_WEIGHTS.loggingStreak,
        tip: "Log at least one transaction daily to maintain your streak.",
      },
    ],
  };
}

function calculateExpenseConsistencyScore(state) {
  const dailyMap = getDailySpendingMap(state);
  const values = Array.from(dailyMap.values());

  if (values.length <= 2) return 10;

  const avg = average(values);
  const variance =
    values.reduce((total, value) => total + (value - avg) ** 2, 0) / values.length;

  const stdDev = Math.sqrt(variance);
  const ratio = avg ? stdDev / avg : 0;

  return clamp(15 - ratio * 6, 0, 15);
}

export function getScoreBadge(score) {
  return (
    SCORE_BADGES.find((badge) => score >= badge.min && score <= badge.max) ||
    SCORE_BADGES[0]
  );
}

/* ---------- AI Insights ---------- */

export function generateInsights(state) {
  const insights = [];
  const summary = getDashboardSummary(state);
  const topCategories = getTopCategoriesThisMonth(state, 3);
  const subscriptions = getSubscriptionTotals(state);
  const budgets = getAllBudgetUsage(state);
  const goals = getAllGoalProgress(state);
  const dayPattern = getDayOfWeekPattern(state);
  const streak = calculateLoggingStreak(state.transactions);

  if (summary.savingsRate >= 20) {
    insights.push({
      icon: "🎉",
      title: "Strong savings momentum",
      message: `You're saving ${summary.savingsRate}% this month. That is a strong habit.`,
      severity: "success",
    });
  } else if (summary.savingsRate < 10) {
    insights.push({
      icon: "⚠️",
      title: "Savings rate needs attention",
      message: "Your savings rate is below 10%. Try moving savings before spending.",
      severity: "warning",
    });
  }

  if (topCategories[0]) {
    insights.push({
      icon: "📊",
      title: "Top spending category",
      message: `${topCategories[0].category} is your biggest expense category this month.`,
      severity: "info",
    });
  }

  if (subscriptions.monthly > 0) {
    insights.push({
      icon: "🔄",
      title: "Subscription load",
      message: `Your subscriptions cost ${formatMoney(
        subscriptions.monthly,
        state.settings.baseCurrency
      )}/month, about ${subscriptions.incomeRatio}% of income.`,
      severity: subscriptions.incomeRatio > 8 ? "warning" : "info",
    });
  }

  const overBudget = budgets.find((budget) => budget.usedPercent >= 100);
  if (overBudget) {
    insights.push({
      icon: "🚨",
      title: "Budget exceeded",
      message: `${overBudget.category} has crossed its monthly budget. Consider cutting flexible spending.`,
      severity: "warning",
    });
  }

  const nearBudget = budgets.find(
    (budget) => budget.usedPercent >= 75 && budget.usedPercent < 100
  );
  if (nearBudget) {
    insights.push({
      icon: "🟡",
      title: "Budget burn warning",
      message: `${nearBudget.category} is already at ${Math.round(
        nearBudget.usedPercent
      )}% of budget.`,
      severity: "warning",
    });
  }

  const weakestGoal = goals
    .filter((goal) => !goal.completed)
    .sort((a, b) => a.percentage - b.percentage)[0];

  if (weakestGoal) {
    insights.push({
      icon: "🎯",
      title: "Goal contribution reminder",
      message: `${weakestGoal.name} is ${Math.round(
        weakestGoal.percentage
      )}% complete. A small contribution can keep it moving.`,
      severity: "info",
    });
  }

  const topDay = [...dayPattern].sort((a, b) => b.amount - a.amount)[0];
  if (topDay && topDay.amount > 0) {
    insights.push({
      icon: "📅",
      title: "Spending day pattern",
      message: `Your highest spending day is ${topDay.day}. Consider a weekend/day-specific limit.`,
      severity: "info",
    });
  }

  if (streak >= 3) {
    insights.push({
      icon: "🔥",
      title: "Logging streak active",
      message: `You've logged transactions for ${streak} days in a row.`,
      severity: "success",
    });
  } else {
    insights.push({
      icon: "📝",
      title: "Build your tracking habit",
      message: "No strong logging streak yet. Add one transaction daily to improve accuracy.",
      severity: "info",
    });
  }

  return insights.slice(0, 8);
}

/* =========================================================
   COMPATIBILITY EXPORT ALIASES
   ========================================================= */

export const getFinancialScore = calculateFinancialScore;

export const get503020Analysis = analyzeRule502030;

export const getMonthlySubscriptionTotal = (state) => {
  return getSubscriptionTotals(state).monthly;
};

export const getYearlySubscriptionTotal = (state) => {
  return getSubscriptionTotals(state).yearly;
};

export const getGoalProjection = (goal) => {
  const progress = getGoalProgress(goal);

  if (progress.completed) {
    return { text: "Completed 🎉" };
  }

  if (!progress.monthsLeft) {
    return { text: "No deadline" };
  }

  return {
    text: `${progress.monthsLeft} month${progress.monthsLeft === 1 ? "" : "s"} left`,
  };
};

export const getMonthlyTrend = getIncomeExpenseByMonth;

export const getDayOfWeekSpending = getDayOfWeekPattern;

export const getCategoryComparison = compareDateRanges;

export const getAnalyticsSummary = (state) => {
  const current = getCurrentMonthTransactions(state.transactions);
  const expenses = current.filter((t) => t.type === "expense");
  const totalSpent = sum(expenses.map((t) => t.amount));
  const days = getDaysInCurrentMonth();

  const dailyMap = getDailySpendingMap(state);
  const highestDay = Math.max(...Array.from(dailyMap.values()), 0);

  return {
    totalSpent,
    averageDaily: days ? totalSpent / days : 0,
    highestDay,
    transactionCount: current.length,
  };
};

export const getTopTransactions = (state, limit = 5) => {
  return [...(state.transactions || [])]
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, limit);
};

export const generateAIInsights = (state) => {
  const summary = getDashboardSummary(state);

  const topCategories =
    getTopCategoriesThisMonth(state, 3);

  const subscriptions =
    getSubscriptionTotals(state);

  return [
    {
      icon: "💡",

      title: "Smart Spending Insight",

      message: topCategories.length
        ? `Your top spending category this month is ${topCategories[0].category}.`
        : "Add more transactions to unlock deeper insights.",

      severity: "info",
    },

    {
      icon: "🎯",

      title: "Savings Status",

      message:
        summary.netSavings >= 0
          ? `You are on track to save ${formatMoney(
              summary.netSavings,
              state.settings.baseCurrency
            )} this month.`
          : "Your expenses are currently higher than your income this month.",

      severity:
        summary.netSavings >= 0
          ? "success"
          : "warning",
    },

    {
      icon: "🔄",

      title: "Subscription Check",

      message: `Your subscriptions cost ${formatMoney(
        subscriptions.monthly,
        state.settings.baseCurrency
      )} per month.`,

      severity:
        subscriptions.incomeRatio > 10
          ? "warning"
          : "info",
    },
  ];
};