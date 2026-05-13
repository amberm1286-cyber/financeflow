/* =========================================================
   FinanceFlow — Sync Manager
   File: js/syncManager.js
   ========================================================= */

import {
  APP_CONFIG,
} from "./config.js";

import {
  $,
  formatDateTime,
  uid,
} from "./utils.js";

import {
  getState,
  setState,
  subscribe,
} from "./dataManager.js";

import {
  showToast,
  notifySyncComplete,
} from "./notificationSystem.js";

/* =========================================================
   INTERNAL STATE
   ========================================================= */

let channel = null;

let syncing = false;

let syncEnabled = false;

let syncTimer = null;

let lastSyncedAt = null;

let backupRunning = false;

/* =========================================================
   INIT
   ========================================================= */

export function initSyncManager() {
  initializeBroadcastChannel();

  bindSyncUI();

  listenForStateChanges();

  restoreSyncMetadata();

  startRelativeSyncTimer();

  updateSyncUI();

  console.log("☁️ Sync Manager Initialized");
}

/* =========================================================
   BROADCAST CHANNEL
   ========================================================= */

function initializeBroadcastChannel() {
  if (!("BroadcastChannel" in window)) {
    console.warn("BroadcastChannel not supported.");
    return;
  }

  try {
    channel = new BroadcastChannel(APP_CONFIG.channelName);

    syncEnabled = true;

    channel.onmessage = handleIncomingMessage;
  } catch (error) {
    console.error("FinanceFlow sync channel failed:", error);
  }
}

function handleIncomingMessage(event) {
  if (!event?.data) return;

  const {
    type,
    payload,
  } = event.data;

  switch (type) {
    case "STATE_SYNC":
      applyIncomingState(payload);
      break;

    case "SYNC_PING":
      receivePing(payload);
      break;

    case "SYNC_BACKUP":
      receiveBackup(payload);
      break;

    default:
      break;
  }
}

/* =========================================================
   STATE LISTENERS
   ========================================================= */

function listenForStateChanges() {
  subscribe((state, eventName) => {
    if (
      eventName === "sync:incoming" ||
      eventName === "sync:applied"
    ) {
      return;
    }

    broadcastState(state);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== APP_CONFIG.storageKey) return;

    if (!event.newValue) return;

    try {
      const parsed = JSON.parse(event.newValue);

      applyIncomingState(parsed, true);
    } catch (error) {
      console.error("Storage sync failed:", error);
    }
  });
}

/* =========================================================
   BROADCASTING
   ========================================================= */

export function broadcastState(state = getState()) {
  if (!channel || syncing) return;

  try {
    syncing = true;

    updateSyncUI("syncing");

    channel.postMessage({
      type: "STATE_SYNC",
      payload: {
        state,
        sourceId: getDeviceId(),
        timestamp: new Date().toISOString(),
      },
    });

    completeSync();
  } catch (error) {
    console.error("FinanceFlow broadcast failed:", error);

    syncing = false;

    updateSyncUI("error");
  }
}

function applyIncomingState(payload, fromStorage = false) {
  if (!payload) return;

  const incomingState = payload.state || payload;

  const currentState = getState();

  const incomingUpdatedAt = new Date(
    incomingState.updatedAt || 0
  ).getTime();

  const currentUpdatedAt = new Date(
    currentState.updatedAt || 0
  ).getTime();

  if (incomingUpdatedAt <= currentUpdatedAt) {
    return;
  }

  syncing = true;

  updateSyncUI("syncing");

  setState(incomingState, {
    notify: false,
    event: "sync:incoming",
  });

  syncing = false;

  lastSyncedAt = new Date().toISOString();

  persistSyncMetadata();

  updateSyncUI("synced");

  showToast({
    type: "success",
    title: "Synced Across Devices",
    icon: "☁️",
    message: fromStorage
      ? "Browser storage synced successfully."
      : "Another FinanceFlow session updated your data.",
    persist: false,
  });
}

function completeSync() {
  setTimeout(() => {
    syncing = false;

    lastSyncedAt = new Date().toISOString();

    persistSyncMetadata();

    updateSyncUI("synced");
  }, 900);
}

/* =========================================================
   MANUAL SYNC
   ========================================================= */

