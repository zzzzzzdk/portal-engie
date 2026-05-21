const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = String(
  process.env.AGENT_CHAT_OPENCODE_PORT
  || process.env.AI_WORKBENCH_OPENCODE_PORT
  || '8096',
).trim();
const LOCAL_OPENCODE_CONFIG_PATH = path.join(__dirname, 'agent-chat.opencode.local.json');
const DEFAULT_COMPOSE_ENV_PATH =
  process.env.AGENT_CHAT_OPENCODE_COMPOSE_ENV_PATH
  || process.env.AI_WORKBENCH_OPENCODE_COMPOSE_ENV_PATH
  || 'D:\\openCode\\compose\\.env';

const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeText = (value) => String(value || '').trim();
const normalizeBaseUrl = (value) => normalizeText(value).replace(/\/+$/, '');

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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
      const trimmed = normalizeText(line);
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

const nowText = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const resolveDefaultOpenCodeServiceUrl = () => {
  const localConfig = readJsonFile(LOCAL_OPENCODE_CONFIG_PATH);
  const composeEnv = parseEnvFile(DEFAULT_COMPOSE_ENV_PATH);
  const serverPort = normalizeText(composeEnv.OPENCODE_PORT) || DEFAULT_PORT;

  return normalizeBaseUrl(
    localConfig.baseUrl
    || process.env.AGENT_CHAT_OPENCODE_BASE_URL
    || process.env.AI_WORKBENCH_OPENCODE_BASE_URL
    || composeEnv.OPENCODE_SERVER_BASE_URL
    || `http://127.0.0.1:${serverPort}`,
  );
};

const createInitialGlobalConfig = () => ({
  currentThemeId: 'theme_001',
  themes: [
    {
      id: 'theme_001',
      name: '平台默认主题',
      pageBackground: {
        backgroundType: 'gradient',
        backgroundGradient: 'linear-gradient(135deg, #f7f9fc 0%, #edf2ff 100%)',
      },
      widgetBackground: {
        backgroundType: 'color',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropBlur: 10,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
      widgetTitle: {
        showTitle: true,
        titleColor: '#1f1f1f',
        titleFontSize: 16,
        titleFontWeight: 600,
      },
      createdAt: '2026-04-10 09:00:00',
      updatedAt: '2026-04-12 14:20:00',
    },
    {
      id: 'theme_002',
      name: '海洋蓝主题',
      pageBackground: {
        backgroundType: 'image',
        backgroundImage: 'http://192.168.5.47:3003/10001.jpg',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      },
      widgetBackground: {
        backgroundType: 'gradient',
        backgroundGradient: 'linear-gradient(135deg, rgba(12, 74, 110, 0.82) 0%, rgba(14, 116, 144, 0.72) 100%)',
        backdropBlur: 8,
        boxShadow: '0 16px 36px rgba(8, 47, 73, 0.22)',
      },
      widgetTitle: {
        showTitle: true,
        titleColor: '#ffffff',
        titleFontSize: 18,
        titleFontWeight: 600,
      },
      createdAt: '2026-04-09 16:40:00',
      updatedAt: '2026-04-13 10:15:00',
    },
  ],
  componentDataSource: {
    businessApiUrl: '/api',
    documentStorageUrl: 'http://192.168.16.26:8010/api',
  },
  messageCopies: {
    'form.success': '表单提交成功',
    'form.error': '表单提交失败，请稍后重试',
  },
  opencode: {
    serviceUrl: resolveDefaultOpenCodeServiceUrl(),
  },
});

let globalConfig = createInitialGlobalConfig();

const getGlobalConfig = () => clone(globalConfig);

const setGlobalConfig = (nextValue) => {
  globalConfig = clone(nextValue);
  return getGlobalConfig();
};

const getOpenCodeServiceUrl = () => normalizeBaseUrl(globalConfig?.opencode?.serviceUrl);

module.exports = {
  getGlobalConfig,
  getOpenCodeServiceUrl,
  nowText,
  setGlobalConfig,
};
