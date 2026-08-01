# CV Forge — Product and Implementation Plan

## Product goal

Turn one verified career profile into either a conventional application document or a personal portfolio website without duplicating the user’s data or locking the product to one model provider.

## Core principles

1. **Facts before fluency** — generated copy must remain grounded in the profile and source notes.
2. **One source of truth** — the structured CV profile drives PDF, text, HTML, and website outputs.
3. **Safe generation boundary** — AI produces structured copy and presentation choices; application code produces executable website files.
4. **Provider independence** — support OpenAI-compatible Responses and Chat Completions endpoints, with optional authentication.
5. **Local ownership** — drafts stay in the browser and website files are saved to a user-controlled local directory.
6. **Portable output** — exported websites run as plain static files with no framework or build step.

## Implemented output modes

### Standard CV

- Slate, Halo, and Editorial A4 layouts
- Custom formatted text templates
- Print/PDF, standalone HTML, JSON, and TXT exports

### Website CV

- Aurora, Studio, and Mono themes
- AI-generated hero, about, experience/project framing, CTA copy, section order, and featured-item selection
- Editable copy and accent color
- Responsive live preview
- Static export containing HTML, CSS, JavaScript, profile JSON, and website-plan JSON
- Configurable `CV_EXPORT_DIR`
- Local preview route for saved sites

## Website generation model

The provider receives:

- verified profile JSON;
- source career notes;
- target role;
- current website settings.

It returns a strict website-plan object. It never returns executable code. The deterministic renderer then:

- escapes all user/model text;
- selects verified experience and project records by index;
- creates accessible semantic HTML;
- creates responsive CSS based on a constrained theme and accent color;
- creates minimal progressive-enhancement JavaScript;
- saves the complete bundle below the configured export root.

## Local export design

Default destination:

```text
<project>/exports/<sanitized-folder-name>/
```

Override:

```env
CV_EXPORT_DIR=/absolute/or/relative/path
```

Security controls:

- folder names are sanitized;
- traversal outside the export root is rejected;
- provider credentials are not included in output;
- exported files are served without injecting CV Forge application assets.

## Roadmap

### Website customization

- Section visibility and drag-and-drop ordering
- Typography presets
- Custom domain publishing helpers
- Social preview image generation
- Optional profile photograph and image optimization
- Project screenshots and media galleries
- ZIP download in addition to local folder export

### CV intelligence

- DOCX and selectable-text PDF imports
- Job-description relevance maps
- Evidence links for every generated claim
- ATS linting and page overflow warnings
- Multiple tailored variants from one profile

### Production deployment

- Per-user encrypted storage
- Isolated export workspaces
- Authenticated share links
- Provider endpoint allowlists
- Audit logs excluding CV content
- Server-side PDF rendering

## Definition of done

- User can choose PDF CV or website CV.
- Website AI generation uses the configured OpenAI-compatible provider.
- No-auth providers remain supported.
- Website preview updates from profile and website settings.
- Static files save beneath a configurable local directory.
- Saved website opens through the local server.
- All syntax, provider, template, website-rendering, and path tests pass.
