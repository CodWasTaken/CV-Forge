import {
  collectChatText,
  collectResponsesText,
  extractJsonObject,
  normalizeProvider,
  providerEndpoint,
  providerHeaders
} from './provider.mjs';
import { profileSchema } from './schema.mjs';
import { json, readJsonBody } from './http.mjs';

export function providerStatus(env) {
  const defaults = normalizeProvider({}, env);
  return {
    model: defaults.model || 'Custom provider',
    apiConfigured: Boolean(defaults.baseUrl && defaults.model),
    provider: {
      name: defaults.name,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
      apiStyle: defaults.apiStyle,
      authType: defaults.authType,
      authHeader: defaults.authHeader,
      authScheme: defaults.authScheme,
      hasServerApiKey: Boolean(defaults.apiKey),
      extraHeaders: defaults.extraHeaders
    }
  };
}

export async function handleProviderTest(req, res, context) {
  if (!context.allowRequest(req, 20)) {
    return json(res, 429, { error: 'Too many provider checks. Please wait and try again.' });
  }
  const body = await readJsonBody(req, context.maxBodyBytes);
  const provider = resolveProvider(body.provider, context.env);
  requireProvider(provider);

  const endpoint = providerEndpoint(provider, 'models');
  const response = await providerFetch(endpoint, {
    method: 'GET', headers: providerHeaders(provider)
  }, context.timeoutMs);
  const payload = await readProviderPayload(response);
  if (!response.ok) {
    return json(res, 502, { error: providerErrorMessage(payload, response.status, 'Provider model check failed.') });
  }

  const models = Array.isArray(payload?.data)
    ? payload.data.map((item) => item?.id).filter(Boolean).slice(0, 100)
    : [];
  return json(res, 200, {
    ok: true,
    provider: provider.name,
    endpoint,
    models,
    selectedModelFound: models.length ? models.includes(provider.model) : null
  });
}

export async function handleAiParse(req, res, context) {
  if (!context.allowRequest(req, 8)) {
    return json(res, 429, { error: 'Too many AI requests. Please wait a moment and try again.' });
  }

  const body = await readJsonBody(req, context.maxBodyBytes);
  const provider = resolveProvider(body.provider, context.env);
  requireProvider(provider);
  const story = typeof body.story === 'string' ? body.story.trim() : '';
  const targetRole = typeof body.targetRole === 'string' ? body.targetRole.trim() : '';
  const existingProfile = body.existingProfile && typeof body.existingProfile === 'object' ? body.existingProfile : {};
  const mode = ['extract', 'improve', 'tailor'].includes(body.mode) ? body.mode : 'extract';
  if (!story && mode === 'extract') return json(res, 400, { error: 'Tell the assistant about your work and achievements first.' });

  let result;
  try {
    result = await callCompatibleProvider(
      provider,
      buildInstructions({ mode, targetRole }),
      buildUserPrompt({ mode, targetRole, story, existingProfile }),
      context.timeoutMs
    );
  } catch (error) {
    return json(res, 502, { error: error.message || 'Provider request failed.' });
  }

  let parsed;
  try {
    parsed = extractJsonObject(result.text);
  } catch (error) {
    return json(res, 502, { error: `The provider returned malformed CV data: ${error.message}` });
  }
  if (!parsed?.profile || !Array.isArray(parsed?.coachNotes) || !Array.isArray(parsed?.followUpQuestions)) {
    return json(res, 502, { error: 'The provider response did not match the required CV structure.' });
  }

  return json(res, 200, {
    ...parsed,
    meta: {
      provider: provider.name,
      model: result.payload?.model || provider.model,
      apiStyle: result.style,
      responseId: result.payload?.id || null,
      structuredOutput: result.structuredOutput
    }
  });
}

