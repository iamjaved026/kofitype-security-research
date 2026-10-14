const fs = require('fs');
const crypto = require('crypto');

async function testBrowser() {
    const codeRaw = fs.readFileSync('c:/core/projects/kofitype/audit/v2/index.html', 'utf8');

    const regex = /const __KOFITYPE_CORE__ = function \(SECURITY_TOKEN\) \{([\s\S]*?)\n\s*\};\n\s*\/\/ --- SECURE BOOTLOADER ---/;
    const match = codeRaw.match(regex);
    if (!match) {
        console.log("no match");
        return;
    }
    const coreCode = "function (SECURITY_TOKEN) {" + match[1] + "\n        }";

    // Remove all whitespace
    const codeStripped = coreCode.replace(/\s+/g, '');
    
    console.log("Stripped length:", codeStripped.length);
    
    const hash = crypto.createHash('sha256').update(codeStripped).digest('hex');
    console.log("Calculated hash:", hash);
    console.log("Expected hash:  ", "83b6440f743ab34b8e5dcceb803fcc13e9cd466d11da956d3fab46f6c9ae28e6");
}

testBrowser();
