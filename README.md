# Freeapi

Freeapi is an infrastructure-level developer tool that acts as a structured API exposure layer. It enables developers to seamlessly transform complex, UI-driven AI chatbots and web platforms into standardized, production-ready REST APIs.

Rather than relying on fragile web scrapers or unofficial wrappers, Freeapi brings the abstraction layer direct to the user's local machine. By bridging your own authenticated browser sessions securely, it generates clean, standardized JSON contracts (such as OpenAI-compatible endpoints) that can be easily consumed by any application, script, or backend service.

## Core Philosophy

* **Infrastructure First**: Built as a robust abstraction layer, treating browser sessions as programmable components.
* **Clean Contracts over Messy Integrations**: Hides DOM manipulation, latency handling, and provider-specific data structures behind standard REST paradigms.
* **Backend Integrated**: Designed specifically for developers, startups, and backend engineers who need programmatic access to AI platforms that lack official APIs.

## Supported Providers

* **Gemini Web**: Google's Gemini Chat Interface.
* *(More provider adapters are actively being added)*

## Architecture

Freeapi relies on a multi-stage architecture localized entirely on the user's machine to protect credentials and manage state securely:

1. **Authentication:** Uses Playwright to orchestrate a visible browser flow. Once the user logs in, the session token context (Cookies, LocalStorage) is saved securely to `~/.freeapi/`.
2. **The Proxy Server:** An Express-driven Local API server (`localhost:3000`) sits behind a locally generated API key barrier. 
3. **Provider Adapters:** Modular classes handle the routing, normalization, and UI automation required to proxy the request to the target provider.

## Installation

Ensure you have Node.js installed, then clone the repository:

```bash
git clone https://github.com/ashmitkumar2005/freeapi.git
cd freeapi
npm install
```

## Quick Start Guide

### 1. Authenticate a Provider Session

To interact with a provider, you must first log in using your own credentials. Run the login command and follow the instructions in the browser window that opens.

```bash
node src/index.js login gemini
```

Once logged in successfully, close the browser window. Freeapi will save the session context securely on your local machine.

### 2. Start the Local API Server

Start the local server, which will load your saved headless session and initiate the REST interface on port `3000`.

```bash
node src/index.js start gemini
```

Upon the first execution, Freeapi will generate a highly secure `LOCAL_API_KEY` in your `.env` file. You will need this key to authorize your requests.

### 3. Consume the API

You can now hit the local `localhost:3000` endpoints just as you would any highly structured production API.

**Check Available Models:**
```bash
curl -H "Authorization: Bearer <YOUR_LOCAL_API_KEY>" http://localhost:3000/v1/models
```

**Generate a Chat Completion (OpenAI Schema):**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_LOCAL_API_KEY>" \
  -d '{"model": "gemini-web", "messages": [{"role": "user", "content": "Explain quantum computing in one sentence."}]}' \
  http://localhost:3000/v1/chat/completions
```

## Security Notice

Freeapi is a local infrastructure proxy. It saves raw session tokens (which provide full access to the authenticated accounts) unencrypted on the local file system (`~/.freeapi/sessions/`).

* **Do not** deploy Freeapi on shared or public cloud servers without significant sandboxing and isolation.
* **Always** use the generated `LOCAL_API_KEY` when communicating with the proxy server to prevent cross-origin or rogue local script abuse.
* The system is intended strictly for local development and secure, controlled backend environments.

## License

MIT License
