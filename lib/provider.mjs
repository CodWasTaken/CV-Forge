const ALLOWED_STYLES = new Set(['auto', 'responses', 'chat_completions']);
const ALLOWED_AUTH = new Set(['none', 'bearer', 'header']);
const BLOCKED_HEADERS = new Set([
  'connection', 'content-length', 'host', 'transfer-encoding', 'upgrade',
  'proxy-authorization', 'proxy-authenticate', 'te', 'trailer'
]);

export function normalizeBaseUrl(value = '') {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Provider base URL must be a valid http:// or https:// URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Provider base URL must use http:// or https://.');
  }
  if (url.username || url.password) {
    throw new Error('Do not put credentials inside the provider URL.');
  }

  const suffixes = ['/chat/completions', '/responses', '/models'];
  for (const suffix of suffixes) {
    if (url.pathname.endsWith(suffix)) {
      url.pathname = url.pathname.slice(0, -suffix.length) || '/';
      break;
    }
  }
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

export function parseExtraHeaders(value) {
  if (!value) return {};
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Extra headers must be a JSON object.');
  }

  const headers = {};
  for (const [name, headerValue] of Object.entries(parsed)) {
    const normalized = String(name).trim();
    if (!normalized || BLOCKED_HEADERS.has(normalized.toLowerCase())) continue;
    if (typeof headerValue !== 'string' && typeof headerValue !== 'number' && typeof headerValue !== 'boolean') {
      throw new Error(`Header ${normalized} must have a string, number, or boolean value.`);
    }
    headers[normalized] = String(headerValue);
  }
  return headers;
}

export function normalizeProvider(input = {}, env = {}) {
  const apiKey = stringValue(input.apiKey, env.AI_API_KEY);
  const requestedAuth = stringValue(input.authType, env.AI_AUTH_TYPE).toLowerCase();
  const authType = ALLOWED_AUTH.has(requestedAuth)
    ? requestedAuth
    : (apiKey ? 'bearer' : 'none');
  const requestedStyle = stringValue(input.apiStyle, env.AI_API_STYLE).toLowerCase();

  return {
    name: stringValue(input.name, env.AI_PROVIDER_NAME) || 'Custom provider',
    baseUrl: normalizeBaseUrl(stringValue(input.baseUrl, env.AI_BASE_URL)),
    model: stringValue(input.model, env.AI_MODEL),
    apiStyle: ALLOWED_STYLES.has(requestedStyle) ? requestedStyle : 'auto',
    apiKey,
    authType,
    authHeader: stringValue(input.authHeader, env.AI_AUTH_HEADER) || (authType === 'header' ? 'X-API-Key' : 'Authorization'),
    authScheme: stringValue(input.authScheme, env.AI_AUTH_SCHEME) || 'Bearer',
    extraHeaders: parseExtraHeaders(input.extraHeaders ?? env.AI_EXTRA_HEADERS_JSON ?? '')
  };
}

export function providerHeaders(provider) {
  const headers = {
    'Content-Type': 'application/json',
    ...provider.extraHeaders
  };

  if (!provider.apiKey || provider.authType === 'none') return headers;
  const headerName = provider.authHeader || (provider.authType === 'header' ? 'X-API-Key' : 'Authorization');
  headers[headerName] = provider.authType === 'bearer'
    ? `${provider.authScheme || 'Bearer'} ${provider.apiKey}`.trim()
    : provider.apiKey;
  return headers;
}

export function providerEndpoint(provider, kind) {
  if (!provider.baseUrl) throw new Error('Enter a provider base URL.');
  const path = kind === 'chat_completions' ? '/chat/completions' : `/${kind}`;
  return `${provider.baseUrl}${path}`;
}

export function extractJsonObject(text) {
  const source = String(text || '').trim();
  if (!source) throw new Error('The provider returned no text.');

  const unfenced = source
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {
    const first = unfenced.indexOf('{');
    const last = unfenced.lastIndexOf('}');
    if (first === -1 || last <= first) throw new Error('The provider did not return a JSON object.');
    return JSON.parse(unfenced.slice(first, last + 1));
  }
}

export function collectResponsesText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const chunks = [];
  for (const item of payload?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content || []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content.text === 'string') {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join('');
}

export function collectChatText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => typeof part === 'string' ? part : (part?.text || part?.content || ''))
      .join('');
  }
  return '';
}

function stringValue(primary, fallback) {
  if (typeof primary === 'string') return primary.trim();
  if (typeof fallback === 'string') return fallback.trim();
  return '';
}