export function syncNow() {
  if (syncing) return;

  const state = getState();

  syncing = true;

  updateSyncUI("syncing");

  animateSyncButton();

  simulateCloudBackup();

  setTimeout(() => {
    broadcastState(state);

    notifySyncComplete();
  }, 1100);
}

/* =========================================================
   CLOUD BACKUP SIMULATION
   ========================================================= */

export function simulateCloudBackup() {
  if (backupRunning) return;

  backupRunning = true;

  let backupBar = $("#cloudBackupBar");
  let backupWrap = $("#cloudBackupWrap");

  if (!backupWrap) {
    backupWrap = document.createElement("div");

    backupWrap.id = "cloudBackupWrap";
    backupWrap.className = "cloud-backup-wrap";

    backupWrap.innerHTML = `
      <div class="cloud-backup-top">
        <strong>FinanceFlow Cloud Backup</strong>
        <span id="cloudBackupPercent">0%</span>
      </div>

      <div class="cloud-backup-track">
        <div class="cloud-backup-bar" id="cloudBackupBar"></div>
      </div>

      <small id="cloudBackupStatus">
        Preparing secure backup...
      </small>
    `;

    document.body.appendChild(backupWrap);

    backupBar = $("#cloudBackupBar");
  }

  backupWrap.classList.add("show");

  const percentEl = $("#cloudBackupPercent");
  const statusEl = $("#cloudBackupStatus");

  let progress = 0;

  const messages = [
    "Encrypting finance data...",
    "Uploading transactions...",
    "Syncing budgets and goals...",
    "Verifying cloud snapshot...",
    "Backup complete.",
  ];

  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 14) + 6;

    if (progress >= 100) {
      progress = 100;
    }

    backupBar.style.width = `${progress}%`;

    percentEl.textContent = `${progress}%`;

    const messageIndex = Math.min(
      messages.length - 1,
      Math.floor(progress / 25)
    );

    statusEl.textContent = messages[messageIndex];

    if (progress >= 100) {
      clearInterval(interval);

      setTimeout(() => {
        backupWrap.classList.remove("show");

        backupRunning = false;
      }, 1800);
    }
  }, 220);
}

/* =========================================================
   PINGS
   ========================================================= */

export function sendSyncPing() {
  if (!channel) return;

  channel.postMessage({
    type: "SYNC_PING",
    payload: {
      sourceId: getDeviceId(),
      timestamp: new Date().toISOString(),
    },
  });
}

function receivePing(payload) {
  if (!payload) return;

  console.log(
    `📡 Ping received from ${payload.sourceId}`
  );
}

function receiveBackup(payload) {
  console.log("☁️ Backup event:", payload);
}

/* =========================================================
   UI
   ========================================================= */

function bindSyncUI() {
  $("#syncNowBtn")?.addEventListener("click", () => {
    syncNow();
  });
}

function updateSyncUI(status = "synced") {
  const dot = $("#syncDot");
  const text = $("#syncStatusText");
  const lastSynced = $("#lastSyncedText");

  if (!dot || !text || !lastSynced) return;

  dot.classList.remove(
    "syncing",
    "error",
    "synced"
  );

  dot.classList.add(status);

  switch (status) {
    case "syncing":
      text.textContent = "Syncing...";
      break;

    case "error":
      text.textContent = "Sync Failed";
      break;

    default:
      text.textContent = "Synced";
      break;
  }

  if (lastSyncedAt) {
    lastSynced.textContent =
      `Last synced: ${getRelativeSyncTime(lastSyncedAt)}`;
  } else {
    lastSynced.textContent =
      "Last synced: just now";
  }
}

function animateSyncButton() {
  const button = $("#syncNowBtn");

  if (!button) return;

  button.classList.add("syncing");

  setTimeout(() => {
    button.classList.remove("syncing");
  }, 1500);
}

/* =========================================================
   RELATIVE TIME
   ========================================================= */

function startRelativeSyncTimer() {
  clearInterval(syncTimer);

  syncTimer = setInterval(() => {
    updateSyncUI(syncing ? "syncing" : "synced");
  }, 1000);
}

function getRelativeSyncTime(dateInput) {
  const diff = Math.floor(
    (Date.now() - new Date(dateInput).getTime()) / 1000
  );

  if (diff < 5) return "just now";

  if (diff < 60) return `${diff}s ago`;

  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  }

  return formatDateTime(dateInput);
}

/* =========================================================
   STORAGE
   ========================================================= */

