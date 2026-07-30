import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { handleAiParse, handleProviderTest, providerStatus } from './lib/ai.mjs';
import { createRateLimiter, json, loadLocalEnv, serveStatic, setSecurityHeaders } from './lib/http.mjs';

const root = fileURLToPath(new URL('./public', import.meta.url));
loadLocalEnv(fileURLToPath(new URL('./.env', import.meta.url)));
loadLocalEnv(fileURLToPath(new URL('./.env.local', import.meta.url)));

const PORT = Number(process.env.PORT || 3000);
const context = {
  env: process.env,
  maxBodyBytes: 1_000_000,
  timeoutMs: Number(process.env.AI_TIMEOUT_MS || 120_000),
  allowRequest: createRateLimiter()
};

const server = http.createServer(async (req, res) => {
  try {
    setSecurityHeaders(res);
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true, ...providerStatus(process.env) });
    }
    if (req.method === 'POST' && url.pathname === '/api/provider/test') {
      return await handleProviderTest(req, res, context);
    }
    if (req.method === 'POST' && url.pathname === '/api/ai/parse') {
      return await handleAiParse(req, res, context);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return json(res, 405, { error: 'Method not allowed.' });
    }
    return await serveStatic(root, url.pathname, req.method === 'HEAD', res);
  } catch (error) {
    console.error('[server]', error?.message || error);
    const statusCode = Number(error?.statusCode) || 500;
    return json(res, statusCode, { error: statusCode === 500 ? 'Unexpected server error.' : error.message });
  }
});

server.listen(PORT, () => {
  const defaults = providerStatus(process.env).provider;
  console.log(`CV Forge running at http://localhost:${PORT}`);
  console.log(defaults.baseUrl && defaults.model
    ? `Default provider: ${defaults.name} · ${defaults.model} · ${defaults.baseUrl}`
    : 'Default provider: configure in the browser or .env');
});

server.on('error', (error) => {
  console.error('[server]', error?.message || error);
  process.exitCode = 1;
});
