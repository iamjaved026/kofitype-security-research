const fs = require('fs');
const crypto = require('crypto');

const data = fs.readFileSync('c:/core/projects/kofitype/audit/v5/index.html', 'utf8');

const startIdx = data.indexOf('const __KOFITYPE_CORE__ = function');
if (startIdx !== -1) {
    let braceCount = 0;
    let i = data.indexOf('{', startIdx);
    let endIdx = -1;
    for (; i < data.length; i++) {
        if (data[i] === '{') braceCount++;
        if (data[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                endIdx = i;
                break;
            }
        }
    }
    if (endIdx !== -1) {
        const funcStr = data.substring(startIdx, endIdx + 1).replace('const __KOFITYPE_CORE__ = ', '');
        const codeRaw = funcStr.replace(/\s+/g, '');
        const hash = crypto.createHash('sha256').update(codeRaw).digest('hex');
        console.log("Dynamically Calculated Hash:", hash);
        console.log("Dynamically Calculated Token:", parseInt(hash.substring(0, 8), 16));
    } else {
        console.log("End brace not found");
    }
} else {
    console.log("Function not found");
}
