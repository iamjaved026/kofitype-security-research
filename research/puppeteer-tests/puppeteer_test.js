const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Catch console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('file:///' + path.resolve('c:/core/projects/kofitype/audit/v2/index.html').replace(/\\/g, '/'));
    
    // Evaluate the hashHex that the browser calculates
    const result = await page.evaluate(async () => {
        // We can just get __KOFITYPE_CORE__ toString()
        const codeRaw = __KOFITYPE_CORE__.toString().replace(/\s+/g, '');
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeRaw));
        const hashHex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    });
    console.log("Browser hashHex:", result);
    
    await browser.close();
}

run();
