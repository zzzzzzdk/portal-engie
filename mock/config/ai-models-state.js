const fs = require('fs');
const path = require('path');

const LOCAL_CONFIG_PATH = path.join(__dirname, 'ai-workbench.providers.local.json');

const nowText = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const clone = (value) => JSON.parse(JSON.stringify(value));

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const normalizeText = (value) => String(value || '').trim();

const normalizeNumber = (value, fallbackValue) => {
  if (value === undefined || value === null || value === '') {
    return fallbackValue;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  qwen: 'Alibaba Cloud',
  doubao: 'Volcengine',
  custom: 'Custom',
};

const PROTOCOL_OPTIONS = ['openai-responses', 'openai-chat', 'anthropic-messages'];

const getProtocolDefaults = (protocol) => {
  if (protocol === 'anthropic-messages') {
    return {
      authStyle: 'x-api-key',
      messagesPath: '/v1/messages',
      anthropicVersion: '2023-06-01',
      responseFormat: 'none',
    };
  }

  if (protocol === 'openai-responses') {
    return {
      authStyle: 'bearer',
      responsesPath: '/responses',
      responseFormat: 'none',
    };
  }

  return {
    authStyle: 'bearer',
    chatPath: '/chat/completions',
    responseFormat: 'none',
  };
};

const AI_MODEL_TEMPLATES = {
  codex: {
    id: 'codex',
    name: 'Codex',
    providerType: 'openai',
    providerLabel: 'OpenAI',
    protocol: 'openai-responses',
    description: 'OpenAI-compatible Codex endpoint for page generation.',
    recommended: true,
    readonly: true,
    envKey: 'CODEX',
    enabled: true,
    isDefault: true,
    baseUrl: 'https://api.openai.com/v1',
    responsesPath: '/responses',
    chatPath: '/chat/completions',
    model: 'gpt-5.4',
    authStyle: 'bearer',
    temperature: 0.2,
    maxTokens: 4096,
    responseFormat: 'none',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    providerType: 'anthropic',
    providerLabel: 'Anthropic',
    protocol: 'anthropic-messages',
    description: 'Anthropic Claude via the Messages API.',
    recommended: false,
    readonly: true,
    envKey: 'CLAUDE',
    enabled: true,
    isDefault: false,
    baseUrl: 'https://api.anthropic.com',
    messagesPath: '/v1/messages',
    model: 'claude-3-7-sonnet-latest',
    authStyle: 'x-api-key',
    anthropicVersion: '2023-06-01',
    temperature: 0.2,
    maxTokens: 4096,
    responseFormat: 'none',
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen',
    providerType: 'qwen',
    providerLabel: 'Alibaba Cloud',
    protocol: 'openai-chat',
    description: 'Qwen through DashScope compatible mode.',
    recommended: false,
    readonly: true,
    envKey: 'QWEN',
    enabled: true,
    isDefault: false,
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    chatPath: '/chat/completions',
    responsesPath: '/responses',
    model: 'qwen-plus',
    authStyle: 'bearer',
    temperature: 0.2,
    maxTokens: 4096,
    responseFormat: 'none',
  },
  doubao: {
    id: 'doubao',
    name: 'Doubao',
    providerType: 'doubao',
    providerLabel: 'Volcengine',
    protocol: 'openai-chat',
    description: 'Doubao through Ark OpenAI-compatible API.',
    recommended: false,
    readonly: true,
    envKey: 'DOUBAO',
    enabled: true,
    isDefault: false,
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    chatPath: '/chat/completions',
    responsesPath: '/responses',
    model: '',
    authStyle: 'bearer',
    temperature: 0.2,
    maxTokens: 4096,
    responseFormat: 'none',
  },
};

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const loadLocalProviderConfig = () => {
  if (!fs.existsSync(LOCAL_CONFIG_PATH)) {
    return {};
  }
  return safeJsonParse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8'), {}) || {};
};

const resolveProviderLabel = (providerType, fallbackLabel) =>
  normalizeText(fallbackLabel) || PROVIDER_LABELS[providerType] || PROVIDER_LABELS.custom;

const sanitizeAIModel = (input = {}, current = {}) => {
  const nextProtocol = PROTOCOL_OPTIONS.includes(input.protocol)
    ? input.protocol
    : PROTOCOL_OPTIONS.includes(current.protocol)
      ? current.protocol
      : 'openai-chat';
  const protocolDefaults = getProtocolDefaults(nextProtocol);
  const protocolChanged = hasOwn(input, 'protocol') && input.protocol !== current.protocol;

  const providerType = ['openai', 'anthropic', 'qwen', 'doubao', 'custom'].includes(input.providerType)
    ? input.providerType
    : ['openai', 'anthropic', 'qwen', 'doubao', 'custom'].includes(current.providerType)
      ? current.providerType
      : 'custom';

  const currentCreatedAt = normalizeText(current.createdAt);

  return {
    id: normalizeText(input.id) || normalizeText(current.id) || `model_${Date.now()}`,
    name: hasOwn(input, 'name') ? normalizeText(input.name) : normalizeText(current.name),
    providerType,
    providerLabel: resolveProviderLabel(
      providerType,
      hasOwn(input, 'providerLabel') ? input.providerLabel : current.providerLabel,
    ),
    protocol: nextProtocol,
    description: hasOwn(input, 'description')
      ? normalizeText(input.description)
      : normalizeText(current.description),
    recommended: hasOwn(input, 'recommended')
      ? input.recommended !== false
      : current.recommended === true,
    readonly: current.readonly === true || input.readonly === true,
    envKey: hasOwn(input, 'envKey') ? normalizeText(input.envKey) : normalizeText(current.envKey),
    enabled: hasOwn(input, 'enabled') ? input.enabled !== false : current.enabled !== false,
    isDefault: hasOwn(input, 'isDefault') ? input.isDefault !== false : current.isDefault === true,
    baseUrl: hasOwn(input, 'baseUrl') ? normalizeText(input.baseUrl) : normalizeText(current.baseUrl),
    model: hasOwn(input, 'model') ? normalizeText(input.model) : normalizeText(current.model),
    apiKey: hasOwn(input, 'apiKey') ? normalizeText(input.apiKey) : normalizeText(current.apiKey),
    authStyle: (() => {
      const rawAuthStyle = hasOwn(input, 'authStyle')
        ? normalizeText(input.authStyle).toLowerCase()
        : normalizeText(current.authStyle).toLowerCase();
      return ['bearer', 'x-api-key', 'none'].includes(rawAuthStyle)
        ? rawAuthStyle
        : protocolDefaults.authStyle;
    })(),
    responsesPath: hasOwn(input, 'responsesPath')
      ? normalizeText(input.responsesPath)
      : protocolChanged
        ? protocolDefaults.responsesPath || ''
        : normalizeText(current.responsesPath) || protocolDefaults.responsesPath || '',
    chatPath: hasOwn(input, 'chatPath')
      ? normalizeText(input.chatPath)
      : protocolChanged
        ? protocolDefaults.chatPath || ''
        : normalizeText(current.chatPath) || protocolDefaults.chatPath || '',
    messagesPath: hasOwn(input, 'messagesPath')
      ? normalizeText(input.messagesPath)
      : protocolChanged
        ? protocolDefaults.messagesPath || ''
        : normalizeText(current.messagesPath) || protocolDefaults.messagesPath || '',
    anthropicVersion: hasOwn(input, 'anthropicVersion')
      ? normalizeText(input.anthropicVersion)
      : protocolChanged
        ? protocolDefaults.anthropicVersion || ''
        : normalizeText(current.anthropicVersion) || protocolDefaults.anthropicVersion || '',
    responseFormat: hasOwn(input, 'responseFormat')
      ? normalizeText(input.responseFormat)
      : protocolChanged
        ? protocolDefaults.responseFormat || 'none'
        : normalizeText(current.responseFormat) || protocolDefaults.responseFormat || 'none',
    temperature: hasOwn(input, 'temperature')
      ? normalizeNumber(input.temperature, 0.2)
      : normalizeNumber(current.temperature, 0.2),
    maxTokens: hasOwn(input, 'maxTokens')
      ? normalizeNumber(input.maxTokens, 4096)
      : normalizeNumber(current.maxTokens, 4096),
    createdAt: currentCreatedAt || nowText(),
    updatedAt: nowText(),
  };
};

const ensureSingleDefault = (models) => {
  const nextModels = Array.isArray(models) ? models.map((item) => ({ ...item })) : [];
  const explicitDefault = nextModels.find((item) => item.isDefault && item.enabled !== false);
  const fallbackDefault = explicitDefault || nextModels.find((item) => item.enabled !== false) || nextModels[0];

  return nextModels.map((item) => ({
    ...item,
    isDefault: fallbackDefault ? item.id === fallbackDefault.id : false,
  }));
};

const buildInitialAIModels = () => {
  const localConfig = loadLocalProviderConfig();

  const seededModels = Object.values(AI_MODEL_TEMPLATES).map((template) =>
    sanitizeAIModel({
      ...template,
      ...(localConfig[template.id] || {}),
    }),
  );

  return ensureSingleDefault(seededModels);
};

let aiModels = buildInitialAIModels();

const getAIModels = () => clone(aiModels);

const getAIModelById = (id) => aiModels.find((item) => item.id === normalizeText(id)) || null;

const assertModelName = (name, currentId) => {
  if (!name) {
    throw new Error('模型名称不能为空');
  }

  if (aiModels.some((item) => item.name === name && item.id !== currentId)) {
    throw new Error('模型名称已存在');
  }
};

const createAIModel = (payload = {}) => {
  const baseModel = sanitizeAIModel({
    providerType: 'custom',
    providerLabel: 'Custom',
    protocol: payload.protocol || 'openai-chat',
    enabled: true,
    ...payload,
  });

  assertModelName(baseModel.name, '');
  const createdId = `model_${Date.now()}`;

  aiModels = ensureSingleDefault([
    ...aiModels,
    {
      ...baseModel,
      id: createdId,
      readonly: false,
    },
  ]);

  return getAIModelById(createdId);
};

const updateAIModel = (payload = {}) => {
  const id = normalizeText(payload.id);
  const currentModel = getAIModelById(id);

  if (!currentModel) {
    throw new Error('模型配置不存在');
  }

  const nextModel = sanitizeAIModel(payload, currentModel);
  assertModelName(nextModel.name, id);

  aiModels = ensureSingleDefault(
    aiModels.map((item) => (item.id === id ? nextModel : item)),
  );

  return getAIModelById(id);
};

const deleteAIModel = (id) => {
  const targetId = normalizeText(id);
  const currentModel = getAIModelById(targetId);

  if (!currentModel) {
    throw new Error('模型配置不存在');
  }

  if (currentModel.readonly) {
    throw new Error('预置模型不支持删除');
  }

  aiModels = ensureSingleDefault(aiModels.filter((item) => item.id !== targetId));

  return {
    success: true,
    defaultModelId: aiModels.find((item) => item.isDefault)?.id,
  };
};

const setDefaultAIModel = (id) => {
  const targetId = normalizeText(id);
  const currentModel = getAIModelById(targetId);

  if (!currentModel) {
    throw new Error('模型配置不存在');
  }

  if (currentModel.enabled === false) {
    throw new Error('请先启用该模型后再设为默认');
  }

  aiModels = aiModels.map((item) => ({
    ...item,
    isDefault: item.id === targetId,
    updatedAt: item.id === targetId ? nowText() : item.updatedAt,
  }));

  return getAIModelById(targetId);
};

const normalizeBaseUrl = (value) => normalizeText(value).replace(/\/+$/, '');

const resolveConfigHint = (modelConfig) => {
  if (modelConfig.enabled === false) {
    return 'Disabled in Global Config.';
  }
  if (!modelConfig.baseUrl) {
    return 'Requires baseUrl.';
  }
  if (!modelConfig.model) {
    return 'Requires model.';
  }
  if (!modelConfig.apiKey) {
    return 'Requires apiKey.';
  }
  return '';
};

const applyEnvOverrides = (runtimeConfig) => {
  const envKey = normalizeText(runtimeConfig.envKey);
  if (!envKey) {
    return runtimeConfig;
  }

  const envPrefix = `AI_WORKBENCH_${envKey}`;
  const nextConfig = { ...runtimeConfig };

  if (process.env[`${envPrefix}_BASE_URL`]) nextConfig.baseUrl = process.env[`${envPrefix}_BASE_URL`];
  if (process.env[`${envPrefix}_MODEL`]) nextConfig.model = process.env[`${envPrefix}_MODEL`];
  if (process.env[`${envPrefix}_API_KEY`]) nextConfig.apiKey = process.env[`${envPrefix}_API_KEY`];
  if (process.env[`${envPrefix}_ENABLED`]) nextConfig.enabled = process.env[`${envPrefix}_ENABLED`] !== 'false';
  if (process.env[`${envPrefix}_CHAT_PATH`]) nextConfig.chatPath = process.env[`${envPrefix}_CHAT_PATH`];
  if (process.env[`${envPrefix}_RESPONSES_PATH`]) nextConfig.responsesPath = process.env[`${envPrefix}_RESPONSES_PATH`];
  if (process.env[`${envPrefix}_MESSAGES_PATH`]) nextConfig.messagesPath = process.env[`${envPrefix}_MESSAGES_PATH`];
  if (process.env[`${envPrefix}_AUTH_STYLE`]) nextConfig.authStyle = process.env[`${envPrefix}_AUTH_STYLE`];
  if (process.env[`${envPrefix}_ANTHROPIC_VERSION`]) nextConfig.anthropicVersion = process.env[`${envPrefix}_ANTHROPIC_VERSION`];
  if (process.env[`${envPrefix}_TEMPERATURE`]) nextConfig.temperature = process.env[`${envPrefix}_TEMPERATURE`];
  if (process.env[`${envPrefix}_MAX_TOKENS`]) nextConfig.maxTokens = process.env[`${envPrefix}_MAX_TOKENS`];
  if (process.env[`${envPrefix}_RESPONSE_FORMAT`]) nextConfig.responseFormat = process.env[`${envPrefix}_RESPONSE_FORMAT`];
  if (process.env[`${envPrefix}_EXTRA_HEADERS`]) {
    nextConfig.extraHeaders = safeJsonParse(process.env[`${envPrefix}_EXTRA_HEADERS`], nextConfig.extraHeaders);
  }

  return nextConfig;
};

const buildRuntimeModelConfig = (id) => {
  const modelConfig = getAIModelById(id);
  if (!modelConfig) {
    return null;
  }

  const runtimeConfig = applyEnvOverrides({
    ...clone(modelConfig),
    provider: modelConfig.providerLabel,
    apiStyle: modelConfig.protocol,
    requestApiStyle: modelConfig.protocol,
    streamApiStyle: modelConfig.protocol,
    baseUrl: normalizeBaseUrl(modelConfig.baseUrl),
    temperature: normalizeNumber(modelConfig.temperature, 0.2),
    maxTokens: normalizeNumber(modelConfig.maxTokens, 4096),
    responseFormat: normalizeText(modelConfig.responseFormat) || 'none',
    extraHeaders:
      modelConfig.extraHeaders && typeof modelConfig.extraHeaders === 'object' && !Array.isArray(modelConfig.extraHeaders)
        ? modelConfig.extraHeaders
        : {},
  });

  runtimeConfig.baseUrl = normalizeBaseUrl(runtimeConfig.baseUrl);
  runtimeConfig.requestApiStyle = runtimeConfig.requestApiStyle || runtimeConfig.apiStyle;
  runtimeConfig.streamApiStyle = runtimeConfig.streamApiStyle || runtimeConfig.apiStyle;
  runtimeConfig.authStyle = normalizeText(runtimeConfig.authStyle).toLowerCase() || getProtocolDefaults(runtimeConfig.protocol).authStyle;
  runtimeConfig.responseFormat = normalizeText(runtimeConfig.responseFormat) || 'none';
  runtimeConfig.temperature = normalizeNumber(runtimeConfig.temperature, 0.2);
  runtimeConfig.maxTokens = normalizeNumber(runtimeConfig.maxTokens, 4096);
  runtimeConfig.configured = Boolean(
    runtimeConfig.enabled !== false &&
      runtimeConfig.baseUrl &&
      runtimeConfig.model &&
      runtimeConfig.apiKey,
  );
  runtimeConfig.configHint = runtimeConfig.configured ? '' : resolveConfigHint(runtimeConfig);

  return runtimeConfig;
};

const listRuntimeModelConfigs = () => getAIModels().map((item) => buildRuntimeModelConfig(item.id)).filter(Boolean);

module.exports = {
  LOCAL_CONFIG_PATH,
  getAIModels,
  getAIModelById,
  createAIModel,
  updateAIModel,
  deleteAIModel,
  setDefaultAIModel,
  buildRuntimeModelConfig,
  listRuntimeModelConfigs,
};
