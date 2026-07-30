# CV Forge

CV Forge turns rough career notes into structured, editable CV data and renders it in polished layouts or a custom `{{placeholder}}` text template.

## AI providers

The app works with **OpenAI-compatible endpoints** rather than being tied to one vendor. Configure the provider in the browser or through environment variables.

Supported request formats:

- Responses API: `/v1/responses`
- Chat Completions: `/v1/chat/completions`
- Auto-detection with fallback between both formats
- Strict JSON Schema output when supported
- Prompt-only JSON fallback for providers that reject structured-output fields

Authentication is optional. For a local or private endpoint that needs no key, set **Authentication** to **None** and leave the key blank. CV Forge will not send an `Authorization` header.

Optional authentication modes:

- Bearer token
- Custom key header
- Extra static headers supplied as a JSON object

The key field in the browser is intentionally not persisted to `localStorage`. Server-side defaults can be placed in `.env`.

## Included

- AI extraction, rewriting, accomplishment coaching, and role tailoring
- Provider name, base URL, model, API format, and authentication controls
- Provider connection test through `/v1/models`
- Three CV layouts: Slate, Halo, and Editorial
- Custom text templates with scalar placeholders and array loops
- Live manual editing for every field
- Local browser autosave
- Print / Save as PDF, standalone HTML, JSON, and TXT exports
- Basic request limits, CSP headers, request-size limits, and provider timeouts

## Run locally

Requirements: Node.js 20 or newer. No dependency installation is required.

```bash
cp .env.example .env
npm start
```

Open `http://localhost:3000`, then enter your provider base URL and model in the **AI provider** panel.

Example no-auth configuration:

```env
AI_PROVIDER_NAME=Local model server
AI_BASE_URL=http://127.0.0.1:1234/v1
AI_MODEL=my-model
AI_API_STYLE=auto
AI_AUTH_TYPE=none
AI_API_KEY=
```

Run checks:

```bash
npm run check
```

## Provider URL rules

Enter the API root, usually ending in `/v1`:

```text
http://127.0.0.1:1234/v1
```

CV Forge also accepts a pasted full endpoint such as `/v1/chat/completions` and normalizes it back to the API root.

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

Inside a loop, fields refer to the current item. Arrays are rendered as comma-separated text.

## Architecture

```text
Browser SPA
  ├─ localStorage: CV draft and non-secret provider settings
  ├─ ephemeral key/token input, never persisted
  ├─ manual editor, templates, preview, and exports
  └─ POST /api/ai/parse
        │
        ▼
Node compatibility proxy
  ├─ validates provider URL and headers
  ├─ optional authentication
  ├─ Responses / Chat Completions adapter
  └─ structured-output compatibility fallback
        │
        ▼
Your OpenAI-compatible provider
```

## Deployment notes

For anything beyond local use:

- Serve CV Forge over HTTPS before entering credentials in the browser.
- Prefer server-side environment secrets over browser-entered tokens.
- Add authentication so strangers cannot use your configured provider.
- Add an outbound host allowlist if users should not be able to select arbitrary URLs.
- Do not expose a no-auth local model endpoint directly to the public internet.
