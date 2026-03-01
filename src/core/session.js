const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const os = require('os');

const SESSION_DIR = path.join(os.homedir(), '.freeapi', 'sessions');

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

async function startAuthFlow(providerName, loginUrl) {
    const sessionPath = path.join(SESSION_DIR, `${providerName}.json`);

    console.log(`\nStarting authentication flow for ${providerName}...`);
    console.log(`Please log in manually in the browser window that opens.`);

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(loginUrl);

    // In a real implementation, we would wait for a specific URL or DOM element
    // that indicates a successful login. For MVP, we'll wait for the user to 
    // close the browser window or press a key in the terminal.

    console.log(`\nOnce you have successfully logged in, close the browser window or press Ctrl+C to save the session.`);

    return new Promise((resolve) => {
        browser.on('disconnected', async () => {
            console.log(`Browser closed. Saving session state...`);
            const storageState = await context.storageState();
            fs.writeFileSync(sessionPath, JSON.stringify(storageState));
            console.log(`Session saved securely to ${sessionPath}`);
            resolve(true);
        });
    });
}

async function loadSession(providerName) {
    const sessionPath = path.join(SESSION_DIR, `${providerName}.json`);
    if (!fs.existsSync(sessionPath)) {
        return null;
    }

    console.log(`Loading saved session for ${providerName}...`);
    const storageState = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

    // Return a new headless context with the saved state
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState });

    return { browser, context };
}

module.exports = { startAuthFlow, loadSession };
