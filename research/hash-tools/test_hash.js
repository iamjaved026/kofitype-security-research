const crypto = require('crypto');

const SECURITY_TOKEN = 2209743887;
const _HMAC_SALT = "kofitype_guardian_v4_secure_v2_0";

function _newSha256(str) {
    const tokenStr = SECURITY_TOKEN.toString(16);
    const shift = (SECURITY_TOKEN % 254) + 1;
    let scrambled = '';
    for (let i = 0; i < str.length; i++) {
        scrambled += String.fromCharCode(str.charCodeAt(i) ^ shift);
    }
    return crypto.createHash('sha256').update(scrambled + _HMAC_SALT + tokenStr).digest('hex');
}

const restStr = `{"username":"Hacker","xp":999,"level":100,"bestWpm":300,"testsCompleted":1000,"timeTyped":99999,"history":[{"date":"5/16/2026","wpm":300,"acc":100,"mode":"time 30"}],"currentSeason":"2026-05","_n":"ait6jlfxmp871oc3","_c":-2042470801}`;

console.log("Hash of exact restStr:", _newSha256(restStr));
