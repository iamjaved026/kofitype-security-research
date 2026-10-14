// ============================================================
//  KofiType Toolkit — Content Script
//  Injected at document_start on kofitype.vercel.app
//  Patches window.fetch to intercept Discord-bound requests.
// ============================================================

(function () {
  "use strict";

  // Inject the in-page script via a <script> tag so it runs
  // in the page's JS context (not the isolated content-script world)
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("injected.js");
  s.dataset.extId = chrome.runtime.id;
  (document.head || document.documentElement).appendChild(s);
  s.remove(); // clean up after execution

  // Bridge: listen for messages from the injected page script
  window.addEventListener("__kofi_ext_msg__", async (evt) => {
    const { type, payload, nonce } = evt.detail || {};

    chrome.runtime.sendMessage({ type, ...payload }, (response) => {
      // Send response back to the page
      window.dispatchEvent(
        new CustomEvent("__kofi_ext_reply__", {
          detail: { nonce, response },
        })
      );
    });
  });

  // Also listen for messages from popup to trigger page actions
  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (msg.type === "PING_CONTENT") {
      respond({ alive: true });
      return true;
    }
    if (msg.type === "INJECT_PAYLOAD") {
      // Forward payload injection request to the page
      window.dispatchEvent(
        new CustomEvent("__kofi_inject_payload__", {
          detail: msg,
        })
      );
      respond({ ok: true });
      return true;
    }
  });
})();
