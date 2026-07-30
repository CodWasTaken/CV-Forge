# CV Forge — Product and Implementation Plan

## Product goal

Help users turn unstructured career evidence into a truthful, polished CV without locking the application to one AI vendor or requiring a specific billing model.

## Principles

1. **Facts before fluency** — never invent credentials, dates, employers, metrics, or achievements.
2. **Provider independence** — use a small OpenAI-compatible adapter instead of vendor-specific application code.
3. **Authentication is optional** — local and private endpoints may require no key.
4. **AI-assisted, not AI-owned** — every generated field remains editable.
5. **One source of truth** — structured CV JSON drives every template and export.
6. **Local-first** — drafts and non-secret preferences stay in the browser.

## Implemented flow

1. Enter a provider base URL and model.
2. Select auto-detection, Responses, or Chat Completions.
3. Choose no authentication, bearer token, or a custom key header.
4. Paste career notes and optionally name a target role.
5. Generate or improve the CV.
6. Review coaching questions and edit every field.
7. Choose a visual or custom text template.
8. Export PDF, HTML, JSON, or TXT.

## Provider architecture

The Node server acts as a narrow compatibility proxy. It accepts non-secret provider settings with each request and optionally receives an ephemeral key. It then:

- validates the base URL;
- blocks unsafe hop-by-hop custom headers;
- sends no auth header in `none` mode;
- supports `/responses` and `/chat/completions`;
- attempts strict JSON Schema output first;
- retries without structured-output fields when the provider rejects them;
- parses standard Responses and Chat Completions payloads;
- enforces request limits, body limits, and timeouts.

Environment configuration can provide server-side defaults and secrets without exposing them to the browser.

## Data model

```json
{
  "personal": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "website": "",
    "linkedin": ""
  },
  "summary": "",
  "skills": [],
  "experience": [],
  "education": [],
  "projects": [],
  "certifications": [],
  "awards": [],
  "languages": [],
  "achievements": []
}
```

## Production roadmap

### Provider improvements

- Named provider presets
- Model discovery dropdown populated by `/models`
- Per-provider capability caching
- Configurable custom request fields
- Streaming status updates
- Outbound endpoint allowlists for hosted deployments

### CV improvements

- DOCX and selectable-text PDF imports
- Job-description relevance mapping
- Evidence links for every generated bullet
- CV linting and page-overflow checks
- Multiple tailored CV variants from one profile
- Server-rendered PDF export

### SaaS foundations

- Authentication and encrypted storage
- Version history and multi-device sync
- Share links and collaboration
- Per-user quotas and audit logs excluding CV content

## Definition of done

- Runs on Node.js 20+ without dependency installation
- Works with a no-auth OpenAI-compatible endpoint
- Supports Responses and Chat Completions formats
- Keeps browser-entered tokens out of persistent storage
- Renders three visual templates and custom text templates
- Exports PDF, HTML, JSON, and TXT
- Passes syntax, provider-adapter, and template-engine tests
