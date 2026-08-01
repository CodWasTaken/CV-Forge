# CV Forge

CV Forge turns rough career notes into structured CV data, then gives you two finished outputs from the same verified profile:

1. **Standard CV** — polished A4 layouts for printing or saving as PDF.
2. **Website CV** — a modern, responsive portfolio landing page exported as a portable static site.

The application works with OpenAI-compatible providers, including local endpoints that require no API key.

## Website CV workflow

1. Build the structured CV from your notes or enter the details manually.
2. Open the **Website** tab or select **Website CV** above the preview.
3. Choose Aurora, Studio, or Mono as a starting style.
4. Press **Generate website with AI** to create the headline, about copy, section emphasis, theme, and featured work selection.
5. Edit the generated website copy and accent color directly.
6. Press **Save website files**.

The AI returns a structured presentation plan. CV Forge creates the executable files itself from the verified profile, rather than asking the model to generate arbitrary code.

Each export contains:

```text
index.html
styles.css
script.js
profile.json
site.json
```

The site uses no framework, build step, CDN, external font, or runtime dependency. You can open `index.html` locally or upload the folder to GitHub Pages, Netlify, Cloudflare Pages, Vercel, or any static host.

## Where website files are saved

By default, website folders are created under:

```text
./exports/<your-folder-name>/
```

The app displays the absolute resolved path in the Website tab after startup and again after saving.

Change the location in `.env`:

```env
CV_EXPORT_DIR=./exports
```

Absolute paths are supported:

```env
CV_EXPORT_DIR=/home/your-name/Documents/cv-sites
```

On Windows, quote the path when it contains spaces:

```env
CV_EXPORT_DIR="C:\Users\YourName\Documents\CV Sites"
```

Folder names entered in the browser are sanitized and may only create a child folder inside `CV_EXPORT_DIR`.

## AI providers

Supported request formats:

- Responses API: `/v1/responses`
- Chat Completions: `/v1/chat/completions`
- Automatic fallback between both formats
- Strict JSON Schema when supported
- Prompt-only JSON fallback for providers that reject structured-output fields

Authentication is optional. For a no-auth endpoint, choose **None** and leave the key blank. CV Forge sends no `Authorization` or API-key header.

Example local provider:

```env
AI_PROVIDER_NAME=Local model server
AI_BASE_URL=http://127.0.0.1:1234/v1
AI_MODEL=my-model
AI_API_STYLE=auto
AI_AUTH_TYPE=none
AI_API_KEY=
```

The browser provider panel supports optional bearer tokens, custom key headers, and extra static headers. Browser-entered keys are not persisted to `localStorage`.

## Run locally

Requirements: Node.js 20 or newer. No dependency installation is required.

```bash
cp .env.example .env
npm start
```

Open:

```text
http://localhost:3000
```

Run validation:

```bash
npm run check
```

## Standard CV features

- AI extraction, rewriting, accomplishment coaching, and target-role tailoring
- Editable personal details, summary, skills, experience, education, projects, awards, certifications, and languages
- Slate, Halo, and Editorial A4 layouts
- Custom `{{placeholder}}` text templates and array loops
- Browser autosave
- PDF through browser printing
- HTML, JSON, and TXT exports

## Architecture

```text
Browser SPA
  ├─ CV/profile editor
  ├─ provider configuration
  ├─ PDF CV renderer
  ├─ website CV renderer and live iframe preview
  └─ POST /api/export/website
        │
        ▼
Local Node server
  ├─ OpenAI-compatible provider adapter
  ├─ safe structured website-plan generation
  ├─ static website file renderer
  └─ CV_EXPORT_DIR/<folder>/
        ├─ index.html
        ├─ styles.css
        ├─ script.js
        ├─ profile.json
        └─ site.json
```

## Security notes

- Website files are generated deterministically and profile text is HTML-escaped.
- The AI does not supply executable HTML, CSS, or JavaScript.
- Export paths are restricted to the configured export directory.
- Provider credentials are optional and are never written into website exports.
- For hosted multi-user deployments, add authentication, per-user storage isolation, endpoint allowlists, and stronger distributed rate limiting.
