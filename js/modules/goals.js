/* =========================================================
   FinanceFlow — Goals Module
   File: js/modules/goals.js
   ========================================================= */

import {
  $,
  $$,
  safeText,
  formatMoney,
  formatDate,
  uid,
  debounce,
  animateNumber,
} from "../utils.js";

import {
  getState,
  setState,
  subscribe,
} from "../dataManager.js";

import {
  getGoalProjection,
  getDashboardSummary,
} from "../analyticsEngine.js";

import {
  showToast,
} from "../notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let initialized = false;

const milestoneCache =
  new Set();

/* =========================================================
   INIT
   ========================================================= */

export function initGoalsModule() {
  if (initialized) return;

  bindGoalEvents();

  renderGoalsPage(
    getState()
  );

  subscribe((state) => {
    renderGoalsPage(
      state
    );

    checkGoalMilestones(
      state
    );
  });

  initialized = true;

  console.log(
    "🎯 Goals Module Initialized"
  );
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderGoalsPage(
  state
) {
  renderGoalCards(state);

  renderGoalStats(state);

  renderGoalInsights(
    state
  );
}

/* =========================================================
   GOAL CARDS
   ========================================================= */

function renderGoalCards(
  state
) {
  const container =
    $("#goalCards");

  if (!container) return;

  const goals =
    state.goals || [];

  if (!goals.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          🎯
        </div>

        <h3>
          No Savings Goals Yet
        </h3>

        <p>
          Create your first financial goal to start building your future.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = goals.map(
    (goal) => {
      const progress =
        getGoalProgress(
          goal
        );

      const projection =
        getGoalProjection(
          goal
        );

      const gradient =
        getGoalGradient(
          goal.priority
        );

      return `
        <article
          class="goal-card"
          style="background:${gradient}"
        >
          <div class="goal-card-top">
            <div class="goal-card-title">
              <div class="goal-icon">
                ${
                  goal.emoji ||
                  "🎯"
                }
              </div>

              <div>
                <strong>
                  ${safeText(
                    goal.name
                  )}
                </strong>

                <small>
                  ${
                    goal.category ||
                    "General"
                  }
                </small>
              </div>
            </div>

            <div class="goal-card-actions">
              <button
                class="icon-btn add-goal-money-btn"
                data-id="${goal.id}"
              >
                ➕
              </button>

              <button
                class="icon-btn edit-goal-btn"
                data-id="${goal.id}"
              >
                ✏️
              </button>

              <button
                class="icon-btn delete-goal-btn"
                data-id="${goal.id}"
              >
                🗑️
              </button>
            </div>
          </div>

          <div class="goal-progress-ring-wrap">
            <svg
              class="goal-progress-ring"
              width="150"
              height="150"
            >
              <circle
                cx="75"
                cy="75"
                r="60"
                class="goal-ring-track"
              ></circle>

              <circle
                cx="75"
                cy="75"
                r="60"
                class="goal-ring-fill"
                style="
                  stroke-dasharray:377;
                  stroke-dashoffset:${
                    377 -
                    (progress /
                      100) *
                      377
                  };
                "
              ></circle>
            </svg>

            <div class="goal-progress-content">
              <strong>
                ${Math.round(
                  progress
                )}%
              </strong>

              <small>
                Complete
              </small>
            </div>
          </div>

          <div class="goal-values">
            <div>
              <span>
                Saved
              </span>

              <strong>
                ${formatMoney(
                  goal.currentAmount,
                  state.settings
                    .baseCurrency
                )}
              </strong>
            </div>

            <div>
              <span>
                Target
              </span>

              <strong>
                ${formatMoney(
                  goal.targetAmount,
                  state.settings
                    .baseCurrency
                )}
              </strong>
            </div>
          </div>

          <div class="goal-meta">
            <div>
              <small>
                Deadline
              </small>

              <strong>
                ${formatDate(
                  goal.deadline,
                  {
                    short: true,
                  }
                )}
              </strong>
            </div>

            <div>
              <small>
                Projection
              </small>

              <strong>
                ${
                  projection.text
                }
              </strong>
            </div>
          </div>

          <div class="goal-priority ${goal.priority}">
            ${
              goal.priority
            } Priority
          </div>
        </article>
      `;
    }
  ).join("");

  bindGoalCardEvents();
}

/* =========================================================
   STATS
   ========================================================= */

function renderGoalStats(
  state
) {
  const goals =
    state.goals || [];

  const totalTarget =
    goals.reduce(
      (sum, goal) =>
        sum +
        Number(
          goal.targetAmount ||
            0
        ),
      0
    );

  const totalSaved =
    goals.reduce(
      (sum, goal) =>
        sum +
        Number(
          goal.currentAmount ||
            0
        ),
      0
    );

  const completed =
    goals.filter(
      (goal) =>
        getGoalProgress(
          goal
        ) >= 100
    ).length;

  updateMetric(
    "#goalTotalSaved",
    totalSaved,
    state.settings
      .baseCurrency
  );

  updateMetric(
    "#goalTotalTarget",
    totalTarget,
    state.settings
      .baseCurrency
  );

  updateMetric(
    "#goalCompleted",
    completed,
    null,
    true
  );
}

function updateMetric(
  selector,
  value,
  currency,
  plain = false
) {
  const element =
    $(selector);

  if (!element) return;

  if (plain) {
    element.textContent =
      value.toLocaleString(
        "en-IN"
      );

    return;
  }

  element.textContent =
    formatMoney(
      value,
      currency
    );
}

/* =========================================================
   INSIGHTS
   ========================================================= */

function renderGoalInsights(
  state
) {
  const container =
    $("#goalInsights");

  if (!container) return;

  const goals =
    state.goals || [];

  if (!goals.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <p>
          Goal insights will appear here.
        </p>
      </div>
    `;

    return;
  }

  const closestGoal =
    [...goals].sort(
      (a, b) =>
        getGoalProgress(
          b
        ) -
        getGoalProgress(
          a
        )
    )[0];

  const lowestGoal =
    [...goals].sort(
      (a, b) =>
        getGoalProgress(
          a
        ) -
        getGoalProgress(
          b
        )
    )[0];

  const insights = [
    {
      icon: "🚀",

      title:
        "Closest Goal",

      description: `${
        closestGoal.name
      } is ${Math.round(
        getGoalProgress(
          closestGoal
        )
      )}% complete.`,
    },

    {
      icon: "📈",

      title:
        "Improvement Tip",

      description:
        "Adding even small weekly contributions helps maintain momentum.",
    },

    {
      icon: "💡",

      title:
        "Focus Goal",

      description: `${
        lowestGoal.name
      } needs more attention.`,
    },
  ];

  container.innerHTML = insights.map(
    (insight) => {
      return `
        <article class="goal-insight-card">
          <div class="goal-insight-icon">
            ${insight.icon}
          </div>

          <div>
            <strong>
              ${safeText(
                insight.title
              )}
            </strong>

            <p>
              ${safeText(
                insight.description
              )}
            </p>
          </div>
        </article>
      `;
    }
  ).join("");
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindGoalEvents() {
  bindAddGoal();

  bindGoalSearch();
}

/* =========================================================
   ADD GOAL
   ========================================================= */

function bindAddGoal() {
  $("#openGoalModalBtn")
    ?.addEventListener(
      "click",
      () => {
        openGoalModal();
      }
    );
}

function openGoalModal(
  goal = null
) {
  let modal =
    $("#goalModal");

  if (modal) {
    modal.remove();
  }

  modal =
    document.createElement(
      "div"
    );

  modal.id = "goalModal";

  modal.className =
    "modal-overlay show";

  modal.innerHTML = `
    <div class="modal-card goal-modal-card">
      <button
        class="modal-close-btn"
        id="closeGoalModal"
      >
        ✕
      </button>

      <div class="modal-header">
        <p class="eyebrow">
          FinanceFlow
        </p>

        <h2>
          ${
            goal
              ? "Edit"
              : "Create"
          }
          Savings Goal
        </h2>
      </div>

      <form
        id="goalForm"
        class="goal-form"
      >
        <div class="form-grid">
          <div class="input-group">
            <label>
              Goal Name
            </label>

            <input
              type="text"
              id="goalName"
              value="${
                goal
                  ? goal.name
                  : ""
              }"
              placeholder="MacBook Pro"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Category
            </label>

            <select
              id="goalCategory"
            >
              <option value="Emergency Fund">
                Emergency Fund
              </option>

              <option value="Travel">
                Travel
              </option>

              <option value="Education">
                Education
              </option>

              <option value="Gadget">
                Gadget
              </option>

              <option value="Investment">
                Investment
              </option>
            </select>
          </div>

          <div class="input-group">
            <label>
              Target Amount
            </label>

            <input
              type="number"
              id="goalTarget"
              value="${
                goal
                  ? goal.targetAmount
                  : ""
              }"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Current Amount
            </label>

            <input
              type="number"
              id="goalCurrent"
              value="${
                goal
                  ? goal.currentAmount
                  : 0
              }"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Deadline
            </label>

            <input
              type="date"
              id="goalDeadline"
              value="${
                goal
                  ? goal.deadline
                  : ""
              }"
              required
            />
          </div>

          <div class="input-group">
            <label>
              Emoji
            </label>

            <input
              type="text"
              id="goalEmoji"
              value="${
                goal
                  ? goal.emoji
                  : "🎯"
              }"
            />
          </div>

          <div class="input-group">
            <label>
              Priority
            </label>

            <select
              id="goalPriority"
            >
              <option value="low">
                Low
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="high">
                High
              </option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-full"
        >
          ${
            goal
              ? "Save Changes"
              : "Create Goal"
          }
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(
    modal
  );

  if (goal) {
    $("#goalCategory").value =
      goal.category;

    $("#goalPriority").value =
      goal.priority;
  }

  bindGoalForm(goal);
}

