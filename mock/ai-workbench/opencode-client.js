const fs = require('fs');
const path = require('path');
const { getOpenCodeServiceUrl } = require('../config/global-config-state');

const DEFAULT_PORT = String(
  process.env.AGENT_CHAT_OPENCODE_PORT
  || process.env.AI_WORKBENCH_OPENCODE_PORT
  || '8096',
).trim();
const LOCAL_CONFIG_PATH = path.join(__dirname, '..', 'config', 'agent-chat.opencode.local.json');
const DEFAULT_COMPOSE_ENV_PATH =
  process.env.AGENT_CHAT_OPENCODE_COMPOSE_ENV_PATH
  || process.env.AI_WORKBENCH_OPENCODE_COMPOSE_ENV_PATH
  || 'D:\\openCode\\compose\\.env';

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeText = (value) => String(value || '').trim();

const normalizeBaseUrl = (value) => normalizeText(value).replace(/\/+$/, '');

const normalizeAgentName = (value) => {
  const normalized = normalizeText(value);
  if (['das-main-agent', 'main-agent'].includes(normalized)) {
    return '';
  }
  return normalized;
};

const parseBoolean = (value, fallbackValue = false) => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return fallbackValue;
  }
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallbackValue;
};

const normalizeNumber = (value, fallbackValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

const readJsonFile = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  return safeJsonParse(fs.readFileSync(filePath, 'utf8'), {}) || {};
};

const parseEnvFile = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((result, line) => {
      const trimmed = String(line || '').trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return result;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex < 0) {
        return result;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith('\'') && value.endsWith('\''))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
      return result;
    }, {});
};

const readComposeConfig = () => {
  const composeEnv = parseEnvFile(DEFAULT_COMPOSE_ENV_PATH);
  const assistantAgentModel = normalizeText(composeEnv.ASSISTANT_AGENT_MODEL);
  const [providerId = '', modelId = ''] = assistantAgentModel.includes('/')
    ? assistantAgentModel.split('/', 2)
    : [];
  const serverPort = normalizeText(composeEnv.OPENCODE_PORT) || DEFAULT_PORT;

  return {
    baseUrl: normalizeBaseUrl(composeEnv.OPENCODE_SERVER_BASE_URL || `http://127.0.0.1:${serverPort}`),
    providerId,
    modelId,
    username: normalizeText(composeEnv.OPENCODE_SERVER_USERNAME),
    password: normalizeText(composeEnv.OPENCODE_SERVER_PASSWORD),
  };
};

