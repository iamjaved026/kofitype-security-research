const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Catch console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('file:///' + path.resolve('c:/core/projects/kofitype/audit/v2/index.html').replace(/\\/g, '/'));
    
    // Evaluate verify
    const result = await page.evaluate(async () => {
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
          
          return window.__G ? window.__G.verify(userObj) : "no vault";
    });
    console.log("Browser verify result:", result);
    
    await browser.close();
}

run();
