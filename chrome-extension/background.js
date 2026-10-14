// ============================================================
//  KofiType Toolkit — Background Service Worker
//  Handles hook mode: intercepts Discord API calls and fakes
//  approval reactions so the import flow completes instantly.
// ============================================================

const HOOK_STATE_KEY = "kofi_hook_mode";
const PENDING_MSG_KEY = "kofi_pending_msg";
const LOG_KEY = "kofi_hook_log";

// ── Storage helpers ──────────────────────────────────────────
async function getHookMode() {
  const r = await chrome.storage.local.get(HOOK_STATE_KEY);
  return !!r[HOOK_STATE_KEY];
}

async function setHookMode(val) {
  await chrome.storage.local.set({ [HOOK_STATE_KEY]: val });
}

async function appendLog(entry) {
  const r = await chrome.storage.local.get(LOG_KEY);
  const log = r[LOG_KEY] || [];
  log.unshift({ ...entry, ts: new Date().toISOString() });
  if (log.length > 50) log.length = 50; // cap at 50 entries
  await chrome.storage.local.set({ [LOG_KEY]: log });
}

// ── Message listener (from content / popup) ──────────────────
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type === "GET_HOOK_MODE") {
    getHookMode().then(v => respond({ enabled: v }));
    return true;
  }
  if (msg.type === "SET_HOOK_MODE") {
    setHookMode(msg.enabled).then(() => respond({ ok: true }));
    return true;
  }
  if (msg.type === "GET_LOG") {
    chrome.storage.local.get(LOG_KEY).then(r => respond({ log: r[LOG_KEY] || [] }));
    return true;
  }
  if (msg.type === "CLEAR_LOG") {
    chrome.storage.local.set({ [LOG_KEY]: [] }).then(() => respond({ ok: true }));
    return true;
  }
  // Content script tells us a Discord webhook POST was intercepted
  if (msg.type === "HOOK_WEBHOOK_POST") {
    handleWebhookPost(msg, sender, respond);
    return true;
  }
  // Content script asks us to fake the reaction GET response
  if (msg.type === "HOOK_REACTION_GET") {
    handleReactionGet(msg, sender, respond);
    return true;
  }
  // Content script tells us the page sent a POST (log it)
  if (msg.type === "LOG_ENTRY") {
    appendLog(msg.entry).then(() => respond({ ok: true }));
    return true;
  }
});

// ── Webhook POST handler ──────────────────────────────────────
async function handleWebhookPost(msg, sender, respond) {
  const hookEnabled = await getHookMode();
  if (!hookEnabled) {
    respond({ intercept: false });
    return;
  }

  // Generate a fake Discord-style message ID (snowflake-ish)
  const fakeId = String(Date.now()) + String(Math.floor(Math.random() * 9999)).padStart(4, "0");

  // Store the pending message so reaction GETs can respond properly
  await chrome.storage.local.set({
    [PENDING_MSG_KEY]: {
      id: fakeId,
      body: msg.body,
      ts: Date.now(),
    },
  });

  await appendLog({
    kind: "webhook_intercepted",
    fakeId,
    body: msg.body ? JSON.parse(msg.body) : null,
  });

  // Immediately schedule auto-approval reaction after a short delay
  // (simulates admin reacting within ~3 seconds)
  setTimeout(async () => {
    await chrome.storage.local.set({
      [`kofi_reaction_${fakeId}`]: {
        approved: true,
        ts: Date.now(),
      },
    });
    await appendLog({ kind: "auto_approved", fakeId });
  }, 2500);

  respond({
    intercept: true,
    fakeId,
    fakeResponse: {
      id: fakeId,
      type: 0,
      content: "",
      channel_id: "1234567890123456789",
      author: { id: "0", username: "kofitype-bot", discriminator: "0000", bot: true },
      timestamp: new Date().toISOString(),
    },
  });
}

// ── Reaction GET handler ──────────────────────────────────────
async function handleReactionGet(msg, sender, respond) {
  const hookEnabled = await getHookMode();
  if (!hookEnabled) {
    respond({ intercept: false });
    return;
  }

  const reactionKey = `kofi_reaction_${msg.messageId}`;
  const r = await chrome.storage.local.get(reactionKey);
  const reaction = r[reactionKey];

  if (reaction && reaction.approved) {
    // Return a fake message with 👍 reaction
    respond({
      intercept: true,
      fakeResponse: {
        id: msg.messageId,
        reactions: [
          {
            count: 1,
            me: false,
            emoji: { id: null, name: "👍" },
          },
        ],
      },
    });
    await appendLog({ kind: "reaction_served", messageId: msg.messageId });
  } else {
    // Reaction not yet placed — return message without reactions
    respond({
      intercept: true,
      fakeResponse: {
        id: msg.messageId,
        reactions: [],
      },
    });
  }
}
