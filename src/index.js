require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { startAuthFlow, loadSession } = require('./core/session');
const { startServer } = require('./server/app');
const ExampleProvider = require('./providers/exampleProvider');
const GeminiProvider = require('./providers/geminiProvider');
const DuckAiProvider = require('./providers/duckProvider');

// Ensure an API key exists or generate one securely
const ENV_PATH = path.join(__dirname, '..', '.env');
if (!process.env.LOCAL_API_KEY) {
    const newKey = 'frapi_' + crypto.randomBytes(24).toString('hex');
    fs.writeFileSync(ENV_PATH, `LOCAL_API_KEY=${newKey}\n`, { flag: 'a' });
    process.env.LOCAL_API_KEY = newKey;
    console.log(`\n=========================================================\n`);
    console.log(`[SECURE] Secret API Key Generated:`);
    console.log(`LOCAL_API_KEY=${newKey}`);
    console.log(`\n=========================================================\n`);
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const providerName = args[1] || 'example'; // Default to example provider

    console.log(`Starting Freeapi CLI...\n`);

    if (command === 'login') {
        if (providerName === 'duck') {
            console.log(`[Duck.ai] No login required! The Duck.ai provider operates entirely with a spoofed headless browser.`);
            console.log(`To start the server, simply run: node src/index.js start duck`);
            return process.exit(0);
        }

        let loginUrl = 'https://example.com';
        if (providerName === 'gemini') {
            loginUrl = 'https://gemini.google.com/';
        }
        await startAuthFlow(providerName, loginUrl);
        process.exit(0);
    }
    else if (command === 'start') {
        let providerInstance;

        if (providerName === 'duck') {
            console.log(`Initializing Duck.ai spoofed headless adapter...`);
            providerInstance = new DuckAiProvider();
        } else {
            const sessionData = await loadSession(providerName);
            if (!sessionData) {
                console.error(`Error: No saved session found for provider '${providerName}'.`);
                console.log(`Please run: node src/index.js login ${providerName}`);
                process.exit(1);
            }

            console.log(`Session loaded successfully. Initializing ${providerName} adapter...`);
            if (providerName === 'gemini') {
                providerInstance = new GeminiProvider(sessionData.context, sessionData.browser);
            } else {
                providerInstance = new ExampleProvider(sessionData.context);
            }
        }

        startServer(providerInstance);
    }
    else {
        console.log(`Usage:`);
        console.log(`  node src/index.js login [provider]   - Start browser to log in to a provider`);
        console.log(`  node src/index.js start [provider]   - Start local API server using saved session`);
    }
}

main().catch(console.error);
