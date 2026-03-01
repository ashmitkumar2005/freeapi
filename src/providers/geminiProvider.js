class GeminiProvider {
    constructor(browserContext, browser) {
        this.context = browserContext;
        this.browser = browser;
        this.name = 'gemini';
        this.page = null;
    }

    async testConnection() {
        console.log(`[${this.name}] Testing connection to Gemini...`);
        try {
            this.page = await this.context.newPage();
            await this.page.goto('https://gemini.google.com/app', { waitUntil: 'networkidle' });

            // Wait for the chat input box to ensure we are logged in
            await this.page.waitForSelector('rich-textarea', { state: 'visible', timeout: 15000 });
            console.log(`[${this.name}] Connection successful. Ready to prompt.`);
            return true;
        } catch (error) {
            console.error(`[${this.name}] Connection failed. Ensure your session is logged in.`);
            return false;
        }
    }

    async generateCompletion(messages, model) {
        if (!this.page) {
            const isConnected = await this.testConnection();
            if (!isConnected) throw new Error("Could not connect to Gemini. Check your session.");
        }

        console.log(`[${this.name}] Forwarding completion request...`);

        // Extract the actual user string from the chat array
        // In a full implementation, we would format the history into the prompt
        const latestMessage = messages[messages.length - 1].content;

        // Ensure we are focused on the input box
        const inputSelector = 'rich-textarea';
        await this.page.waitForSelector(inputSelector);
        await this.page.click(inputSelector);

        // Type the prompt and send it
        await this.page.fill(inputSelector, latestMessage);

        // Wait a slight fraction of a second to mimic human behavior
        await this.page.waitForTimeout(300);
        await this.page.keyboard.press('Enter');

        console.log(`[${this.name}] Prompt sent. Waiting for generation...`);

        // Wait for the generation to finish. 
        // Gemini shows a "Stop generating" animation that turns into a "Copy" button or similar when done.
        // Easiest reliable way is to wait for the network to be mostly idle after sending
        await this.page.waitForTimeout(2000); // Wait for the initial request to fire
        await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => { });

        // Extract the responses
        // Based on current Gemini DOM. This selector might need updating if Gemini changes design.
        const responseSelector = 'message-content';
        await this.page.waitForSelector(responseSelector, { state: 'visible', timeout: 15000 });

        const stringResponses = await this.page.$$eval(responseSelector, elements => {
            return elements.map(el => el.innerText);
        });

        // Get the latest response block
        const finalResponse = stringResponses[stringResponses.length - 1];

        return finalResponse || "Error: Could not extract response from Gemini DOM.";
    }
}

module.exports = GeminiProvider;
