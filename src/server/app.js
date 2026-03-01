const express = require('express');
const crypto = require('crypto');
const app = express();
const port = 3000;

app.use(express.json());

let activeProvider = null; // Stored provider instance

// Dummy Key checking middleware
app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.LOCAL_API_KEY}`) {
        return res.status(401).json({ error: "Unauthorized. Invalid Local API Key." });
    }
    next();
});

// Example Provider Router
app.post('/v1/chat/completions', async (req, res) => {
    try {
        if (!activeProvider) {
            return res.status(503).json({ error: "No active provider loaded by Freeapi." });
        }

        const messages = req.body.messages;
        const model = req.body.model || "mock-model";

        console.log(`[HTTP] Processing /v1/chat/completions for ${activeProvider.name}`);

        const responseText = await activeProvider.generateCompletion(messages, model);

        // Normalize the provider adapter's text string into the OpenAI schema framework
        res.json({
            id: "chatcmpl-" + crypto.randomBytes(4).toString('hex'),
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
                index: 0,
                message: {
                    role: "assistant",
                    content: responseText
                },
                finish_reason: "stop"
            }]
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/v1/models', (req, res) => {
    let providerName = activeProvider ? activeProvider.name : "unloaded";
    res.json({
        object: "list",
        data: [
            { id: providerName + "-model", object: "model", created: Math.floor(Date.now() / 1000), owned_by: "freeapi" }
        ]
    })
});

const startServer = async (providerInstance) => {
    activeProvider = providerInstance;

    // Attempt an initial connection check to prime the browser context
    if (typeof activeProvider.testConnection === 'function') {
        const isConnected = await activeProvider.testConnection();
        if (!isConnected) {
            console.warn(`[WARNING] Active provider failed connection test. May need to re-login.`);
        }
    }

    app.listen(port, () => {
        console.log(`[Freeapi] Local server listening on http://localhost:${port}`);
    });
};

module.exports = { startServer };
