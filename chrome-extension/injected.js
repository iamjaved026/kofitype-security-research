// ============================================================
//  KofiType Toolkit — Injected Page Script
//  Runs in the REAL page JS context.
//  Patches window.fetch to intercept Discord API calls.
//  Also exposes _kofiToolkit for direct page manipulation.
// ============================================================

(function () {
  "use strict";

  const EXT_ID = document.currentScript?.dataset?.extId;
  let _nonceCounter = 0;

  // ── Restore console (blackholed by the app) ──────────────
  const _realLog   = Function.prototype.bind.call(console.log,   console);
  const _realWarn  = Function.prototype.bind.call(console.warn,  console);
  const _realError = Function.prototype.bind.call(console.error, console);
  try {
    Object.defineProperty(console, 'log',   { value: _realLog,   writable: true, configurable: true });
    Object.defineProperty(console, 'warn',  { value: _realWarn,  writable: true, configurable: true });
    Object.defineProperty(console, 'error', { value: _realError, writable: true, configurable: true });
  } catch (_) {}

  // ── Neutralise debugger trap ──────────────────────────────
  // The app runs setInterval(() => { debugger; }, 1500)
  // We can't stop it but we CAN override the native setInterval
  // to drop any callback that contains only a debugger call.
  const _origSetInterval = window.setInterval.bind(window);
  const _origClearInterval = window.clearInterval.bind(window);
  const _debuggerIntervals = new Set();
  try {
    window.setInterval = function(fn, delay, ...args) {
      // Detect the debugger-only interval by inspecting fn source
      const src = typeof fn === 'function' ? fn.toString().replace(/\s/g,'') : '';
      if (src.includes('debugger') && src.length < 60) {
        // Return a fake ID; don't actually start it
        const fakeId = Math.random() * 1e9 | 0;
        _debuggerIntervals.add(fakeId);
        return fakeId;
      }
      return _origSetInterval(fn, delay, ...args);
    };
  } catch (_) {}

  // ── Bridge: send a message to the content script ────────────
  function bridgeSend(type, payload) {
    return new Promise((resolve) => {
      const nonce = ++_nonceCounter;

      const handler = (evt) => {
        if (evt.detail?.nonce === nonce) {
          window.removeEventListener("__kofi_ext_reply__", handler);
          resolve(evt.detail.response);
        }
      };

      window.addEventListener("__kofi_ext_reply__", handler);

      window.dispatchEvent(
        new CustomEvent("__kofi_ext_msg__", {
          detail: { type, payload, nonce },
        })
      );

      // Safety timeout
      setTimeout(() => {
        window.removeEventListener("__kofi_ext_reply__", handler);
        resolve(null);
      }, 10000);
    });
  }

  // ── Fetch patch ──────────────────────────────────────────────
  const _originalFetch = window.fetch.bind(window);

  async function patchedFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = (init?.method || "GET").toUpperCase();

    // Only intercept requests to the kofitype verify proxy
    const isKofiProxy = url.includes("kofitype.vercel.app/api/verify");
    const isDiscordApi = url.includes("discord.com/api");
    const isTargeted = isKofiProxy || isDiscordApi;

    if (!isTargeted) {
      return _originalFetch(input, init);
    }

    // Ask background if hook mode is active
    const hookState = await bridgeSend("GET_HOOK_MODE", {});
    if (!hookState?.enabled) {
      return _originalFetch(input, init);
    }

    // ── POST: Discord webhook send ───────────────────────────
    if (method === "POST") {
      const result = await bridgeSend("HOOK_WEBHOOK_POST", {
        url,
        body: init?.body || null,
      });

      if (result?.intercept) {
        // Log it
        bridgeSend("LOG_ENTRY", {
          entry: {
            kind: "fetch_intercepted_post",
            url,
          },
        });

        // Return a fake Response that looks like Discord's webhook response
        const fakeBody = JSON.stringify(result.fakeResponse);
        return new Response(fakeBody, {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // ── GET: Reaction polling ─────────────────────────────────
    if (method === "GET") {
      let messageId = null;
      try {
        const urlObj = new URL(url, window.location.origin);
        messageId = urlObj.searchParams.get("messageId");
      } catch (_) {}

      if (messageId) {
        const result = await bridgeSend("HOOK_REACTION_GET", { messageId });

        if (result?.intercept) {
          const fakeBody = JSON.stringify(result.fakeResponse);
          return new Response(fakeBody, {
            status: 200,
            statusText: "OK",
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    return _originalFetch(input, init);
  }

  // Apply the patch - overwrite window.fetch before the page JS uses it
  try {
    Object.defineProperty(window, "fetch", {
      value: patchedFetch,
      writable: true,
      configurable: true,
    });
  } catch (_) {
    window.fetch = patchedFetch;
  }

  // ── Toolkit API ──────────────────────────────────────────────
  // Exposes helper functions that the popup can trigger via INJECT_PAYLOAD
  const SECURITY_TOKEN_HINT = 4004198119; // V5 token (from maker-tool)

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

  async function forgePayload(params) {
    const {
      username = "Player",
      xp = 999,
      level = 50,
      bestWpm = 200,
      testsCompleted = 100,
      timeTyped = 99999,
      accuracy = 98,
      mode = "time 30",
      securityToken = SECURITY_TOKEN_HINT,
    } = params;

    // Heuristic bypass - same rules as maker-tool
    let _time = timeTyped;
    let _tests = testsCompleted;
    let _level = level;
    let _xp = Math.min(999, xp);

    if (_tests > 0 && _time < _tests) _time = _tests;
    const totalXP = ((_level - 1) * 1000) + _xp;
    const maxPossibleXP = _time * 45;
    if (_time > 0 && totalXP > maxPossibleXP) _time = Math.ceil(totalXP / 45);
    if (_tests === 0 && (_time > 0 || totalXP > 0)) _tests = 1;

    // Generate history
    const histLen = _tests >= 20 ? 20 : _tests;
    const histArr = [];
    for (let i = 0; i < histLen; i++) {
      const past = new Date();
      past.setDate(past.getDate() - (histLen - i));
      histArr.push({
        date: past.toLocaleDateString(),
        wpm: Math.max(0, bestWpm - Math.floor(Math.random() * 20)),
        acc: Math.min(100, Math.max(0, accuracy - Math.floor(Math.random() * 5))),
        mode,
      });
    }
    if (histArr.length > 0) {
      histArr[0].wpm = bestWpm;
      histArr[0].date = new Date().toLocaleDateString();
    }

    const cleanUser = {
      username: String(username).slice(0, 20),
      xp: _xp,
      level: _level,
      bestWpm,
      testsCompleted: _tests,
      timeTyped: _time,
      history: histArr,
      currentSeason: new Date().toISOString().slice(0, 7),
    };

    // Sign with AES-GCM
    cleanUser._n =
      Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    cleanUser._c = (_xp * _level * _tests) ^ securityToken;

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await _klyuch(securityToken);
    const encoded = new TextEncoder().encode(JSON.stringify(cleanUser));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

    const signedUser = {
      e: 1,
      i: btoa(String.fromCharCode(...iv)),
      d: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    };

    const finalExport = {
      app: "kofitype",
      version: "2.0",
      timestamp: new Date().toISOString(),
      user: signedUser,
      settings: {
        darkMode: true,
        sound: true,
        focus: false,
        smoothCaret: true,
        font: "'Outfit', sans-serif",
      },
      config: {
        mode: mode.split(" ")[0],
        time: mode.startsWith("time") ? parseInt(mode.split(" ")[1]) : 30,
        words: mode.startsWith("words") ? parseInt(mode.split(" ")[1]) : 25,
        punctuation: false,
        numbers: false,
      },
    };

    const enc = new TextEncoder().encode(JSON.stringify(finalExport));
    return _nev(enc);
  }

  // Handle payload injection requests from popup
  window.addEventListener("__kofi_inject_payload__", async (evt) => {
    const { action, params } = evt.detail || {};

    if (action === "FORGE_AND_DOWNLOAD") {
      try {
        const data = await forgePayload(params);
        const blob = new Blob([data], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(params.username || "player")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")}_kofitype.kofi`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        window.dispatchEvent(
          new CustomEvent("__kofi_inject_result__", {
            detail: { ok: true },
          })
        );
      } catch (err) {
        window.dispatchEvent(
          new CustomEvent("__kofi_inject_result__", {
            detail: { ok: false, error: err.message },
          })
        );
      }
    }

    if (action === "READ_STATS") {
      // Try to read localStorage stats exposed by the page
      try {
        const userRaw = localStorage.getItem("kofitype_user");
        window.dispatchEvent(
          new CustomEvent("__kofi_inject_result__", {
            detail: { ok: true, userRaw },
          })
        );
      } catch (_) {
        window.dispatchEvent(
          new CustomEvent("__kofi_inject_result__", {
            detail: { ok: false },
          })
        );
      }
    }

    if (action === "READ_TOKEN") {
      // Extract the live SECURITY_TOKEN from the running page
      (async () => {
        try {
          if (typeof __KOFITYPE_CORE__ !== 'undefined') {
            const codeRaw = __KOFITYPE_CORE__.toString().replace(/\s+/g, '');
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeRaw));
            const hashHex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
            const token = parseInt(hashHex.slice(0, 8), 16);
            window.dispatchEvent(new CustomEvent("__kofi_inject_result__", { detail: { ok: true, token, hashHex } }));
          } else {
            window.dispatchEvent(new CustomEvent("__kofi_inject_result__", { detail: { ok: false, token: 4004198119 } }));
          }
        } catch (e) {
          window.dispatchEvent(new CustomEvent("__kofi_inject_result__", { detail: { ok: false, token: 4004198119 } }));
        }
      })();
    }
  });

  // Signal that the toolkit is ready
  window.__kofiToolkitReady = true;
  window.dispatchEvent(new CustomEvent("__kofi_toolkit_ready__"));
})();