function resolveProvider(input, env) {
  try {
    return normalizeProvider(input || {}, env);
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
}

function requireProvider(provider) {
  if (!provider.baseUrl) {
    const error = new Error('Enter your OpenAI-compatible provider base URL.');
    error.statusCode = 400;
    throw error;
  }
  if (!provider.model) {
    const error = new Error('Enter the model name exposed by your provider.');
    error.statusCode = 400;
    throw error;
  }
}

function buildInstructions({ mode, targetRole }) {
  return [
    'You are an expert CV writer and evidence-first career coach.',
    'Transform the source material into a truthful, concise, ATS-friendly CV profile.',
    'Never invent employers, dates, metrics, technologies, degrees, titles, links, or achievements.',
    'When information is missing, use an empty string or empty array and ask a precise follow-up question.',
    'Rewrite achievements as outcome-oriented bullets using strong verbs. Keep every factual claim grounded in the source.',
    'Do not add first-person pronouns. Avoid clichés, keyword stuffing, fake confidence, and unsupported numbers.',
    targetRole ? `Tailor emphasis and vocabulary toward this target role without changing facts: ${targetRole}` : '',
    mode === 'improve' ? 'Improve the existing profile, preserving all verified facts and removing repetition.' : '',
    mode === 'tailor' ? 'Prioritize the most relevant verified experience for the target role.' : '',
    'Return exactly one JSON object and no markdown.',
    `The JSON must match this schema: ${JSON.stringify(profileSchema)}`
  ].filter(Boolean).join('\n');
}

function buildUserPrompt({ mode, targetRole, story, existingProfile }) {
  return [
    `MODE: ${mode}`,
    `TARGET ROLE: ${targetRole || 'Not specified'}`,
    'SOURCE STORY:', story || 'No new story provided.',
    'EXISTING PROFILE JSON:', JSON.stringify(existingProfile)
  ].join('\n\n');
}

async function callCompatibleProvider(provider, instructions, userPrompt, timeoutMs) {
  const styles = provider.apiStyle === 'auto' ? ['responses', 'chat_completions'] : [provider.apiStyle];
  const failures = [];
  for (const style of styles) {
    try {
      return await invokeProvider(provider, style, instructions, userPrompt, true, timeoutMs);
    } catch (error) {
      failures.push(`${style}: ${error.message}`);
      if (!isCompatibilityRejection(error.status)) {
        if (provider.apiStyle !== 'auto') throw error;
        continue;
      }
    }
    try {
      return await invokeProvider(provider, style, instructions, userPrompt, false, timeoutMs);
    } catch (error) {
      failures.push(`${style} fallback: ${error.message}`);
      if (provider.apiStyle !== 'auto' && !isEndpointMissing(error.status)) throw error;
    }
  }
  throw new Error(`No compatible provider route succeeded. ${failures.join(' | ')}`);
}

async function invokeProvider(provider, style, instructions, userPrompt, structuredOutput, timeoutMs) {
  const endpoint = providerEndpoint(provider, style);
  const requestBody = style === 'responses'
    ? {
        model: provider.model,
        instructions,
        input: userPrompt,
        ...(structuredOutput ? { text: { format: { type: 'json_schema', name: 'cv_profile', strict: true, schema: profileSchema } } } : {})
      }
    : {
        model: provider.model,
        messages: [{ role: 'system', content: instructions }, { role: 'user', content: userPrompt }],
        ...(structuredOutput ? { response_format: { type: 'json_schema', json_schema: { name: 'cv_profile', strict: true, schema: profileSchema } } } : {})
      };

  const response = await providerFetch(endpoint, {
    method: 'POST', headers: providerHeaders(provider), body: JSON.stringify(requestBody)
  }, timeoutMs);
  const payload = await readProviderPayload(response);
  if (!response.ok) {
    const error = new Error(providerErrorMessage(payload, response.status, `${style} request failed.`));
    error.status = response.status;
    throw error;
  }
  const text = style === 'responses' ? collectResponsesText(payload) : collectChatText(payload);
  if (!text) {
    const error = new Error('The provider returned no usable text content.');
    error.status = 422;
    throw error;
  }
  return { payload, text, style, structuredOutput };
}

async function providerFetch(url, options, timeoutMs) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      const timeoutError = new Error(`Provider timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
      timeoutError.status = 504;
      throw timeoutError;
    }
    const connectionError = new Error(`Could not reach the provider at ${url}: ${error.message}`);
    connectionError.status = 502;
    throw connectionError;
  }
}

async function readProviderPayload(response) {
  const raw = await response.text();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw: raw.slice(0, 2_000) }; }
}

function providerErrorMessage(payload, status, fallback) {
  return payload?.error?.message || payload?.message || payload?.detail || payload?.raw || `${fallback} HTTP ${status}.`;
}

function isCompatibilityRejection(status) {
  return [400, 404, 405, 415, 422, 501].includes(Number(status));
}

function isEndpointMissing(status) {
  return [404, 405, 501].includes(Number(status));
}
