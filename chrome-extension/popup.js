// ============================================================
//  KofiType Toolkit — popup.js
//  ALL event listeners are wired here. Zero inline JS in HTML.
// ============================================================

"use strict";

// ── State ────────────────────────────────────────────────────
let isOnSite = false;
let activeTabId = null;
let hookEnabled = false;

// ── DOM ready ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  wireTabButtons();
  wireForgeButton();
  wireHookToggle();
  wireRefreshStats();
  wireClearLog();
  wireExternalLinks();

  init();
});

function wireExternalLinks() {
  document.querySelectorAll("a[href]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const url = a.getAttribute("href");
      if (url && url.startsWith("http")) {
        e.preventDefault();
        chrome.tabs.create({ url });
      }
    });
  });
}

async function init() {
  await checkSiteStatus();
  await loadHookMode();
  await refreshLog();

  // Auto-refresh log every 3s when log tab visible
  setInterval(async () => {
    const logPanel = document.getElementById("panel-log");
    if (logPanel && logPanel.classList.contains("active")) {
      await refreshLog();
    }
  }, 3000);
}

// ── Wire: Tab buttons ─────────────────────────────────────────
function wireTabButtons() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

// ── Wire: Forge button ────────────────────────────────────────
function wireForgeButton() {
  const btn = document.getElementById("btn-forge");
  if (btn) btn.addEventListener("click", doForge);
}

// ── Wire: Hook toggle ─────────────────────────────────────────
function wireHookToggle() {
  const toggle = document.getElementById("hook-toggle");
  if (toggle) toggle.addEventListener("change", toggleHook);
}

// ── Wire: Refresh stats ───────────────────────────────────────
function wireRefreshStats() {
  const btn = document.getElementById("btn-refresh-stats");
  if (btn) btn.addEventListener("click", readStats);
}

// ── Wire: Clear log ───────────────────────────────────────────
function wireClearLog() {
  const btn = document.getElementById("btn-clear-log");
  if (btn) btn.addEventListener("click", clearLog);
}

// ── Tab switching ─────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === name);
  });
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.toggle("active", p.id === "panel-" + name);
  });
  if (name === "reader") readStats();
  if (name === "log") refreshLog();
}

// ── Site detection ─────────────────────────────────────────────
async function checkSiteStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes("kofitype.vercel.app")) {
      isOnSite = true;
      activeTabId = tab.id;
      document.getElementById("status-dot").classList.add("active");
      document.getElementById("site-label").textContent = "✓ On site";
      document.getElementById("site-label").style.color = "var(--green)";
      document.getElementById("token-status").textContent = "(auto-detecting…)";
      document.getElementById("token-status").style.color = "var(--accent)";
      // Try to auto-detect token after a moment
      setTimeout(() => autoDetectToken(tab.id), 1200);
    } else {
      isOnSite = false;
      activeTabId = tab ? tab.id : null;
      document.getElementById("site-label").textContent = "Not on site";
    }
  } catch (_) {}
}

// ── Auto-detect security token from page ──────────────────────
async function autoDetectToken(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return new Promise((resolve) => {
          // Listen for the result from the injected script
          const handler = (evt) => {
            if (evt.detail && evt.detail.token !== undefined) {
              window.removeEventListener("__kofi_inject_result__", handler);
              resolve(evt.detail);
            }
          };
          window.addEventListener("__kofi_inject_result__", handler);
          // Dispatch the READ_TOKEN action
          window.dispatchEvent(new CustomEvent("__kofi_inject_payload__", {
            detail: { action: "READ_TOKEN", params: {} }
          }));
          // Timeout fallback
          setTimeout(() => {
            window.removeEventListener("__kofi_inject_result__", handler);
            resolve(null);
          }, 5000);
        });
      },
    });

    const data = result && result.result;
    if (data && data.token) {
      document.getElementById("f-token").value = data.token;
      document.getElementById("f-token").style.borderColor = "var(--green)";
      document.getElementById("token-status").textContent = "✓ auto-detected";
      document.getElementById("token-status").style.color = "var(--green)";
      setTimeout(() => {
        document.getElementById("f-token").style.borderColor = "";
      }, 2500);
      toast("✅ Token: " + data.token);
    } else {
      document.getElementById("token-status").textContent = "(paste manually)";
      document.getElementById("token-status").style.color = "var(--text-sub)";
    }
  } catch (_) {
    document.getElementById("token-status").textContent = "(paste manually)";
    document.getElementById("token-status").style.color = "var(--text-sub)";
  }
}

