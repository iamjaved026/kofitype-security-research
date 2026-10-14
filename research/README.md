# 🔍 Research Scripts

All test and analysis scripts used during the security audit.

## hash-tools/

Scripts to extract and verify the SECURITY_TOKEN from the live site.

| Script | Purpose |
|--------|---------|
| `get_v5_hash.js` | Fetches live site and computes V5 token |
| `get_v6_hash.js` | Same for V6 |
| `fetch_live.js` | Downloads live source and runs hash extraction |
| `test_hash.js` | Verifies hash against known values |
| `test_user_hash.js` | Tests user data signature verification |
| `test_str.js` | Tests zero-width steganography encode/decode |
| `check.js` | General integrity check script |
| `test.js` → `test4.js` | Iterative bypass testing scripts |

### Run a hash tool

```bash
node hash-tools/get_v5_hash.js
```

## puppeteer-tests/

Automated browser tests using Puppeteer to verify bypass techniques headlessly.

```bash
cd puppeteer-tests
npm install
node puppeteer_test4.js   # most complete test
```

| Script | What it tests |
|--------|--------------|
| `puppeteer_test.js` | Basic automated `.kofi` import flow |
| `puppeteer_test2.js` | Webhook interception via page context |
| `puppeteer_test3.js` | Full bypass automation end-to-end |
| `puppeteer_test4.js` | Final headless verification of all bypasses |

## bypass-scripts/

| File | Purpose |
|------|---------|
| `http-toolkit-bypass-rule.json` | HTTP Toolkit rule to intercept and rewrite Discord webhook responses. Import in [HTTP Toolkit](https://httptoolkit.com/) |

---

## 🔗 Project Links & Credits

- **GitHub Repository**: [iamjaved026/kofitype-security-research](https://github.com/iamjaved026/kofitype-security-research)
- **Research Website**: [kofitype-research.javedhussain.com](https://kofitype-research.javedhussain.com)
- **Security Researcher**: [Javed Hussain (@iamjaved026)](https://iamjaved.site)
- **Target Application**: [KofiType](https://kofitype.vercel.app) by **Amar**

