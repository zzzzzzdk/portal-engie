const fs = require('fs');
const path = require('path');

const LOCAL_CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'ai-workbench.providers.local.json');

const PROVIDER_DEFINITIONS = {
  codex: {
    id: 'codex',
    name: 'Codex',
    provider: 'OpenAI',
    description: 'OpenAI-compatible Codex endpoint for page generation.',
    recommended: true,
    apiStyle: 'openai-responses',
    requestApiStyle: 'openai-responses',
    streamApiStyle: 'openai-responses',
    authStyle: 'bearer',
    baseUrl: 'https://api.openai.com/v1',
    chatPath: '/chat/completions',
    responsesPath: '/responses',
    model: 'gpt-5.4',
    temperature: 0.2,
    maxTokens: 4096,
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    provider: 'Anthropic',
    description: 'Anthropic Claude via the Messages API.',
    recommended: false,
    apiStyle: 'anthropic-messages',
    requestApiStyle: 'anthropic-messages',
    streamApiStyle: 'anthropic-messages',
    authStyle: 'x-api-key',
    baseUrl: 'https://api.anthropic.com',
    messagesPath: '/v1/messages',
    model: 'claude-3-7-sonnet-latest',
    anthropicVersion: '2023-06-01',
    temperature: 0.2,
    maxTokens: 4096,
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen',
    provider: 'Alibaba Cloud',
    description: 'Qwen through DashScope compatible mode.',
    recommended: false,
    apiStyle: 'openai-chat',
    requestApiStyle: 'openai-chat',
    streamApiStyle: 'openai-chat',
    authStyle: 'bearer',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    chatPath: '/chat/completions',
    responsesPath: '/responses',
    model: 'qwen-plus',
    responseFormat: 'none',
    temperature: 0.2,
    maxTokens: 4096,
  },
  doubao: {
    id: 'doubao',
    name: 'Doubao',
    provider: 'Volcengine',
    description: 'Doubao through Ark OpenAI-compatible API.',
    recommended: false,
    apiStyle: 'openai-chat',
    requestApiStyle: 'openai-chat',
    streamApiStyle: 'openai-chat',
    authStyle: 'bearer',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    chatPath: '/chat/completions',
    responsesPath: '/responses',
    model: '',
    responseFormat: 'none',
    temperature: 0.2,
    maxTokens: 4096,
  },
};

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const loadLocalConfig = () => {
  if (!fs.existsSync(LOCAL_CONFIG_PATH)) {
    return {};
  }
  return safeJsonParse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8'), {}) || {};
};

const normalizeBaseUrl = (value) => String(value || '').replace(/\/+$/, '');
const normalizeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readProviderConfig = (providerId) => {
  const definition = PROVIDER_DEFINITIONS[providerId];
  if (!definition) {
    return null;
  }

  const localConfig = loadLocalConfig();
  const localEntry = localConfig[providerId] || {};
  const envPrefix = `AI_WORKBENCH_${providerId.toUpperCase()}`;

  const runtime = {
    ...definition,
    ...localEntry,
  };

  if (process.env[`${envPrefix}_API_STYLE`]) runtime.apiStyle = process.env[`${envPrefix}_API_STYLE`];
  if (process.env[`${envPrefix}_BASE_URL`]) runtime.baseUrl = process.env[`${envPrefix}_BASE_URL`];
  if (process.env[`${envPrefix}_CHAT_PATH`]) runtime.chatPath = process.env[`${envPrefix}_CHAT_PATH`];
  if (process.env[`${envPrefix}_RESPONSES_PATH`]) runtime.responsesPath = process.env[`${envPrefix}_RESPONSES_PATH`];
  if (process.env[`${envPrefix}_MESSAGES_PATH`]) runtime.messagesPath = process.env[`${envPrefix}_MESSAGES_PATH`];
  if (process.env[`${envPrefix}_MODEL`]) runtime.model = process.env[`${envPrefix}_MODEL`];
  if (process.env[`${envPrefix}_API_KEY`]) runtime.apiKey = process.env[`${envPrefix}_API_KEY`];
  if (process.env[`${envPrefix}_ENABLED`]) runtime.enabled = process.env[`${envPrefix}_ENABLED`] !== 'false';
  if (process.env[`${envPrefix}_ANTHROPIC_VERSION`]) runtime.anthropicVersion = process.env[`${envPrefix}_ANTHROPIC_VERSION`];
  if (process.env[`${envPrefix}_REQUEST_API_STYLE`]) runtime.requestApiStyle = process.env[`${envPrefix}_REQUEST_API_STYLE`];
  if (process.env[`${envPrefix}_STREAM_API_STYLE`]) runtime.streamApiStyle = process.env[`${envPrefix}_STREAM_API_STYLE`];
  if (process.env[`${envPrefix}_AUTH_STYLE`]) runtime.authStyle = process.env[`${envPrefix}_AUTH_STYLE`];
  if (process.env[`${envPrefix}_RESPONSE_FORMAT`]) runtime.responseFormat = process.env[`${envPrefix}_RESPONSE_FORMAT`];
  if (process.env[`${envPrefix}_TEMPERATURE`]) runtime.temperature = process.env[`${envPrefix}_TEMPERATURE`];
  if (process.env[`${envPrefix}_MAX_TOKENS`]) runtime.maxTokens = process.env[`${envPrefix}_MAX_TOKENS`];
  if (process.env[`${envPrefix}_EXTRA_HEADERS`]) runtime.extraHeaders = safeJsonParse(process.env[`${envPrefix}_EXTRA_HEADERS`], runtime.extraHeaders);

  runtime.baseUrl = normalizeBaseUrl(runtime.baseUrl);
  runtime.enabled = runtime.enabled !== false;
  runtime.requestApiStyle = runtime.requestApiStyle || runtime.apiStyle;
  runtime.streamApiStyle = runtime.streamApiStyle || runtime.apiStyle;
  runtime.authStyle = runtime.authStyle || (runtime.requestApiStyle === 'anthropic-messages' ? 'x-api-key' : 'bearer');
  runtime.responseFormat = runtime.responseFormat || 'none';
  runtime.temperature = normalizeNumber(runtime.temperature, 0.2);
  runtime.maxTokens = normalizeNumber(runtime.maxTokens, 4096);
  runtime.extraHeaders = runtime.extraHeaders && typeof runtime.extraHeaders === 'object' && !Array.isArray(runtime.extraHeaders)
    ? runtime.extraHeaders
    : {};
  runtime.configured = Boolean(runtime.enabled && runtime.baseUrl && runtime.model && runtime.apiKey);
  runtime.configHint = runtime.configured
    ? ''
    : providerId === 'doubao'
      ? 'Requires Ark endpoint ID and API key.'
      : 'Requires baseUrl, model, and apiKey.';

  return runtime;
};

module.exports = {
  LOCAL_CONFIG_PATH,
  PROVIDER_DEFINITIONS,
  readProviderConfig,
};