// ── Hook mode ─────────────────────────────────────────────────
async function loadHookMode() {
  const resp = await bgMsg({ type: "GET_HOOK_MODE" });
  hookEnabled = resp && resp.enabled ? true : false;
  const toggle = document.getElementById("hook-toggle");
  if (toggle) toggle.checked = hookEnabled;
  updateHookBadge();
}

async function toggleHook() {
  const toggle = document.getElementById("hook-toggle");
  hookEnabled = toggle ? toggle.checked : false;
  await bgMsg({ type: "SET_HOOK_MODE", enabled: hookEnabled });
  updateHookBadge();
  toast(hookEnabled ? "🎣 Hook mode ENABLED" : "Hook mode disabled");
}

function updateHookBadge() {
  const badge = document.getElementById("hook-badge");
  if (!badge) return;
  if (hookEnabled) {
    badge.className = "hook-badge on";
    badge.innerHTML = '<i class="fa-solid fa-circle"></i> ON';
  } else {
    badge.className = "hook-badge off";
    badge.innerHTML = '<i class="fa-solid fa-circle"></i> OFF';
  }
}

// ── Forge ─────────────────────────────────────────────────────
// Runs AES-GCM entirely inside the popup — no page needed!
async function doForge() {
  const params = {
    username:       (document.getElementById("f-username").value || "Player").slice(0, 20),
    xp:             clamp(parseInt(document.getElementById("f-xp").value) || 0, 0, 999),
    level:          clamp(parseInt(document.getElementById("f-level").value) || 1, 1, 9999),
    bestWpm:        clamp(parseInt(document.getElementById("f-wpm").value) || 0, 0, 300),
    accuracy:       clamp(parseInt(document.getElementById("f-acc").value) || 0, 0, 100),
    testsCompleted: Math.max(0, parseInt(document.getElementById("f-tests").value) || 0),
    timeTyped:      Math.max(0, parseInt(document.getElementById("f-time").value) || 0),
    mode:           document.getElementById("f-mode").value || "time 30",
    securityToken:  parseInt(document.getElementById("f-token").value) || 4004198119,
  };

  // UI: show progress
  const forgeBtn    = document.getElementById("btn-forge");
  const progress    = document.getElementById("forge-progress");
  const bar         = document.getElementById("forge-bar");
  const phaseEl     = document.getElementById("forge-phase");

  const phases = [
    "Deriving AES-GCM key…",
    "Encrypting payload…",
    "Bypassing Guardian v5…",
    "Applying zero-width stego…",
    "Sealing container…",
    "Ready!",
  ];

  forgeBtn.disabled = true;
  progress.style.display = "block";
  bar.style.width = "0%";
  phaseEl.textContent = phases[0];

  let elapsed = 0;
  const totalMs = 2800;
  const step = 50;
  let phaseIdx = 0;

  await new Promise((resolve) => {
    const intv = setInterval(() => {
      elapsed += step;
      bar.style.width = Math.min((elapsed / totalMs) * 100, 100) + "%";
      const expected = Math.min(Math.floor((elapsed / totalMs) * (phases.length - 1)), phases.length - 1);
      if (expected !== phaseIdx) { phaseIdx = expected; phaseEl.textContent = phases[phaseIdx]; }
      if (elapsed >= totalMs) { clearInterval(intv); resolve(); }
    }, step);
  });

  try {
    phaseEl.textContent = "Generating file…";
    const invisData = await buildKofiPayload(params);

    // Download directly from popup — no page required
    const blob = new Blob([invisData], { type: "application/octet-stream" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = params.username.toLowerCase().replace(/[^a-z0-9]/g, "") + "_kofitype.kofi";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("✅ .kofi downloaded!");
  } catch (err) {
    toast("❌ Forge error: " + (err.message || err));
  }

  progress.style.display = "none";
  bar.style.width = "0%";
  forgeBtn.disabled = false;
}

// ── Core AES-GCM forge logic (runs in popup context) ──────────
function clamp(val, min, max) { return Math.max(min, Math.min(max, isNaN(val) ? min : val)); }

async function _klyuch(token) {
  const tokenStr = token.toString(16).padEnd(32, "0").substring(0, 32);
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(tokenStr),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

function _nev(u) {
  let b = "";
  for (let i = 0; i < u.length; i++) b += u[i].toString(2).padStart(8, "0");
  return b.replace(/0/g, "\u200B").replace(/1/g, "\u200C");
}

async function buildKofiPayload(p) {
  let { username, xp, level, bestWpm, accuracy, testsCompleted, timeTyped, mode, securityToken } = p;

  // Heuristic bypass — same rules as the app's verify()
  if (testsCompleted > 0 && timeTyped < testsCompleted) timeTyped = testsCompleted;
  const totalXP     = (level - 1) * 1000 + xp;
  const maxPossXP   = timeTyped * 45;
  if (timeTyped > 0 && totalXP > maxPossXP) timeTyped = Math.ceil(totalXP / 45);
  if (testsCompleted === 0 && (timeTyped > 0 || totalXP > 0)) testsCompleted = 1;

  // Build history array
  const histLen = testsCompleted >= 20 ? 20 : testsCompleted;
  const history = [];
  for (let i = 0; i < histLen; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (histLen - i));
    history.push({
      date: d.toLocaleDateString(),
      wpm:  Math.max(0, bestWpm - Math.floor(Math.random() * 20)),
      acc:  clamp(accuracy - Math.floor(Math.random() * 5), 0, 100),
      mode,
    });
  }
  if (history.length > 0) {
    history[0].wpm  = bestWpm;
    history[0].date = new Date().toLocaleDateString();
  }

  const cleanUser = {
    username,
    xp,
    level,
    bestWpm,
    testsCompleted,
    timeTyped,
    history,
    currentSeason: new Date().toISOString().slice(0, 7),
  };

  // Sign (XOR checksum + nonce)
  cleanUser._n = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  cleanUser._c = (xp * level * testsCompleted) ^ securityToken;

  // AES-GCM encrypt
  const iv          = crypto.getRandomValues(new Uint8Array(12));
  const key         = await _klyuch(securityToken);
  const encoded     = new TextEncoder().encode(JSON.stringify(cleanUser));
  const encrypted   = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  const signedUser  = {
    e: 1,
    i: btoa(String.fromCharCode(...iv)),
    d: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };

  const finalExport = {
    app: "kofitype",
    version: "2.0",
    timestamp: new Date().toISOString(),
    user: signedUser,
    settings: { darkMode: true, sound: true, focus: false, smoothCaret: true, font: "'Outfit', sans-serif" },
    config: {
      mode:        mode.split(" ")[0],
      time:        mode.startsWith("time")  ? parseInt(mode.split(" ")[1]) : 30,
      words:       mode.startsWith("words") ? parseInt(mode.split(" ")[1]) : 25,
      punctuation: false,
      numbers:     false,
    },
  };

  // Encode to zero-width steganographic invisible chars
  const enc = new TextEncoder().encode(JSON.stringify(finalExport));
  return _nev(enc);
}

// ── Stats reader ──────────────────────────────────────────────
async function readStats() {
  const wrap = document.getElementById("stat-grid-wrap");
  if (!isOnSite || !activeTabId) {
    wrap.innerHTML = '<div class="log-empty">Not on kofitype.vercel.app</div>';
    return;
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      func: () => {
        try {
          return {
            raw:         localStorage.getItem("kofitype_user"),
            settingsRaw: localStorage.getItem("kofitype_settings"),
          };
        } catch (_) { return null; }
      },
    });

    const data = result && result.result;
    if (!data || !data.raw) {
      wrap.innerHTML = '<div class="log-empty">No saved data found yet.</div>';
      document.getElementById("history-card").style.display = "none";
      return;
    }

    let userObj;
    try { userObj = JSON.parse(data.raw); }
    catch (_) { wrap.innerHTML = '<div class="log-empty">Could not parse data.</div>'; return; }

    if (userObj.e === 1) {
      // AES-GCM encrypted — show metadata
      wrap.innerHTML = `
        <div style="font-size:0.72rem;color:var(--accent);margin-bottom:8px;display:flex;align-items:center;gap:5px;">
          <i class="fa-solid fa-lock"></i> Encrypted (AES-GCM)
        </div>
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-val" style="font-size:0.7rem;word-break:break-all;">${(userObj.i || "").slice(0, 8)}…</div><div class="stat-label">IV prefix</div></div>
          <div class="stat-box"><div class="stat-val">✓</div><div class="stat-label">Signed</div></div>
          <div class="stat-box"><div class="stat-val">${(userObj.d || "").length}B</div><div class="stat-label">Ciphertext</div></div>
        </div>
        <div style="margin-top:10px;font-size:0.72rem;color:var(--text-sub);">Data is encrypted. Use Forge tab to generate a new payload with your desired stats.</div>`;
    } else {
      // Plain / legacy — show all stats
      wrap.innerHTML = `
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-val">${userObj.bestWpm || "—"}</div><div class="stat-label">Best WPM</div></div>
          <div class="stat-box"><div class="stat-val">${userObj.level || "—"}</div><div class="stat-label">Level</div></div>
          <div class="stat-box"><div class="stat-val">${userObj.xp || "—"}</div><div class="stat-label">XP</div></div>
          <div class="stat-box"><div class="stat-val">${userObj.testsCompleted || "—"}</div><div class="stat-label">Tests</div></div>
          <div class="stat-box"><div class="stat-val" style="font-size:0.8rem;">${userObj.username || "—"}</div><div class="stat-label">Username</div></div>
          <div class="stat-box"><div class="stat-val">${userObj.timeTyped ? (Math.floor(userObj.timeTyped / 3600) + "h") : "—"}</div><div class="stat-label">Time</div></div>
        </div>`;

      if (Array.isArray(userObj.history) && userObj.history.length > 0) {
        document.getElementById("history-card").style.display = "block";
        document.getElementById("history-list").innerHTML = userObj.history.slice(0, 5).map(h =>
          `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
            <span style="color:var(--text-sub);">${h.date}</span>
            <span style="color:var(--accent);font-weight:700;">${h.wpm} WPM</span>
            <span>${h.acc}%</span>
            <span style="color:var(--text-sub);font-size:0.68rem;">${h.mode}</span>
          </div>`
        ).join("");
      }
    }
  } catch (err) {
    wrap.innerHTML = `<div class="log-empty">Error: ${err.message}</div>`;
  }
}

