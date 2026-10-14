# 🧩 Chrome Extension — KofiType Toolkit

A fully-featured Chrome Extension (Manifest V3) that serves as the ultimate tool for this research project.

## Features

| Tab | What it does |
|-----|-------------|
| **⚡ Forge** | Generate valid AES-256-GCM encrypted `.kofi` files directly from the popup — no page needed |
| **🎣 Hook Mode** | Intercept all Discord webhook calls, fake approval reactions automatically |
| **📊 Stats** | Read the current page's localStorage data |
| **🖥 Log** | See all intercepted requests in real-time |

## Install

1. `chrome://extensions` → Developer Mode ON
2. **Load unpacked** → select this `chrome-extension/` folder
3. Navigate to [kofitype.vercel.app](https://kofitype.vercel.app)
4. Click the ☕ toolbar icon

## Key Files

| File | Role |
|------|------|
| `background.js` | Service worker — stores hook state, handles fake reactions |
| `content.js` | Injected at `document_start` — bridges page ↔ extension |
| `injected.js` | Runs in page JS context — patches `window.fetch`, neutralizes debugger trap, restores console |
| `popup.html/js` | The UI — zero inline JS (required by MV3 CSP) |

## How Hook Mode Works

```
User uploads .kofi
     ↓
App calls fetch("/api/verify", { method: "POST", ... })
     ↓
injected.js intercepts → asks background.js if hook is ON
     ↓
Returns fake Discord response { id: "fakeId" }
     ↓
App polls fetch("/api/verify?messageId=fakeId")
     ↓
background.js returns fake message with { reactions: [{ emoji: { name: "👍" } }] }
     ↓
App sees 👍 reaction → finishImport() → stats loaded ✅
```
