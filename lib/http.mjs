import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

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

export function loadLocalEnv(path) {
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

export function createRateLimiter(windowMs = 60_000) {
  const buckets = new Map();
  return (req, limit) => {
    const key = req.socket.remoteAddress || 'local';
    const now = Date.now();
    const fresh = (buckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
    if (fresh.length >= limit) return false;
    fresh.push(now);
    buckets.set(key, fresh);
    return true;
  };
}

export async function readJsonBody(req, maxBytes = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
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

export async function serveStatic(root, pathname, headOnly, res) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const decoded = decodeURIComponent(requested);
  const safePath = normalize(decoded).replace(/^([.][.][/\\])+/, '');
  const filePath = join(root, safePath);
  if (!filePath.startsWith(root)) return json(res, 403, { error: 'Forbidden.' });

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return json(res, 404, { error: 'Not found.' });
    let data = headOnly ? null : await readFile(filePath);
    if (!headOnly && filePath.endsWith('index.html')) {
      const html = data.toString('utf8')
        .replace('</head>', '  <link rel="stylesheet" href="/provider.css">\n</head>')
        .replace('<script type="module" src="/app.js"></script>', '<script src="/provider.js"></script>\n  <script type="module" src="/app.js"></script>');
      data = Buffer.from(html, 'utf8');
    }
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  } catch {
    return json(res, 404, { error: 'Not found.' });
  }
}

export function json(res, statusCode, data) {
  if (res.headersSent) return;
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
}
