import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./public', import.meta.url));
loadLocalEnv(fileURLToPath(new URL('./.env', import.meta.url)));
loadLocalEnv(fileURLToPath(new URL('./.env.local', import.meta.url)));

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-sol';
const REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || 'medium';
const MAX_BODY_BYTES = 1_000_000;
const requestBuckets = new Map();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const profileSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['profile', 'coachNotes', 'followUpQuestions'],
  properties: {
    profile: {
      type: 'object',
      additionalProperties: false,
      required: ['personal', 'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards', 'languages', 'achievements'],
      properties: {
        personal: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'title', 'email', 'phone', 'location', 'website', 'linkedin'],
          properties: {
            name: { type: 'string' },
            title: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            location: { type: 'string' },
            website: { type: 'string' },
            linkedin: { type: 'string' }
          }
        },
        summary: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        experience: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['role', 'organization', 'location', 'start', 'end', 'summary', 'achievements'],
            properties: {
              role: { type: 'string' },
              organization: { type: 'string' },
              location: { type: 'string' },
              start: { type: 'string' },
              end: { type: 'string' },
              summary: { type: 'string' },
              achievements: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        education: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['degree', 'institution', 'location', 'start', 'end', 'details'],
            properties: {
              degree: { type: 'string' },
              institution: { type: 'string' },
              location: { type: 'string' },
              start: { type: 'string' },
              end: { type: 'string' },
              details: { type: 'string' }
            }
          }
        },
        projects: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'link', 'description', 'achievements'],
            properties: {
              name: { type: 'string' },
              link: { type: 'string' },
              description: { type: 'string' },
              achievements: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        certifications: { type: 'array', items: { type: 'string' } },
        awards: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
        achievements: { type: 'array', items: { type: 'string' } }
      }
    },
    coachNotes: { type: 'array', items: { type: 'string' } },
    followUpQuestions: { type: 'array', items: { type: 'string' } }
  }
};

const server = http.createServer(async (req, res) => {
  try {
    setSecurityHeaders(res);
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, {
        ok: true,
        model: MODEL,
        apiConfigured: Boolean(process.env.OPENAI_API_KEY)
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/ai/parse') {
      return await handleAiParse(req, res);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { error: 'Method not allowed.' });
    }

    return await serveStatic(url.pathname, req.method === 'HEAD', res);
  } catch (error) {
    console.error('[server]', error?.message || error);
    const statusCode = Number(error?.statusCode) || 500;
    return json(res, statusCode, { error: statusCode === 500 ? 'Unexpected server error.' : error.message });
  }
});

server.listen(PORT, () => {
  console.log(`CV Forge running at http://localhost:${PORT}`);
  console.log(`AI model: ${MODEL} (${process.env.OPENAI_API_KEY ? 'API configured' : 'demo mode'})`);
});

server.on('error', (error) => {
  console.error('[server]', error?.message || error);
  process.exitCode = 1;
});

async function handleAiParse(req, res) {
  if (!allowRequest(req)) {
    return json(res, 429, { error: 'Too many AI requests. Please wait a moment and try again.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(res, 503, {
      error: 'OPENAI_API_KEY is not configured. Copy .env.example to .env and add an API key.'
    });
  }

  const body = await readJsonBody(req);
  const story = typeof body.story === 'string' ? body.story.trim() : '';
  const targetRole = typeof body.targetRole === 'string' ? body.targetRole.trim() : '';
  const existingProfile = body.existingProfile && typeof body.existingProfile === 'object' ? body.existingProfile : {};
  const mode = ['extract', 'improve', 'tailor'].includes(body.mode) ? body.mode : 'extract';

  if (!story && mode === 'extract') {
    return json(res, 400, { error: 'Tell the assistant about your work and achievements first.' });
  }

  const instructions = [
    'You are an expert CV writer and evidence-first career coach.',
    'Transform the user\'s source material into a truthful, concise, ATS-friendly CV profile.',
    'Never invent employers, dates, metrics, technologies, degrees, titles, links, or achievements.',
    'When information is missing, use an empty string or empty array and ask a precise follow-up question.',
    'Rewrite achievements as outcome-oriented bullets using strong verbs. Keep every factual claim grounded in the source.',
    'Do not add first-person pronouns. Avoid clichés, keyword stuffing, fake confidence, and unsupported numbers.',
    targetRole ? `Tailor emphasis and vocabulary toward this target role without changing facts: ${targetRole}` : '',
    mode === 'improve' ? 'Improve the existing profile, preserving all verified facts and removing repetition.' : '',
    mode === 'tailor' ? 'Prioritize the most relevant verified experience for the target role.' : '',
    'Return only the requested structured data.'
  ].filter(Boolean).join('\n');

  const input = [
    {
      role: 'user',
      content: [
        `MODE: ${mode}`,
        `TARGET ROLE: ${targetRole || 'Not specified'}`,
        'SOURCE STORY:',
        story || 'No new story provided.',
        'EXISTING PROFILE JSON:',
        JSON.stringify(existingProfile)
      ].join('\n\n')
    }
  ];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: REASONING_EFFORT },
      instructions,
      input,
      store: false,
      safety_identifier: safetyIdentifier(body.clientId, req),
      text: {
        verbosity: 'medium',
        format: {
          type: 'json_schema',
          name: 'cv_profile',
          strict: true,
          schema: profileSchema
        }
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = payload?.error?.message || `OpenAI API request failed with status ${response.status}.`;
    return json(res, response.status >= 500 ? 502 : response.status, { error: apiMessage });
  }

  const text = collectOutputText(payload);
  if (!text) {
    const refusal = collectRefusal(payload);
    return json(res, 422, { error: refusal || 'The model returned no usable CV data.' });
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return json(res, 502, { error: 'The model returned malformed structured data.' });
  }

  return json(res, 200, {
    ...parsed,
    meta: {
      model: payload.model || MODEL,
      responseId: payload.id || null
    }
  });
}

function collectOutputText(payload) {
  const chunks = [];
  for (const item of payload?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('');
}

function collectRefusal(payload) {
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'refusal' && content.refusal) return content.refusal;
    }
  }
  return '';
}

function safetyIdentifier(clientId, req) {
  const raw = typeof clientId === 'string' && clientId ? clientId : (req.socket.remoteAddress || 'anonymous');
  return createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

function allowRequest(req) {
  const key = req.socket.remoteAddress || 'local';
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 8;
  const bucket = requestBuckets.get(key) || [];
  const fresh = bucket.filter((timestamp) => now - timestamp < windowMs);
  if (fresh.length >= limit) return false;
  fresh.push(now);
  requestBuckets.set(key, fresh);
  return true;
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

async function serveStatic(pathname, headOnly, res) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const decoded = decodeURIComponent(requested);
  const safePath = normalize(decoded).replace(/^([.][.][/\\])+/, '');
  const filePath = join(root, safePath);

  if (!filePath.startsWith(root)) return json(res, 403, { error: 'Forbidden.' });

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return json(res, 404, { error: 'Not found.' });
    const data = headOnly ? null : await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  } catch {
    return json(res, 404, { error: 'Not found.' });
  }
}

function json(res, statusCode, data) {
  if (res.headersSent) return;
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
}

function loadLocalEnv(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}