function bindGoalForm(
  goal = null
) {
  $("#goalForm")
    ?.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        if (goal) {
          updateGoal(
            goal.id
          );
        } else {
          addGoal();
        }

        closeGoalModal();
      }
    );

  $("#closeGoalModal")
    ?.addEventListener(
      "click",
      closeGoalModal
    );
}

function addGoal() {
  const state =
    getState();

  const goal = {
    id: uid("goal"),

    name:
      $("#goalName")
        ?.value ||
      "Goal",

    category:
      $("#goalCategory")
        ?.value ||
      "General",

    targetAmount:
      Number(
        $("#goalTarget")
          ?.value || 0
      ),

    currentAmount:
      Number(
        $("#goalCurrent")
          ?.value || 0
      ),

    deadline:
      $("#goalDeadline")
        ?.value ||
      new Date()
        .toISOString()
        .slice(0, 10),

    emoji:
      $("#goalEmoji")
        ?.value || "🎯",

    priority:
      $("#goalPriority")
        ?.value ||
      "medium",

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  };

  setState(
    {
      ...state,
      goals: [
        goal,
        ...state.goals,
      ],
    },
    {
      event:
        "goal:added",
    }
  );

  showToast({
    type: "success",
    title:
      "Goal Created",
    message: `${goal.name} goal added successfully.`,
    icon: "🎯",
  });
}

