# Freeapi

Freeapi is an infrastructure-level developer tool that acts as a structured API exposure layer. It enables developers to seamlessly transform complex, UI-driven AI chatbots and web platforms into standardized, production-ready REST APIs.

Rather than relying on fragile web scrapers or unofficial wrappers, Freeapi brings the abstraction layer direct to the user's local machine. By bridging your own authenticated browser sessions securely, it generates clean, standardized JSON contracts (such as OpenAI-compatible endpoints) that can be easily consumed by any application, script, or backend service.

## Core Philosophy

* **Infrastructure First**: Built as a robust abstraction layer, treating browser sessions as programmable components.
* **Clean Contracts over Messy Integrations**: Hides DOM manipulation, latency handling, and provider-specific data structures behind standard REST paradigms.
* **Backend Integrated**: Designed specifically for developers, startups, and backend engineers who need programmatic access to AI platforms that lack official APIs.

## Supported Providers

* **Duck.ai**: (Beta) Anonymous access, No login required. Features deep-headless stealth.
* **Gemini Web**: Google's Gemini Chat Interface. requires local login.
* *(More provider adapters are actively being added)*

## Architecture

Freeapi relies on a multi-stage architecture localized entirely on the user's machine:

1. **Authentication:** For providers like Gemini, it orchestrates a visible browser flow to save session context to `~/.freeapi/`. For anonymous providers like Duck.ai, it uses deep-spoofed headless browser instances.
2. **The Proxy Server:** An Express-driven Local API server (`localhost:3000`) with a dedicated `/v1` router protected by a locally generated API key.
3. **Provider Adapters:** Modular classes handle the routing, normalization, and UI automation required to proxy the request.

## Installation

Ensure you have Node.js installed, then clone the repository:

```bash
git clone https://github.com/ashmitkumar2005/FreeAPI.git
cd FreeAPI
npm install
npx playwright install chromium
```

## Quick Start Guide

### 1. Authenticate (If required)

For Gemini:
```bash
node src/index.js login gemini
```

**For Duck.ai (No login needed):**
Skip directly to step 2.

### 2. Start the Local API Server

Start the local server for your chosen provider:

```bash
# For Duck.ai
node src/index.js start duck

# For Gemini
node src/index.js start gemini
```

Upon first execution, Freeapi generates a `LOCAL_API_KEY` in your `.env` file.

### 3. Test with the Premium Chatbot UI

Freeapi now includes a built-in premium glassmorphism test client. Once the server is running, visit:

**[http://localhost:3000/client/index.html](http://localhost:3000/client/index.html)**

### 4. Consume the API Programmatically

**Check Available Models:**
```bash
curl -H "Authorization: Bearer <YOUR_LOCAL_API_KEY>" http://localhost:3000/v1/models
```

**Generate a Chat Completion:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_LOCAL_API_KEY>" \
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello!"}]}' \
  http://localhost:3000/v1/chat/completions
```

## Security Notice

Freeapi is a local infrastructure proxy. 

* **Local Auth**: Raw session tokens for authenticated accounts are stored on the local file system.
* **API Protection**: The `/v1` API route is protected by your local key. The `/client` UI is served openly for local use.
* **Intended Use**: Strictly for local development and secure, controlled backend environments.

## License

MIT License
