// ============================================================
//  KofiType Toolkit — Token Extractor Helper Script
//  Run this with Node.js in the browser devtools or locally
//  to extract the live SECURITY_TOKEN from the running page.
//  
//  Usage from Browser DevTools on kofitype.vercel.app:
//    1. Open DevTools (they won't work normally due to debugger traps,
//       but the extension bypasses that)
//    2. The TRUE_HASH is already logged by the app itself at line 1505:
//       console.log("TRUE_HASH:", hashHex);
//       But console is blackholed — use the extension's Hook Mode instead.
//
//  The token is: parseInt(hashHex.slice(0, 8), 16)
//  where hashHex = SHA-256 of the minified __KOFITYPE_CORE__ function body.
// ============================================================

// How the new app derives SECURITY_TOKEN (from code.html line 1512):
// const token = parseInt(hashHex.slice(0,8), 16);
// __KOFITYPE_CORE__(token);

// The maker-tool uses token 4004198119 (= 0xEEAB36E7 approx)
// The new live app derives its token fresh each time from its own code hash.
// If the site's code changes, the token changes.

// To extract the current live token, paste this in the browser console
// AFTER disabling the console blackhole (the extension does this automatically):

const TOKEN_EXTRACTOR_SNIPPET = `
(async () => {
  // Re-compute the hash the same way the app does
  const codeRaw = __KOFITYPE_CORE__.toString().replace(/\\s+/g,'');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeRaw));
  const hashHex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  const token = parseInt(hashHex.slice(0,8), 16);
  console.log('SECURITY_TOKEN:', token);
  console.log('Full hash:', hashHex);
  return token;
})();
`;

console.log("Paste the following snippet into the browser console on kofitype.vercel.app:");
console.log(TOKEN_EXTRACTOR_SNIPPET);
