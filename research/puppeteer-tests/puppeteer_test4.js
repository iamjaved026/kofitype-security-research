const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Catch console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('file:///' + path.resolve('c:/core/projects/kofitype/audit/v2/index.html').replace(/\\/g, '/'));
    
    // Wait for bootloader
    await new Promise(r => setTimeout(r, 1000));
    
    // Evaluate Guardian expose temporarily via evaluate to see if verify passes
    const result = await page.evaluate(async () => {
        // We will trigger importData directly if we can, or just get the verify function
        // Wait, importData uses FileReader, we can simulate an event
        
        const fileContent = `{
            "app": "kofitype",
            "version": "2.0",
            "timestamp": "2026-05-16T10:18:53.429Z",
            "user": {
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
            },
            "settings": {},
            "config": {}
        }`;
        
        // We can't easily hook into Guardian.verify directly from outside.
        // But we can trigger the importData by dispatching an event to the file input.
        return new Promise((resolve) => {
            const input = document.getElementById('import-file');
            
            // Hook showToast
            const originalShowToast = window.showToast;
            window.showToast = function(msg, icon) {
                resolve(msg);
            };
            
            // Create a fake file
            const blob = new Blob([fileContent], { type: 'application/json' });
            const file = new File([blob], "test.kofi", { type: "application/json" });
            
            // Dispatch event
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });
    console.log("Toast message:", result);
    
    await browser.close();
}

run();