function updateGoal(
  goalId
) {
  const state =
    getState();

  const goals =
    state.goals.map(
      (goal) => {
        if (
          goal.id !==
          goalId
        ) {
          return goal;
        }

        return {
          ...goal,

          name:
            $("#goalName")
              ?.value ||
            goal.name,

          category:
            $("#goalCategory")
              ?.value ||
            goal.category,

          targetAmount:
            Number(
              $("#goalTarget")
                ?.value || 0
            ),

          currentAmount:
            Number(
              $("#goalCurrent")
                ?.value || 0
            ),

          deadline:
            $("#goalDeadline")
              ?.value ||
            goal.deadline,

          emoji:
            $("#goalEmoji")
              ?.value ||
            goal.emoji,

          priority:
            $("#goalPriority")
              ?.value ||
            goal.priority,

          updatedAt:
            new Date().toISOString(),
        };
      }
    );

  setState(
    {
      ...state,
      goals,
    },
    {
      event:
        "goal:updated",
    }
  );

  showToast({
    type: "success",
    title:
      "Goal Updated",
    message:
      "Goal changes saved.",
    icon: "✏️",
  });
}

function closeGoalModal() {
  $("#goalModal")
    ?.remove();
}

/* =========================================================
   GOAL EVENTS
   ========================================================= */

