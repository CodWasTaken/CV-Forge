# CV Forge — Product and Implementation Plan

## 1. Product goal

Help a person turn unstructured memories, notes, an old CV, or a career conversation into a truthful, polished CV without forcing them to fill a long form first.

The core product promise is:

> Tell us what happened in your own words. CV Forge structures the facts, strengthens the writing, asks for missing evidence, and gives you a CV you can still edit by hand.

## 2. Product principles

1. **Facts before fluency** — the AI must not invent metrics, employers, dates, technologies, or qualifications.
2. **AI-assisted, not AI-owned** — every generated field remains directly editable.
3. **One source of truth** — structured CV JSON drives all layouts and exports.
4. **Local-first by default** — drafts work without an account or database.
5. **Useful without AI** — templates, editing, preview, and export remain functional when no API key is configured.
6. **ATS and human readability** — provide a conservative layout as well as more expressive options.

## 3. Primary user flow

1. User enters a target role.
2. User pastes or imports free-form career notes.
3. AI extracts a structured profile and rewrites achievements.
4. AI provides coaching notes and precise follow-up questions.
5. User corrects and completes fields in the details editor.
6. User chooses a visual layout or imports a custom text template.
7. User exports PDF, HTML, JSON, or filled TXT.

## 4. MVP capabilities implemented

### AI layer

- Server-side OpenAI Responses API integration
- Default model: `gpt-5.6-sol`
- Model and reasoning effort configurable through environment variables
- Strict JSON Schema output
- Extraction, improvement, and target-role tailoring modes
- Evidence-first prompt that requires empty values rather than invented facts
- Follow-up question generation
- No API key in browser code
- `store: false` on model requests
- Stable hashed safety identifier

### Editing layer

- Personal details
- Professional summary
- Skills
- Work experience with achievement bullets
- Education
- Projects
- Certifications
- Awards
- Languages
- Additional achievements
- Local browser autosave
- Demo profile and full reset

### Presentation layer

- Slate: conservative single-column ATS layout
- Halo: modern two-column layout
- Editorial: bold, spacious layout
- A4 preview and print styling
- Responsive editor and preview

### Template layer

- Scalar `{{path.to.value}}` placeholders
- `{{#array}}...{{/array}}` loops
- Plain text and Markdown template import
- Filled TXT export

### Export layer

- Browser print / Save as PDF
- Standalone HTML
- Structured JSON
- Rendered custom TXT

## 5. Data model

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
  "experience": [
    {
      "role": "",
      "organization": "",
      "location": "",
      "start": "",
      "end": "",
      "summary": "",
      "achievements": []
    }
  ],
  "education": [],
  "projects": [],
  "certifications": [],
  "awards": [],
  "languages": [],
  "achievements": []
}
```

## 6. Why this architecture

### Plain Node server

The MVP uses Node's built-in HTTP server and `fetch`, with no runtime dependencies. This makes the project easy to inspect, run, and deploy while avoiding framework churn.

### Browser-rendered layouts

A browser preview gives immediate feedback and makes print-to-PDF available without a PDF dependency. A later SaaS version can add server-side Chromium rendering for pixel-consistent exports.

### Structured AI output

The AI returns the exact JSON shape required by the editor. This is safer and more maintainable than asking the model to write finished HTML or mutate a template directly.

### Local-first storage

Local storage is enough for an MVP and prevents premature account, database, and privacy complexity. The data model is already suitable for later persistence.

## 7. Production roadmap

### Phase 1 — stronger document ingestion

- Parse DOCX and selectable-text PDF files
- Import LinkedIn profile exports
- Detect duplicate roles and inconsistent dates
- Add an evidence inbox where each bullet links to its source note

### Phase 2 — job-specific tailoring

- Paste a job description
- Produce a relevance map between requirements and verified evidence
- Show keyword coverage without keyword stuffing
- Generate several CV variants from one canonical profile
- Add a cover-letter and interview-story generator using the same evidence base

### Phase 3 — quality controls

- CV linting for vague verbs, repetition, unsupported claims, date gaps, and excessive length
- ATS parsing preview
- Page overflow warnings
- Prompt and model evaluation suite with a set of anonymized fixtures
- Human review workflow for sensitive or executive CVs

### Phase 4 — SaaS foundations

- Authentication
- Encrypted database storage
- Version history
- Multi-device sync
- Share links with expiration controls
- Team and career-coach collaboration
- Billing, usage caps, and model routing

### Phase 5 — template marketplace

- Visual template builder
- Template schema validation
- Theme tokens for spacing, typography, and accent colors
- Community and premium layouts
- Locale-aware formats and multilingual CV variants

## 8. Security and privacy checklist

- Keep model credentials server-side
- Never log raw CV content
- Encrypt stored personal data
- Support account deletion and export
- Add per-user and per-IP rate limits
- Add budget ceilings and request quotas
- Scan uploaded binary documents
- Protect public share links from indexing by default
- Document model retention and data-processing choices clearly
- Review legal requirements for personal and employment data in target markets

## 9. Success metrics

- Time from blank page to first usable draft
- Percentage of AI-created fields manually corrected
- Percentage of bullets with a clear action and outcome
- Number of unresolved follow-up questions
- Export completion rate
- Repeat usage for a second job application
- User-rated factual accuracy
- Cost per completed CV

## 10. Definition of done for this MVP

- Runs locally with Node.js and no dependency install
- Works without an API key in manual/demo mode
- Uses a server-only API key when configured
- Extracts a strict structured profile through GPT-5.6 Sol
- Renders all three visual layouts
- Fills a user-provided text template
- Exports PDF through print, HTML, JSON, and TXT
- Passes syntax checks and template-engine tests
