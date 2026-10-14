const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Catch console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('file:///' + require('path').resolve('c:/core/projects/kofitype/audit/v2/index.html').replace(/\\/g, '/'));
    
    // Evaluate verify
    const result = await page.evaluate(async () => {
        const SECURITY_TOKEN = 2209743887;
        const _HMAC_SALT = "kofitype_guardian_v4_secure_v2_0";

        async function _newSha256(str) {
            const tokenStr = SECURITY_TOKEN.toString(16);
            const shift = (SECURITY_TOKEN % 254) + 1;
            let scrambled = '';
            for (let i = 0; i < str.length; i++) {
                scrambled += String.fromCharCode(str.charCodeAt(i) ^ shift);
            }
            scrambled = str.length + "|" + scrambled;
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(scrambled + _HMAC_SALT + tokenStr));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        const userObj = {
            "username": "Hacker",
            "xp": 999,
            "level": 100,
            "bestWpm": 300,
            "testsCompleted": 1000,
            "timeTyped": 99999,
            "history": [
              {
                "date": "5/16/2026",
                "wpm": 300,
                "acc": 100,
                "mode": "time 30"
              }
            ],
            "currentSeason": "2026-05",
            "_n": "ait6jlfxmp871oc3",
            "_c": -2042470801,
            "sig": "27206e78fd793909a77c58ef2ae7f9c49dbffb0df4b11478697be5370b940ee5"
        };
          
        if (!userObj || !userObj.sig) return false;
        const { sig, ...rest } = userObj;

        const safeLevel = parseInt(rest.level) || 1;
        const safeXP = parseInt(rest.xp) || 0;
        const safeTime = parseInt(rest.timeTyped) || 0;
        const safeTests = parseInt(rest.testsCompleted) || 0;
        const safeWpm = parseInt(rest.bestWpm) || 0;

        if (safeWpm > 350) return "fail wpm";
        const totalXP = ((safeLevel - 1) * 1000) + safeXP;
        const maxPossibleXP = safeTime * 45;
        if (safeTime > 0 && totalXP > maxPossibleXP) return "fail xp";
        if (safeTests === 0 && (safeTime > 0 || totalXP > 0)) return "fail tests";
        if (safeTests > 0 && safeTime < safeTests * 1) return "fail time";

        const expectedNew = await _newSha256(JSON.stringify(rest));
        if (expectedNew !== sig) {
            console.log("expectedNew:", expectedNew);
            console.log("sig:        ", sig);
            console.log("rest:", JSON.stringify(rest));
            return "fail sig";
        }

        const expectedChecksum = (safeXP * safeLevel * safeTests) ^ SECURITY_TOKEN;
        if (rest._c !== expectedChecksum) return "fail checksum";

        return true;
    });
    console.log("Browser verify result:", result);
    
    await browser.close();
}

run();
