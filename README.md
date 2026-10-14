<div align="center">

# ☕ KofiType Security Research
### *Authorized Vulnerability Research & Security Audit*

<br/>

[![Made by Javed](https://img.shields.io/badge/Made_with_❤️_by-Javed-d9a066?style=for-the-badge&logo=heart)](https://iamjaved.site)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Authorized_Audit-blue?style=for-the-badge&logo=shield)](https://kofitype.vercel.app)
[![Iterations](https://img.shields.io/badge/Bypass_Versions-7+-orange?style=for-the-badge&logo=git)](forge-tool/versions/)

<br/>

> **I built KofiType. Then I tried to break it. Then I fixed it. Then I tried again.**
> This repository documents that full loop — every attempt, every bypass, every patch.

<br/>

**[🌐 Visit KofiType](https://kofitype.vercel.app)** &nbsp;·&nbsp; **[👨‍💻 My Portfolio](https://iamjaved.site)** &nbsp;·&nbsp; **[🐙 GitHub](https://github.com/iamjaved026)**

</div>

---

## 📖 What Is This Project?

**KofiType** is a cozy coffee-themed typing practice app I built and deployed at [kofitype.vercel.app](https://kofitype.vercel.app). It tracks your WPM, accuracy, XP, level, and typing history — all secured with a custom client-side security layer called **Guardian**.

This repository is the **security research side** of that project. I wore both hats:

- 🧑‍💻 **Developer** — I wrote the Guardian anti-cheat system, AES-GCM encrypted exports, Discord-based import approval, and bot-detection logic.
- 🔍 **Security Researcher** — I then tried, repeatedly and systematically, to bypass everything I just built.

Every time I found a bypass, I **patched the live site**. Every time I patched it, I tried to find another way. This document is that story — 7+ iterations, automated tests, a custom Chrome extension, and eventually a real understanding of where client-side security has hard limits.

> ⚠️ **This is an authorized self-audit. I own both the target application and this research project.**

---

## 🎯 The Target: KofiType's Security Stack

KofiType implements several layers of client-side protection:

| Layer | Implementation | Purpose |
|-------|---------------|---------|
| **Guardian Anti-Cheat** | XOR obfuscated stat values with random keys | Prevent memory editing of WPM/XP/level |
| **AES-256-GCM Encryption** | All exported `.kofi` files are encrypted | Prevent manual stat editing in exports |
| **Zero-Width Steganography** | Payload encoded as `\u200B`/`\u200C` characters | Files appear blank in text editors |
| **XOR Checksum** | `_c = (xp * level * tests) ^ SECURITY_TOKEN` | Integrity verification on import |
| **SHA-256 Bootloader** | Hashes its own source code to derive the token | Self-integrity check |
| **Heuristic Validation** | XP/time/history length cross-checks | Detect statistically impossible stats |
| **Discord Approval Gate** | Import requires admin to react 👍 on Discord | Human-in-the-loop verification |
| **Signed Fetch** | HMAC-signed requests to webhook proxy | Prevent webhook spam |
| **Console Blackhole** | All `console.*` methods overwritten | Prevent DevTools inspection |
| **Debugger Trap** | `setInterval(() => { debugger; }, 1500)` | Break DevTools sessions |
| **Login/Stats/Profile Hooks** | Sends Discord alert on load/nav | Detect imported accounts |

---

## 🔁 The Research Loop — 7 Iterations

This is the actual story of how the research evolved. Every version below is a **real attempt** I made, in order.

### V1 — Plain JSON Editing *(Bypassed in ~10 mins)*
**Finding:** The original export was plain JSON. I opened it in Notepad, changed the WPM to 999, saved it, and re-imported. It worked instantly.

**What I did:** Wrote `result genrator.html` — a simple form that outputs crafted JSON stats files.

**Patch applied:** Added SHA-256 signature verification to the export format.

---

### V2 — SHA-256 Signature Bypass *(Bypassed in ~1 day)*
**Finding:** The SHA-256 hash was computed from the JSON fields + a hardcoded HMAC salt. The salt was visible in the source code.

**What I did:** Reverse-engineered the signature algorithm. Updated the generator to compute correct signatures client-side.

**Patch applied:** Moved to AES-GCM encryption using a token derived at runtime from the app's own source hash.

---

### V3 — AES Token Extraction *(Bypassed in ~2 days)*
**Finding:** The `SECURITY_TOKEN` is `parseInt(sha256(source_code).slice(0,8), 16)`. It changes only when the source code changes. I extracted it with `get_v5_hash.js`.

**What I did:** Extracted the token, replicated the full AES-GCM encryption pipeline in the forge tool.

**Patch applied:** Added heuristic validation — XP/time ratios, history array lengths, WPM caps.

---

### V4 — Heuristic Bypass Engine *(Bypassed in ~3 days)*
**Finding:** All heuristic rules are deterministic and can be computed in reverse — given target stats, I can calculate the minimum `timeTyped` and correct `history.length` needed to pass.

**What I did:** Built an auto-correcting heuristic engine into the forge tool. It takes desired stats and auto-adjusts `timeTyped`, `testsCompleted`, and history array to satisfy all rules.

**Patch applied:** Added Discord approval gate — imports now require a human (me, the admin) to react 👍 on a Discord message before they load.

---

### V5 — Discord Gate Bypass via HTTP Toolkit *(Bypassed in ~1 week)*
**Finding:** The app uses `window.fetch` to POST to `/api/verify` (a Vercel serverless proxy to Discord). If I can intercept that fetch call and fake the response, no Discord interaction is needed.

**What I did:** Used [HTTP Toolkit](https://httptoolkit.com/) to intercept and rewrite the webhook POST response. The `http-toolkit-bypass-rule.json` file contains the interception rules I configured.

Also wrote automated tests using Puppeteer (`puppeteer_test.js` through `puppeteer_test4.js`) to verify the bypass worked headlessly.

**Patch applied:** Added HMAC request signing (`X-Kofi-Signature` header), added login/stats/profile Discord hooks that fire independently.

---

### V6 — HMAC Bypass + All-webhook Hook Mode *(Bypassed in ~2 days)*
**Finding:** The HMAC secret (`kofitype_ultra_secure_passcode_99182`) is embedded in the source code and computable client-side. More importantly, all the webhook calls go through `window.fetch` — if you patch `fetch` at `document_start`, you can intercept everything before the app even runs.

**What I did:** Built the **Chrome Extension** — patches `window.fetch` in the page context before the app's IIFE even executes. All Discord calls are intercepted and faked responses are served. Approval reactions are auto-placed after 2.5 seconds.

**Patch applied:** Added SHA-256 bootloader that hashes `__KOFITYPE_CORE__`'s own source. If the code is modified, the app shows a "SECURITY BREACH" screen.

---

### V7 — Bootloader Bypass + Full Extension *(Current State)*
**Finding:** The bootloader hashes the code to derive the token, but since my extension patches `window.fetch` *before* the app runs, the bootloader runs fine (we're not modifying the code, just intercepting network calls). The `PLACEHOLDER_HASH` in the live version means the integrity check is disabled by default.

**What I did:** Completed the Chrome extension with:
- Standalone AES-GCM forge (runs in popup, no page needed)
- Full fetch intercept with auto-reaction faking
- Console restoration (bypasses the blackhole)
- Debugger trap neutralization
- Auto token extraction from the live page

**Current Status:** The circular dependency (client-side security must trust the client) means there is a fundamental limit to what can be secured purely in the browser. The research concludes here with recommendations for server-side validation.

---

## 📁 Project Structure

```
kofitype-security-research/
│
├── 📄 README.md                    ← You are here
├── 📄 LICENSE                      ← MIT License
│
├── 🔧 forge-tool/                  ← Payload forge tools (main + all versions)
│   ├── forge.html                  ← Latest forge tool (V7, AES-256-GCM)
│   └── versions/
│       ├── v1.html                 ← Plain JSON generator
│       ├── v2.html                 ← SHA-256 signed generator
│       ├── v3.html                 ← AES-GCM V3 token
│       ├── v4.html                 ← AES-GCM V4 token + heuristic bypass
│       ├── v5.html                 ← Guardian V5 token (4004198119)
│       ├── v6.html                 ← Identical to V5 (token unchanged)
│       └── v7.html                 ← V7 with visible token field
│
├── 🧩 chrome-extension/            ← Chrome extension (Hook Mode + Forge)
│   ├── manifest.json
│   ├── background.js               ← Service worker, hook mode logic
│   ├── content.js                  ← Page↔Extension bridge
│   ├── injected.js                 ← Fetch patch, anti-debug bypass
│   ├── popup.html                  ← Premium dark UI
│   ├── popup.js                    ← All popup logic
│   ├── token-extractor.js          ← Token extraction docs
│   └── icons/
│
├── 🔍 research/                    ← All test scripts and tools
│   ├── hash-tools/
│   │   ├── get_v5_hash.js          ← Extracts V5 SECURITY_TOKEN
│   │   ├── get_v6_hash.js          ← Extracts V6 SECURITY_TOKEN
│   │   ├── fetch_live.js           ← Fetches & hashes live source
│   │   ├── test_hash.js            ← Hash verification tests
│   │   ├── test_user_hash.js       ← User data hash tests
│   │   ├── test_str.js             ← String encoding tests
│   │   ├── check.js                ← General integrity checker
│   │   └── test.js / test2-4.js    ← Iterative bypass tests
│   ├── puppeteer-tests/
│   │   ├── puppeteer_test.js       ← Basic automated import test
│   │   ├── puppeteer_test2.js      ← Discord webhook interception test
│   │   ├── puppeteer_test3.js      ← Full flow automation
│   │   ├── puppeteer_test4.js      ← Headless bypass verification
│   │   └── package.json
│   └── bypass-scripts/
│       └── http-toolkit-bypass-rule.json ← HTTP Toolkit interception rules
│
├── 📸 audit-logs/                  ← Snapshots of site source at each version
│   ├── v1/ → v7/                   ← index.html of the site at each audit stage
│   └── v8-latest-source.html       ← Current live source
│
├── 💾 site-source/
│   └── kofitype-latest.html        ← Full source of live site (new security)
│
└── 📦 export-samples/
    └── example.kofi                ← Sample encrypted .kofi export file
```

---

## 🛠️ Tools Used

| Tool | Purpose |
|------|---------|
| **Browser DevTools** | Source inspection, localStorage, network monitoring |
| **[HTTP Toolkit](https://httptoolkit.com/)** | Intercept & rewrite fetch/XHR requests |
| **Puppeteer (Node.js)** | Headless browser automation for bypass testing |
| **Web Crypto API** | Replicating AES-GCM encryption in the forge tools |
| **Chrome Extensions (MV3)** | Deep page context injection & fetch patching |
| **Node.js** | Hash computation scripts & fetch automation |

---

## 🚀 How to Try This Yourself

> **Before you start:** These tools are built for [kofitype.vercel.app](https://kofitype.vercel.app). Go visit it first — it's actually a great typing app! 

### Option A — Use the Forge Tool (Standalone, No Install)

1. Open `forge-tool/forge.html` in any modern browser
2. Fill in your desired stats (Username, WPM, XP, Level, etc.)
3. If the site has updated its security token, you'll need to extract it (see below)
4. Click **⚡ Forge & Download** — a `.kofi` file downloads
5. Go to [kofitype.vercel.app](https://kofitype.vercel.app) → Settings → Import → upload the file
6. The Discord approval gate will block you — that's where Option B comes in

### Option B — Use the Chrome Extension (Full Hook Mode)

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. Navigate to [kofitype.vercel.app](https://kofitype.vercel.app)
5. Click the ☕ icon in the toolbar — the popup opens
6. In the **Forge** tab: fill stats → click Forge — the `.kofi` file downloads instantly (no page needed)
7. In the **Hook** tab: toggle **Hook Mode ON**
8. Go to Settings → Import → upload your `.kofi` file
9. Watch the **Log** tab — the Discord webhook POST is intercepted and a fake 👍 reaction is auto-served in ~3 seconds
10. Import completes ✅ — your forged stats load

### Option C — Run the Puppeteer Tests

```bash
cd research/puppeteer-tests
npm install
node puppeteer_test4.js
```

### Extracting the Current Security Token

The app's `SECURITY_TOKEN` is derived as:
```js
const token = parseInt( sha256( minified_source_of___KOFITYPE_CORE__ ).slice(0,8), 16 );
```

To extract it, open DevTools on kofitype.vercel.app and paste:
```js
(async () => {
  const raw = __KOFITYPE_CORE__.toString().replace(/\s+/g,'');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  console.log('Token:', parseInt(hex.slice(0,8), 16));
})();
```
*(The Chrome extension's Forge tab does this automatically)*

---

## 🔐 Security Findings & Lessons

### What Actually Works (Client-Side)
- ✅ AES-GCM encryption with runtime-derived keys — stops casual file editing
- ✅ Zero-width steganography — protects against Notepad/hex editor tampering
- ✅ Heuristic validation — catches statistically impossible stats
- ✅ Discord approval gate — adds human friction to import abuse

### Fundamental Limitations (Client-Side)
- ❌ Any secret embedded in client-side code **can be extracted** — the AES key, HMAC secret, and token derivation logic are all readable
- ❌ `window.fetch` can be patched before app code runs — cannot be reliably protected
- ❌ `debugger` traps and console blackholes can be bypassed by extension injection at `document_start`
- ❌ The SHA-256 bootloader is effectively a hash of publicly visible code — knowing the hash doesn't help when the attacker can replicate the entire environment

### Recommendations (Reported to Myself 😅)
1. **Move validation server-side** — Vercel Functions can validate stat relationships before accepting any import
2. **Rate-limit imports** at the server level, not the client
3. **Bind exports to a user identity** — exports signed with a server-issued key that ties to an account
4. **The Discord gate is the strongest layer** — it adds real human review, but it's bypassable via fetch patching at the extension level. A server-side webhook with secret validation would be stronger.

---

## 👨‍💻 Credits

<table>
<tr>
<td align="center" width="50%">

**Javed**<br/>
*Developer & Security Researcher*<br/><br/>
Built KofiType, conducted this entire research, built all bypass tools, reported all findings, patched the live site 7+ times.<br/><br/>
🌐 [iamjaved.site](https://iamjaved.site)<br/>
🐙 [@iamjaved026](https://github.com/iamjaved026)

</td>
<td align="center" width="50%">

**KofiType** *(also by Javed)*<br/>
*The Target Application*<br/><br/>
A cozy coffee-themed typing practice app with WPM tracking, XP/leveling, and a custom Guardian anti-cheat system. Visit the real app at:<br/><br/>
🌐 [kofitype.vercel.app](https://kofitype.vercel.app)<br/>
⌨️ *Start typing — it's actually really good!*

</td>
</tr>
</table>

---

## 📜 Disclaimer

This project represents **authorized security research** conducted by the developer against their own application.

- ✅ I own both the research tools and the target application
- ✅ All findings were used to improve the live application's security
- ✅ No user data was accessed, modified, or exfiltrated
- ✅ This is released as open source for educational purposes

> **Do not use these techniques against applications you do not own.**
> Unauthorized security testing is illegal under the Computer Fraud and Abuse Act (CFAA), the Computer Misuse Act, and equivalent laws in most jurisdictions.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for full text.

---

<div align="center">

*"The best way to understand how to defend something is to try to break it."*

Made with ☕ and curiosity by **[Javed](https://iamjaved.site)**

</div>
