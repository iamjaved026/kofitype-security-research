const fs = require('fs');

async function testBrowser() {
    const codeRaw = fs.readFileSync('c:/core/projects/kofitype/audit/v2/index.html', 'utf8');
    const __EXPECTED_SIGNATURE__ = "83b6440f743ab34b8e5dcceb803fcc13e9cd466d11da956d3fab46f6c9ae28e6";

    const regex = /window\.__KOFITYPE_CORE__ = function\(SECURITY_TOKEN\) \{([\s\S]*?)\};\n\s*\/\/ --- SECURE BOOTLOADER ---/;
    const match = codeRaw.match(regex);
    if (!match) {
        console.log("no match");
        return;
    }
    const coreCode = match[1];

    console.log("Core code length:", coreCode.length);
}

testBrowser();