// ── Log ───────────────────────────────────────────────────────
async function refreshLog() {
  const resp = await bgMsg({ type: "GET_LOG" });
  const log  = (resp && resp.log) ? resp.log : [];
  const list = document.getElementById("log-list");
  if (!list) return;

  if (log.length === 0) {
    list.innerHTML = '<div class="log-empty">No activity yet.</div>';
    return;
  }

  const iconMap = {
    webhook_intercepted:     "fa-fish-fins",
    auto_approved:           "fa-thumbs-up",
    reaction_served:         "fa-check-circle",
    fetch_intercepted_post:  "fa-arrows-rotate",
  };

  list.innerHTML = log.map((entry) => {
    const icon = iconMap[entry.kind] || "fa-circle";
    const ts   = entry.ts ? new Date(entry.ts).toLocaleTimeString() : "";
    const extra = entry.fakeId   ? `<div style="color:var(--text-sub);font-size:0.68rem;">ID: ${entry.fakeId}</div>` :
                  entry.messageId ? `<div style="color:var(--text-sub);font-size:0.68rem;">msgId: ${entry.messageId}</div>` : "";
    return `<div class="log-entry">
      <i class="fa-solid ${icon} log-icon"></i>
      <div>
        <div class="log-kind">${entry.kind}</div>
        ${extra}
        <div class="log-ts">${ts}</div>
      </div>
    </div>`;
  }).join("");
}

async function clearLog() {
  await bgMsg({ type: "CLEAR_LOG" });
  await refreshLog();
  toast("Log cleared");
}

// ── Helpers ───────────────────────────────────────────────────
function bgMsg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) { resolve(null); return; }
      resolve(resp);
    });
  });
}

let _toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
