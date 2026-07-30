# CV Forge

A local-first AI CV maker that turns messy career notes into structured, editable CV data, then renders it in polished layouts or fills a custom `{{placeholder}}` text template.

## What is included

- AI extraction, rewriting, accomplishment coaching, and target-role tailoring
- Configurable OpenAI model, defaulting to `gpt-5.6-sol`
- Structured JSON output so the model cannot silently change the application format
- Three visual CV layouts: Slate, Halo, and Editorial
- Custom text templates with scalar placeholders and array loops
- Live manual editing for every field
- Local browser persistence
- Print / Save as PDF, standalone HTML, JSON, and TXT exports
- No client-side API key exposure
- No application database in the MVP; the server does not persist CV content
- Basic request-size limits, rate limiting, CSP headers, and hashed safety identifiers

## Important: ChatGPT Plus vs API

A ChatGPT Plus subscription does not include OpenAI API usage. To connect this web app to GPT-5.6 Sol, create an API key and enable API billing separately. The key stays on the Node server and is never sent to the browser.

## Run locally

Requirements: Node.js 20 or newer. No package installation is needed.

```bash
cp .env.example .env
# Edit .env and add OPENAI_API_KEY
npm start
```

Open `http://localhost:3000`.

For development with automatic server restarts:

```bash
npm run dev
```

Run checks:

```bash
npm run check
```

## Environment variables

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5.6-sol
OPENAI_REASONING_EFFORT=medium
PORT=3000
```

The model is configurable. For lower cost or latency, set another model supported by the Responses API and Structured Outputs.

## Custom template syntax

Scalar fields:

```text
{{personal.name}}
{{personal.title}}
{{summary}}
{{skills}}
```

Loops:

```text
{{#experience}}
{{role}} — {{organization}}
{{start}}–{{end}}
{{summary}}
Achievements: {{achievements}}
{{/experience}}
```

Inside a loop, fields refer to the current item. Arrays such as `achievements` are rendered as comma-separated text.

## Architecture

```text
Browser SPA
  ├─ localStorage: draft CV, story, settings
  ├─ manual editor and template engine
  ├─ visual CV renderer
  └─ export tools
        │
        ▼
Node HTTP server
  ├─ static file serving
  ├─ security headers and request limits
  └─ POST /api/ai/parse
        │
        ▼
OpenAI Responses API
  └─ structured output matching the CV JSON schema
```

## Privacy and production hardening

The MVP is designed for local use and small private deployments. Before turning it into a public SaaS product, add:

- Authentication and per-user encrypted storage
- A proper distributed rate limiter
- Secret management through the hosting platform
- Audit logs that exclude CV content
- Consent, retention, deletion, and privacy controls appropriate to your jurisdiction
- Usage metering and cost limits
- File malware scanning if document uploads are expanded beyond plain text
- Server-side PDF generation for consistent typography across devices
- Automated prompt evaluations to catch regressions when models or prompts change

## Suggested next production step

Keep the current JSON profile as the canonical source of truth. Add a database only when accounts, multi-device sync, saved versions, collaboration, or public share links become necessary. That avoids coupling the core CV editor to an early backend design.