const getStaticAuthorization = (localConfig, composeConfig) => {
  const explicitAuthorization = normalizeText(
    localConfig.authorization
    || process.env.AGENT_CHAT_OPENCODE_AUTHORIZATION
    || process.env.AI_WORKBENCH_OPENCODE_AUTHORIZATION,
  );

  if (explicitAuthorization) {
    return explicitAuthorization;
  }

  const username = normalizeText(localConfig.username || composeConfig.username);
  const password = normalizeText(localConfig.password || composeConfig.password);

  if (!username && !password) {
    return '';
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
};

const resolveRuntimeConfig = () => {
  const localConfig = readJsonFile(LOCAL_CONFIG_PATH);
  const composeConfig = readComposeConfig();
  const configuredServiceUrl = getOpenCodeServiceUrl();

  return {
    baseUrl: normalizeBaseUrl(
      configuredServiceUrl
      || localConfig.baseUrl
      || process.env.AGENT_CHAT_OPENCODE_BASE_URL
      || process.env.AI_WORKBENCH_OPENCODE_BASE_URL
      || composeConfig.baseUrl
      || `http://127.0.0.1:${DEFAULT_PORT}`,
    ),
    agent: normalizeAgentName(
      localConfig.agent
      || process.env.AGENT_CHAT_OPENCODE_AGENT
      || process.env.AI_WORKBENCH_OPENCODE_AGENT
      || '',
    ),
    providerId: normalizeText(
      localConfig.providerId
      || process.env.AGENT_CHAT_OPENCODE_PROVIDER_ID
      || process.env.AI_WORKBENCH_OPENCODE_PROVIDER_ID
      || composeConfig.providerId,
    ),
    modelId: normalizeText(
      localConfig.modelId
      || process.env.AGENT_CHAT_OPENCODE_MODEL_ID
      || process.env.AI_WORKBENCH_OPENCODE_MODEL_ID
      || composeConfig.modelId,
    ),
    timeoutMs: normalizeNumber(
      localConfig.timeoutMs
      || process.env.AGENT_CHAT_OPENCODE_TIMEOUT_MS
      || process.env.AI_WORKBENCH_OPENCODE_TIMEOUT_MS,
      180000,
    ),
    eventTimeoutMs: normalizeNumber(
      localConfig.eventTimeoutMs
      || process.env.AGENT_CHAT_OPENCODE_EVENT_TIMEOUT_MS
      || process.env.AI_WORKBENCH_OPENCODE_EVENT_TIMEOUT_MS,
      0,
    ),
    directory: normalizeText(
      localConfig.directory
      || process.env.AGENT_CHAT_OPENCODE_DIRECTORY
      || process.env.AI_WORKBENCH_OPENCODE_DIRECTORY,
    ),
    workspace: normalizeText(
      localConfig.workspace
      || process.env.AGENT_CHAT_OPENCODE_WORKSPACE
      || process.env.AI_WORKBENCH_OPENCODE_WORKSPACE,
    ),
    staticAuthorization: getStaticAuthorization(localConfig, composeConfig),
    forwardAuthorization: parseBoolean(
      localConfig.forwardAuthorization
      ?? process.env.AGENT_CHAT_OPENCODE_FORWARD_AUTHORIZATION
      ?? process.env.AI_WORKBENCH_OPENCODE_FORWARD_AUTHORIZATION,
      true,
    ),
  };
};

const DEFAULT_RUNTIME_CONFIG = resolveRuntimeConfig();
const DEFAULT_AGENT = DEFAULT_RUNTIME_CONFIG.agent;
const DEFAULT_BASE_URL = DEFAULT_RUNTIME_CONFIG.baseUrl;

const isAbortError = (error) =>
  error?.name === 'AbortError'
  || error?.name === 'TimeoutError'
  || /abort/i.test(String(error?.message || ''));

const createTimeoutSignal = (timeoutMs, parentSignal) => {
  const controller = new AbortController();
  const shouldTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0;
  const timer = shouldTimeout
    ? setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs)
    : null;
  const abortFromParent = () => controller.abort(parentSignal?.reason);

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  return {
    signal: controller.signal,
    clear: () => {
      if (timer) {
        clearTimeout(timer);
      }
      if (parentSignal) {
        parentSignal.removeEventListener('abort', abortFromParent);
      }
    },
  };
};

const resolveScopeQuery = (runtimeConfig, query = {}) => {
  const nextQuery = { ...query };
  if (runtimeConfig.directory && !nextQuery.directory) {
    nextQuery.directory = runtimeConfig.directory;
  }
  if (runtimeConfig.workspace && !nextQuery.workspace) {
    nextQuery.workspace = runtimeConfig.workspace;
  }
  return nextQuery;
};

