const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. Static Files (NO AUTH)
app.use('/client', express.static(path.join(__dirname, '../../test-client')));

let activeProvider = null;

// 2. API Router (/v1)
const v1Router = express.Router();

// Auth Middleware for API
v1Router.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.LOCAL_API_KEY}`) {
        console.warn(`[HTTP] Unauthorized request to ${req.path}`);
        return res.status(401).json({ error: "Unauthorized. Invalid Local API Key." });
    }
    next();
});

// Chat Completions
v1Router.post('/chat/completions', async (req, res) => {
    try {
        if (!activeProvider) {
            return res.status(503).json({ error: "No active provider loaded." });
        }
        const { messages, model } = req.body;
        console.log(`[HTTP] Completion request: ${model}`);

        const responseText = await activeProvider.generateCompletion(messages, model || "default");

        res.json({
            id: "chatcmpl-" + crypto.randomBytes(4).toString('hex'),
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: model || "default",
            choices: [{
                index: 0,
                message: { role: "assistant", content: responseText },
                finish_reason: "stop"
            }]
        });
    } catch (e) {
        console.error("[HTTP] Completion error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Models List
v1Router.get('/models', (req, res) => {
    const providerName = activeProvider ? activeProvider.name : "unloaded";
    const models = (activeProvider && activeProvider.models) || [providerName + "-model"];

    res.json({
        object: "list",
        data: models.map(id => ({
            id,
            object: "model",
            created: Math.floor(Date.now() / 1000),
            owned_by: providerName
        }))
    });
});

app.use('/v1', v1Router);

const startServer = async (providerInstance) => {
    activeProvider = providerInstance;
    if (typeof activeProvider.testConnection === 'function') {
        await activeProvider.testConnection();
    }
    app.listen(port, () => {
        console.log(`[Freeapi] Server running at http://localhost:${port}`);
        console.log(`[Freeapi] Test UI available at http://localhost:${port}/client/index.html`);
    });
};

module.exports = { startServer };
