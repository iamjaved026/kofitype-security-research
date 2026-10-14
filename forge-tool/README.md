# 🔧 Forge Tool — KofiType Payload Generator

Standalone HTML tools that generate valid, encrypted `.kofi` export files for KofiType.

## Versions

| File | Target | Token | Security |
|------|--------|-------|---------|
| `versions/v1.html` | KofiType V1 | None | Plain JSON |
| `versions/v2.html` | KofiType V2 | None | SHA-256 HMAC signature |
| `versions/v3.html` | KofiType V3 | `4100198909` | AES-256-GCM |
| `versions/v4.html` | KofiType V4 | `2589710461` | AES-GCM + heuristic bypass |
| `versions/v5.html` | KofiType V5 | `4004198119` | AES-GCM + XOR checksum + stego |
| `versions/v6.html` | KofiType V6 | `4004198119` | Same token, unchanged |
| `versions/v7.html` | KofiType V7 | Runtime-derived | Token field visible |
| **`forge.html`** | **Latest** | **Auto-detect** | **Full Guardian bypass** |

## Usage

1. Open `forge.html` in Chrome (or any modern browser)
2. Fill in your desired stats
3. Paste the current SECURITY_TOKEN (or use the Chrome extension to auto-detect it)
4. Click **⚡ Forge & Download**
5. Upload the `.kofi` file to kofitype.vercel.app

## How the Security Token Changes

The token is derived as:
```js
const token = parseInt( sha256( __KOFITYPE_CORE__.toString().replace(/\s+/g,'') ).slice(0, 8), 16 );
```
Every time the site's source code changes, the token changes. Use the Chrome extension to auto-detect the current value.
