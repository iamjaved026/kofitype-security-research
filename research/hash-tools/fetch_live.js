const https = require('https');
const crypto = require('crypto');

https.get('https://kofitype.vercel.app/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
        const sigMatch = data.match(/const\s+__EXPECTED_SIGNATURE__\s*=\s*["']([a-f0-9]+)["']/i);
        if (sigMatch) {
            console.log("Found __EXPECTED_SIGNATURE__:", sigMatch[1]);
            const hex = sigMatch[1];
            const token = parseInt(hex.substring(0, 8), 16);
            console.log("Calculated SECURITY_TOKEN:", token);
        } else {
            console.log("Could not find __EXPECTED_SIGNATURE__");
        }
        
        // Also try to find __KOFITYPE_CORE__ to hash it manually
        const coreMatch = data.match(/const\s+__KOFITYPE_CORE__\s*=\s*function\s*\(\w+\)\s*{([\s\S]*?)};\s*\/\/\s*---\s*SECURE\s*BOOTLOADER\s*---/);
        // Wait, the regex might be tricky. Let's just find the function block.
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
            }
        }
    });
}).on('error', err => {
    console.error(err);
});