const buildUrl = (runtimeConfig, path, query = {}) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${runtimeConfig.baseUrl}${normalizedPath}`);
  const scopedQuery = resolveScopeQuery(runtimeConfig, query);

  Object.entries(scopedQuery).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

const buildHeaders = (runtimeConfig, extraHeaders = {}, requestContext = {}) => {
  const headers = { ...extraHeaders };
  const forwardedAuthorization = runtimeConfig.forwardAuthorization
    ? normalizeText(requestContext.authorization)
    : '';
  const preferredAuthorization = runtimeConfig.staticAuthorization || forwardedAuthorization;

  if (preferredAuthorization && !headers.Authorization) {
    headers.Authorization = preferredAuthorization;
  }

  return headers;
};

const requestJson = async (path, options = {}) => {
  const runtimeConfig = resolveRuntimeConfig();
  const {
    query,
    timeoutMs = runtimeConfig.timeoutMs,
    signal,
    authorization,
    ...fetchOptions
  } = options;
  const timeout = createTimeoutSignal(timeoutMs, signal);

  try {
    const response = await fetch(buildUrl(runtimeConfig, path, query), {
      ...fetchOptions,
      headers: buildHeaders(runtimeConfig, fetchOptions.headers, { authorization }),
      signal: timeout.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(
        payload?.message
        || payload?.error?.message
        || `OpenCode request failed: ${response.status}`,
      );
      error.statusCode = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  } finally {
    timeout.clear();
  }
};

const requestEmpty = async (path, options = {}) => {
  const runtimeConfig = resolveRuntimeConfig();
  const {
    query,
    timeoutMs = runtimeConfig.timeoutMs,
    signal,
    authorization,
    ...fetchOptions
  } = options;
  const timeout = createTimeoutSignal(timeoutMs, signal);

  try {
    const response = await fetch(buildUrl(runtimeConfig, path, query), {
      ...fetchOptions,
      headers: buildHeaders(runtimeConfig, fetchOptions.headers, { authorization }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const error = new Error(
        payload?.message
        || payload?.error?.message
        || `OpenCode request failed: ${response.status}`,
      );
      error.statusCode = response.status;
      error.payload = payload;
      throw error;
    }
  } finally {
    timeout.clear();
  }
};

const parseSseBlocks = (buffer) => {
  const normalized = String(buffer || '').replace(/\r\n/g, '\n');
  const events = [];
  let rest = normalized;

  while (true) {
    const delimiterIndex = rest.indexOf('\n\n');
    if (delimiterIndex < 0) {
      break;
    }

    const block = rest.slice(0, delimiterIndex);
    rest = rest.slice(delimiterIndex + 2);

    const lines = block.split('\n');
    let event = 'message';
    const dataLines = [];

    lines.forEach((line) => {
      if (!line || line.startsWith(':')) return;
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
        return;
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    });

    if (dataLines.length) {
      events.push({
        event,
        data: dataLines.join('\n'),
      });
    }
  }

  return { events, rest };
};

const consumeEventStream = async ({
  signal,
  onEvent,
  timeoutMs,
  authorization,
}) => {
  const runtimeConfig = resolveRuntimeConfig();
  const timeout = createTimeoutSignal(
    timeoutMs !== undefined ? timeoutMs : runtimeConfig.eventTimeoutMs,
    signal,
  );

  try {
    const response = await fetch(buildUrl(runtimeConfig, '/event'), {
      method: 'GET',
      headers: buildHeaders(runtimeConfig, { Accept: 'text/event-stream' }, { authorization }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const error = new Error(
        payload?.message
        || payload?.error?.message
        || `OpenCode event stream failed: ${response.status}`,
      );
      error.statusCode = response.status;
      error.payload = payload;
      throw error;
    }

    if (!response.body) {
      throw new Error('OpenCode event stream body is empty.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseBlocks(buffer);
      buffer = parsed.rest;

      for (const item of parsed.events) {
        if (!item.data || item.data === '[DONE]') {
          continue;
        }

        const payload = safeJsonParse(item.data, null);
        if (!payload) {
          continue;
        }

        await onEvent?.(payload, item.event);
      }
    }
  } finally {
    timeout.clear();
  }
};

let cachedModelPromise = null;
let cachedModelCacheKey = '';
let cachedAgentsPromise = null;
let cachedAgentsCacheKey = '';

const buildModelCacheKey = (runtimeConfig, authorization) =>
  JSON.stringify({
    baseUrl: runtimeConfig.baseUrl,
    directory: runtimeConfig.directory,
    workspace: runtimeConfig.workspace,
    providerId: runtimeConfig.providerId,
    modelId: runtimeConfig.modelId,
    staticAuthorization: runtimeConfig.staticAuthorization,
    forwardedAuthorization: normalizeText(authorization),
  });

const buildAgentCacheKey = (runtimeConfig, authorization) =>
  JSON.stringify({
    baseUrl: runtimeConfig.baseUrl,
    directory: runtimeConfig.directory,
    workspace: runtimeConfig.workspace,
    staticAuthorization: runtimeConfig.staticAuthorization,
    forwardedAuthorization: normalizeText(authorization),
  });

const resolveSupportedModel = async (signal, authorization) => {
  const runtimeConfig = resolveRuntimeConfig();
  if (runtimeConfig.providerId && runtimeConfig.modelId) {
    return {
      providerID: runtimeConfig.providerId,
      modelID: runtimeConfig.modelId,
      label: `${runtimeConfig.providerId}/${runtimeConfig.modelId}`,
    };
  }

  const cacheKey = buildModelCacheKey(runtimeConfig, authorization);
  if (!cachedModelPromise || cachedModelCacheKey !== cacheKey) {
    cachedModelCacheKey = cacheKey;
    cachedModelPromise = requestJson('/config/providers', {
      method: 'GET',
      signal,
      authorization,
    }).then((payload) => {
      const providers = Array.isArray(payload?.providers) ? payload.providers : [];
      const defaultMap =
        payload?.default && typeof payload.default === 'object' ? payload.default : {};

      if (!providers.length) {
        throw new Error('OpenCode did not return any configured providers.');
      }

      const provider =
        providers.find((item) => item?.id === runtimeConfig.providerId)
        || providers.find((item) => item?.id === 'openai')
        || providers[0];

      const models =
        provider?.models && typeof provider.models === 'object'
          ? Object.values(provider.models)
          : [];

      if (!models.length) {
        throw new Error(
          `Provider "${provider?.id || 'unknown'}" has no available models.`,
        );
      }

      const defaultModelId = defaultMap[provider.id];
      const model =
        models.find((item) => item?.id === runtimeConfig.modelId)
        || models.find((item) => item?.id === defaultModelId)
        || models[0];

      return {
        providerID: provider.id,
        modelID: model.id,
        label: `${provider.name || provider.id}/${model.name || model.id}`,
      };
    }).catch((error) => {
      cachedModelPromise = null;
      cachedModelCacheKey = '';
      throw error;
    });
  }

  return cachedModelPromise;
};

const resolvePreferredAgent = async (signal, authorization) => {
  const runtimeConfig = resolveRuntimeConfig();
  const preferredAgent = normalizeAgentName(runtimeConfig.agent);

  if (!preferredAgent) {
    return '';
  }

  const cacheKey = buildAgentCacheKey(runtimeConfig, authorization);
  if (!cachedAgentsPromise || cachedAgentsCacheKey !== cacheKey) {
    cachedAgentsCacheKey = cacheKey;
    cachedAgentsPromise = requestJson('/agent', {
      method: 'GET',
      signal,
      authorization,
    }).catch((error) => {
      cachedAgentsPromise = null;
      cachedAgentsCacheKey = '';
      throw error;
    });
  }

  try {
    const agents = await cachedAgentsPromise;
    const normalizedAgents = Array.isArray(agents) ? agents : [];
    const matchedAgent = normalizedAgents.find((item) => item?.name === preferredAgent);
    return matchedAgent ? preferredAgent : '';
  } catch {
    return preferredAgent;
  }
};

const createSession = async ({ title, signal, authorization }) =>
  requestJson('/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
    }),
    signal,
    authorization,
  });

const getSession = async (sessionId, signal, authorization) => {
  try {
    return await requestJson(`/session/${sessionId}`, {
      method: 'GET',
      signal,
      authorization,
    });
  } catch (error) {
    if (error?.statusCode === 404) {
      return null;
    }
    throw error;
  }
};

const ensureSession = async ({ sessionId, title, signal, authorization }) => {
  if (!sessionId) {
    return createSession({ title, signal, authorization });
  }

  const existing = await getSession(sessionId, signal, authorization);
  if (existing?.id) {
    return existing;
  }

  return createSession({ title, signal, authorization });
};

const sendPromptAsync = async ({
  sessionId,
  parts,
  format,
  system,
  variant,
  signal,
  authorization,
}) => {
  const model = await resolveSupportedModel(signal, authorization);
  const agent = await resolvePreferredAgent(signal, authorization);
  const body = {
    model: {
      providerID: model.providerID,
      modelID: model.modelID,
    },
    parts,
  };

  if (agent) {
    body.agent = agent;
  }
  if (format) {
    body.format = format;
  }
  if (system) {
    body.system = system;
  }
  if (variant) {
    body.variant = variant;
  }

  await requestEmpty(`/session/${sessionId}/prompt_async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
    authorization,
  });

  return {
    ...model,
    agent,
  };
};

const listSessionMessages = async (sessionId, signal, authorization) =>
  requestJson(`/session/${sessionId}/message`, {
    method: 'GET',
    query: { limit: 50 },
    signal,
    authorization,
  });

const abortSession = async (sessionId, authorization) => {
  if (!sessionId) {
    return;
  }

  try {
    await requestEmpty(`/session/${sessionId}/abort`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      timeoutMs: 10000,
      authorization,
    });
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('Failed to abort OpenCode session:', error);
    }
  }
};

module.exports = {
  DEFAULT_AGENT,
  DEFAULT_BASE_URL: normalizeBaseUrl(DEFAULT_BASE_URL),
  abortSession,
  consumeEventStream,
  ensureSession,
  isAbortError,
  listSessionMessages,
  resolveSupportedModel,
  sendPromptAsync,
  safeJsonParse,
};