function bindGoalCardEvents() {
  $$(".add-goal-money-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openGoalContributionModal(
            button.dataset.id
          );
        }
      );
    });

  $$(".edit-goal-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const goal =
            getState().goals.find(
              (item) =>
                item.id ===
                button.dataset.id
            );

          if (goal) {
            openGoalModal(
              goal
            );
          }
        }
      );
    });

  $$(".delete-goal-btn")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          deleteGoal(
            button.dataset.id
          );
        }
      );
    });
}

/* =========================================================
   CONTRIBUTIONS
   ========================================================= */

function openGoalContributionModal(
  goalId
) {
  const state =
    getState();

  const goal =
    state.goals.find(
      (item) =>
        item.id === goalId
    );

  if (!goal) return;

  let modal =
    $("#goalContributionModal");

  if (modal) {
    modal.remove();
  }

  modal =
    document.createElement(
      "div"
    );

  modal.id =
    "goalContributionModal";

  modal.className =
    "modal-overlay show";

  modal.innerHTML = `
    <div class="modal-card goal-contribution-card">
      <button
        class="modal-close-btn"
        id="closeGoalContributionModal"
      >
        ✕
      </button>

      <div class="modal-header">
        <p class="eyebrow">
          FinanceFlow
        </p>

        <h2>
          Add Money
        </h2>
      </div>

      <div class="goal-contribution-content">
        <div class="goal-contribution-title">
          <span>
            ${
              goal.emoji ||
              "🎯"
            }
          </span>

          <strong>
            ${safeText(
              goal.name
            )}
          </strong>
        </div>

        <input
          type="range"
          id="goalContributionSlider"
          min="0"
          max="${
            getDashboardSummary(
              state
            ).totalBalance
          }"
          value="1000"
        />

        <div
          class="goal-contribution-value"
          id="goalContributionValue"
        >
          ${formatMoney(
            1000,
            state.settings
              .baseCurrency
          )}
        </div>

        <button
          class="btn btn-primary btn-full"
          id="confirmGoalContributionBtn"
        >
          Add Contribution
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(
    modal
  );

  bindGoalContribution(
    goal
  );
}

function bindGoalContribution(
  goal
) {
  const slider =
    $("#goalContributionSlider");

  const value =
    $("#goalContributionValue");

  slider?.addEventListener(
    "input",
    () => {
      value.textContent =
        formatMoney(
          Number(
            slider.value
          ),
          getState()
            .settings
            .baseCurrency
        );
    }
  );

  $("#confirmGoalContributionBtn")
    ?.addEventListener(
      "click",
      () => {
        contributeToGoal(
          goal.id,
          Number(
            slider.value
          )
        );

        closeGoalContributionModal();
      }
    );

  $("#closeGoalContributionModal")
    ?.addEventListener(
      "click",
      closeGoalContributionModal
    );
}

function contributeToGoal(
  goalId,
  amount
) {
  const state =
    getState();

  const goals =
    state.goals.map(
      (goal) => {
        if (
          goal.id !==
          goalId
        ) {
          return goal;
        }

        return {
          ...goal,

          currentAmount:
            Number(
              goal.currentAmount ||
                0
            ) + amount,

          updatedAt:
            new Date().toISOString(),
        };
      }
    );

  setState(
    {
      ...state,
      goals,
    },
    {
      event:
        "goal:contribution",
    }
  );

  showToast({
    type: "success",
    title:
      "Contribution Added",
    message: `${formatMoney(
      amount,
      state.settings
        .baseCurrency
    )} added to your goal.`,
    icon: "💰",
  });
}

function closeGoalContributionModal() {
  $("#goalContributionModal")
    ?.remove();
}

/* =========================================================
   DELETE
   ========================================================= */

function deleteGoal(
  goalId
) {
  const state =
    getState();

  const goal =
    state.goals.find(
      (item) =>
        item.id === goalId
    );

  if (!goal) return;

  setState(
    {
      ...state,
      goals:
        state.goals.filter(
          (item) =>
            item.id !==
            goalId
        ),
    },
    {
      event:
        "goal:deleted",
    }
  );

  showToast({
    type: "warning",
    title:
      "Goal Deleted",
    message: `${goal.name} removed.`,
    icon: "🗑️",
  });
}

/* =========================================================
   SEARCH
   ========================================================= */

function bindGoalSearch() {
  $("#goalSearch")
    ?.addEventListener(
      "input",
      debounce(
        (event) => {
          filterGoals(
            event.target.value
          );
        },
        180
      )
    );
}

function filterGoals(
  query = ""
) {
  const lower =
    query
      .trim()
      .toLowerCase();

  $$(".goal-card")
    .forEach((card) => {
      const text =
        card.textContent.toLowerCase();

      card.style.display =
        text.includes(lower)
          ? ""
          : "none";
    });
}

/* =========================================================
   MILESTONES
   ========================================================= */

function checkGoalMilestones(
  state
) {
  const milestones = [
    25,
    50,
    75,
    100,
  ];

  state.goals.forEach(
    (goal) => {
      const progress =
        Math.round(
          getGoalProgress(
            goal
          )
        );

      milestones.forEach(
        (milestone) => {
          const key =
            `${goal.id}_${milestone}`;

          if (
            progress >=
              milestone &&
            !milestoneCache.has(
              key
            )
          ) {
            milestoneCache.add(
              key
            );

            celebrateGoalMilestone(
              goal,
              milestone
            );
          }
        }
      );
    }
  );
}

function celebrateGoalMilestone(
  goal,
  milestone
) {
  if (window.confetti) {
    window.confetti({
      particleCount: 140,
      spread: 100,
      origin: {
        y: 0.7,
      },
    });
  }

  showToast({
    type: "success",
    title:
      "Goal Milestone Reached",
    message: `${goal.name} reached ${milestone}% 🎉`,
    icon: "🎊",
  });
}

/* =========================================================
   HELPERS
   ========================================================= */

function getGoalProgress(
  goal
) {
  if (
    !goal.targetAmount
  ) {
    return 0;
  }

  return Math.min(
    (goal.currentAmount /
      goal.targetAmount) *
      100,
    100
  );
}

function getGoalGradient(
  priority = "medium"
) {
  const gradients = {
    low: "linear-gradient(135deg, rgba(79,142,247,0.18), rgba(0,255,178,0.12))",

    medium:
      "linear-gradient(135deg, rgba(124,58,237,0.24), rgba(79,142,247,0.18))",

    high: "linear-gradient(135deg, rgba(255,71,87,0.22), rgba(255,166,0,0.18))",
  };

  return (
    gradients[
      priority
    ] ||
    gradients.medium
  );
}