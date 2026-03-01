const { chromium } = require('playwright');

class DuckAiProvider {
    constructor() {
        this.name = 'duck';
        this.browser = null;
        this.context = null;
        this.page = null;
        this.models = [
            "gpt-4o-mini",
            "claude-3-haiku-20240307",
            "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
            "mistralai/Mixtral-8x7B-Instruct-v0.1"
        ];
    }

    async init() {
        if (this.browser) return;

        console.log(`[${this.name}] Launching deep-spoofed headless browser...`);
        this.browser = await chromium.launch({ headless: true });
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            extraHTTPHeaders: {
                'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            }
        });

        // Apply deep navigator spoofing
        await this.context.addInitScript(() => {
            // Remove webdriver
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // Chrome spoofing
            window.navigator.chrome = { runtime: {} };
            // Permissions spoofing
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            // WebGL spoofing
            const getParameter = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (type, attributes) {
                const context = getParameter.apply(this, [type, attributes]);
                if (type === 'webgl' || type === 'experimental-webgl') {
                    const originalGetParameter = context.getParameter;
                    context.getParameter = function (parameter) {
                        if (parameter === 37445) return 'Google Inc. (NVIDIA)';
                        if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)';
                        return originalGetParameter.apply(this, [parameter]);
                    };
                }
                return context;
            };
            // Platform/Languages
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        });

        this.page = await this.context.newPage();
    }

    async testConnection() {
        try {
            await this.init();
            console.log(`[${this.name}] Navigating to Duck.ai...`);
            await this.page.goto('https://duck.ai/', { waitUntil: 'networkidle' });

            // Handle modal if it appears
            try {
                const agreeButton = await this.page.waitForSelector('button:has-text("Agree and Continue")', { timeout: 5000 });
                if (agreeButton) {
                    console.log(`[${this.name}] Dismissing welcome modal...`);
                    await agreeButton.click();
                    await this.page.waitForTimeout(1000);
                }
            } catch (e) {
                // Modal not found, ignore
            }

            // Verify input is ready
            await this.page.waitForSelector('textarea', { state: 'visible', timeout: 10000 });
            console.log(`[${this.name}] Connection verified. Ready for completions.`);
            return true;
        } catch (error) {
            console.error(`[${this.name}] Connection check failed:`, error.message);
            return false;
        }
    }

    async ensurePage() {
        if (this.browser && this.page && !this.page.isClosed()) {
            // Check if page is responsive
            try {
                await this.page.evaluate(() => 1);
                return;
            } catch (e) {
                console.log(`[${this.name}] Browser unresponsive, restarting...`);
            }
        }

        if (this.browser) {
            await this.close().catch(() => { });
        }
        await this.init();
        await this.testConnection();
    }

    async generateCompletion(messages, modelId) {
        await this.ensurePage();
        console.log(`[${this.name}] Generating completion for model: ${modelId}`);
        const latestPrompt = messages[messages.length - 1].content;

        try {
            // 1. Dismiss modals
            try {
                const modalBtn = await this.page.waitForSelector('button:has-text("Agree and Continue"), button.btn-primary:has-text("Agree")', { timeout: 8000 }).catch(() => null);
                if (modalBtn) {
                    await modalBtn.click();
                    await this.page.waitForTimeout(1000);
                }
                const gotItBtn = await this.page.waitForSelector('button:has-text("Got It")', { timeout: 3000 }).catch(() => null);
                if (gotItBtn) await gotItBtn.click();
            } catch (e) { }

            // 2. Focus and type
            try {
                const textarea = await this.page.waitForSelector('textarea', { timeout: 15000 });
                await textarea.focus();
                await this.page.keyboard.type(latestPrompt, { delay: 50 });
                await this.page.waitForTimeout(500);
                await this.page.keyboard.press('Enter');
                console.log(`[${this.name}] Prompt sent.`);
            } catch (e) {
                console.error(`[${this.name}] Failed to send prompt: ${e.message}`);
                await this.page.screenshot({ path: 'duck_input_error.png' }).catch(() => { });
                throw e;
            }

            // 3. Wait for response
            console.log(`[${this.name}] Waiting for non-UI response...`);
            try {
                await this.page.waitForFunction((p) => {
                    const el = document.querySelector('div[data-testid="message-body"], .font-sans');
                    if (!el) return false;
                    const txt = el.innerText.trim();
                    const bad = ["mistral", "gpt-4o", "claude", "llama", "settings", "new chat", "duck.ai", "feedback", "got it"];
                    return txt.length > 2 && txt !== p && !bad.some(w => txt.toLowerCase().includes(w));
                }, { timeout: 35000 }, latestPrompt);
            } catch (e) { }

            await this.page.waitForTimeout(5000);
            await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });

            const responseText = await this.page.evaluate((prompt) => {
                const isUI = (t) => {
                    const lower = t.toLowerCase();
                    const badWords = [
                        "mistral", "gpt-4o", "claude", "llama", "settings", "new chat",
                        "duck.ai", "feedback", "try the new", "got it", "pin", "copy",
                        "regenerate", "edit", "share", "delete"
                    ];
                    // Exact match or contains for UI noise
                    return badWords.some(w => lower === w || lower.includes(w)) || t.length < 2;
                };

                // Prioritize the actual message body test ID
                const messageBodies = Array.from(document.querySelectorAll('div[data-testid="message-body"]'));
                for (let i = messageBodies.length - 1; i >= 0; i--) {
                    const txt = messageBodies[i].innerText.trim();
                    if (txt !== prompt && !isUI(txt) && txt.length > 2) return txt;
                }

                // Fallback to sans-serif blocks
                const sansBlocks = Array.from(document.querySelectorAll('.font-sans'));
                for (let i = sansBlocks.length - 1; i >= 0; i--) {
                    const txt = sansBlocks[i].innerText.trim();
                    if (txt !== prompt && !isUI(txt) && txt.length > 2) return txt;
                }

                return "";
            }, latestPrompt);

            if (!responseText) {
                throw new Error("Could not extract any real AI response text (only found UI labels).");
            }

            return responseText;
        } catch (error) {
            console.error(`[${this.name}] Generation error:`, error.message);
            if (this.page && !this.page.isClosed()) {
                await this.page.screenshot({ path: 'duck_generation_error.png' }).catch(() => { });
            }
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = DuckAiProvider;