function persistSyncMetadata() {
  localStorage.setItem(
    "financeflow_last_synced",
    lastSyncedAt || ""
  );

  localStorage.setItem(
    "financeflow_device_id",
    getDeviceId()
  );
}

function restoreSyncMetadata() {
  const saved = localStorage.getItem(
    "financeflow_last_synced"
  );

  if (saved) {
    lastSyncedAt = saved;
  }
}

function getDeviceId() {
  let deviceId = localStorage.getItem(
    "financeflow_device_id"
  );

  if (!deviceId) {
    deviceId = uid("device");

    localStorage.setItem(
      "financeflow_device_id",
      deviceId
    );
  }

  return deviceId;
}

/* =========================================================
   PUBLIC HELPERS
   ========================================================= */

export function getSyncStatus() {
  return {
    enabled: syncEnabled,
    syncing,
    lastSyncedAt,
  };
}

export function forceSyncState() {
  broadcastState(getState());
}

export function destroySyncManager() {
  if (channel) {
    channel.close();
  }

  clearInterval(syncTimer);
}

/* =========================================================
   GLOBAL STYLE INJECTION
   ========================================================= */

injectSyncStyles();

function injectSyncStyles() {
  if ($("#financeflowSyncStyles")) return;

  const style = document.createElement("style");

  style.id = "financeflowSyncStyles";

  style.textContent = `
    /* =====================================================
       Sync Indicator
       ===================================================== */

    .sync-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      background: var(--green);
      box-shadow:
        0 0 14px rgba(0,255,178,0.45);
      transition:
        background 220ms ease,
        transform 220ms ease,
        box-shadow 220ms ease;
    }

    .sync-dot.synced {
      background: var(--green);
      box-shadow:
        0 0 14px rgba(0,255,178,0.45);
    }

    .sync-dot.error {
      background: var(--red);
      box-shadow:
        0 0 14px rgba(255,71,87,0.4);
    }

    .sync-dot.syncing {
      background: var(--blue);
      animation: syncPulse 900ms infinite ease-in-out;
      box-shadow:
        0 0 18px rgba(79,142,247,0.55);
    }

    @keyframes syncPulse {
      0%,100% {
        transform: scale(1);
      }

      50% {
        transform: scale(1.28);
      }
    }

    .sync-line {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 10px 0 6px;
    }

    #syncNowBtn.syncing {
      animation: syncButtonSpin 1.4s linear;
    }

    @keyframes syncButtonSpin {
      0% {
        transform: rotate(0deg);
      }

      50% {
        transform: rotate(8deg);
      }

      100% {
        transform: rotate(0deg);
      }
    }

    /* =====================================================
       Cloud Backup
       ===================================================== */

    .cloud-backup-wrap {
      position: fixed;
      right: 24px;
      bottom: 24px;
      width: min(360px, calc(100vw - 24px));
      padding: 18px;
      border-radius: 24px;
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

      box-shadow:
        var(--shadow-soft),
        0 0 30px rgba(79,142,247,0.16);

      z-index: 4200;

      opacity: 0;
      transform: translateY(24px) scale(0.96);
      pointer-events: none;

      transition:
        opacity 280ms ease,
        transform 280ms ease;
    }

    html[data-theme="light"] .cloud-backup-wrap {
      background:
        linear-gradient(
          180deg,
          rgba(255,255,255,0.95),
          rgba(255,255,255,0.9)
        );
    }

    .cloud-backup-wrap.show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .cloud-backup-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 12px;
    }

    .cloud-backup-top strong {
      font-size: 0.96rem;
      letter-spacing: -0.03em;
    }

    .cloud-backup-top span {
      color: var(--blue);
      font-weight: 900;
    }

    .cloud-backup-track {
      height: 14px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      margin-bottom: 10px;
    }

    .cloud-backup-bar {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: var(--gradient-main);
      box-shadow:
        0 0 18px rgba(79,142,247,0.4);
      transition: width 240ms ease;
    }

    .cloud-backup-wrap small {
      color: var(--text-soft);
      font-size: 0.82rem;
      font-weight: 750;
    }

    /* =====================================================
       Mobile
       ===================================================== */

    @media (max-width: 760px) {
      .cloud-backup-wrap {
        left: 12px;
        right: 12px;
        width: auto;
        bottom: 92px;
      }
    }
  `;

  document.head.appendChild(style);
}