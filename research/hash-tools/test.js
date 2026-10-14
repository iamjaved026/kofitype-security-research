const crypto = require('crypto');

const _HMAC_SALT = "kofitype_guardian_v4_secure_v2_0";
const SECURITY_TOKEN = 2209743887;

async function _newSha256(str) {
    const tokenStr = SECURITY_TOKEN.toString(16);
    const shift = (SECURITY_TOKEN % 254) + 1;
    let scrambled = "";
    for (let i = 0; i < str.length; i++) {
        scrambled += String.fromCharCode(str.charCodeAt(i) ^ shift);
    }
    scrambled = str.length + "|" + scrambled;
    return crypto.createHash('sha256').update(scrambled + _HMAC_SALT + tokenStr).digest('hex');
}

async function verify(userObj) {
    if (!userObj || !userObj.sig) return false;
    const { sig, ...rest } = userObj;

    const safeLevel = parseInt(rest.level) || 1;
    const safeXP = parseInt(rest.xp) || 0;
    const safeTime = parseInt(rest.timeTyped) || 0;
    const safeTests = parseInt(rest.testsCompleted) || 0;
    const safeWpm = parseInt(rest.bestWpm) || 0;

    if (safeWpm > 350) return { error: "wpm > 350" };
    const totalXP = ((safeLevel - 1) * 1000) + safeXP;
    const maxPossibleXP = safeTime * 45;
    if (safeTime > 0 && totalXP > maxPossibleXP) return { error: `totalXP ${totalXP} > maxPossibleXP ${maxPossibleXP}` };
    if (safeTests === 0 && (safeTime > 0 || totalXP > 0)) return { error: "tests 0" };
    if (safeTests > 0 && safeTime < safeTests * 1) return { error: "time < tests" };

    const expectedNew = await _newSha256(JSON.stringify(rest));
    if (expectedNew !== sig) return { error: `sig mismatch: expected ${expectedNew}, got ${sig}` };

    const expectedChecksum = (safeXP * safeLevel * safeTests) ^ SECURITY_TOKEN;
    if (rest._c !== expectedChecksum) return { error: `checksum mismatch: expected ${expectedChecksum}, got ${rest._c}` };

    return true;
}

const obj = {
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

verify(obj).then(console.log);
