var express = require('express');

var router = express.Router();

const {
  getGlobalConfig,
  nowText,
  setGlobalConfig,
} = require('../config/global-config-state');

const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeText = (value) => String(value || '').trim();
const normalizeBaseUrl = (value) => normalizeText(value).replace(/\/+$/, '');

const normalizeColor = (value) => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'object' && typeof value.toRgbString === 'function') {
    return value.toRgbString();
  }
  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }
  if (typeof value === 'object' && value.metaColor) {
    const { r, g, b, a } = value.metaColor;
    if (a !== undefined && a < 1) {
      return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
    }
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }
  return undefined;
};

const normalizePositiveNumber = (value, fallbackValue) => {
  if (value === undefined || value === null || value === '') {
    return fallbackValue;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallbackValue;
  }
  return parsed;
};

const sanitizeBackgroundConfig = (value) => {
  const config = value || {};
  const backgroundType = ['color', 'image', 'gradient'].includes(config.backgroundType)
    ? config.backgroundType
    : 'color';

  return {
    backgroundType,
    backgroundColor: normalizeColor(config.backgroundColor),
    backgroundImage: normalizeText(config.backgroundImage),
    backgroundGradient: normalizeText(config.backgroundGradient),
    backgroundSize: normalizeText(config.backgroundSize),
    backgroundRepeat: normalizeText(config.backgroundRepeat),
    backgroundPosition: normalizeText(config.backgroundPosition),
    backdropBlur: normalizePositiveNumber(config.backdropBlur, undefined),
    boxShadow: normalizeText(config.boxShadow),
  };
};

const sanitizeWidgetTitleConfig = (value) => {
  const config = value || {};

  return {
    showTitle: config.showTitle !== false,
    titleColor: normalizeColor(config.titleColor),
    titleFontSize: normalizePositiveNumber(config.titleFontSize, undefined),
    titleFontWeight: [400, 500, 600, 700, '400', '500', '600', '700'].includes(config.titleFontWeight)
      ? Number(config.titleFontWeight)
      : undefined,
  };
};

const createDefaultTheme = (name) => ({
  id: `theme_${Date.now()}`,
  name,
  pageBackground: {
    backgroundType: 'gradient',
    backgroundGradient: 'linear-gradient(135deg, #f6f8fb 0%, #eef3ff 100%)',
  },
  widgetBackground: {
    backgroundType: 'color',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    backdropBlur: 12,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  },
  widgetTitle: {
    showTitle: true,
    titleColor: '#1f1f1f',
    titleFontSize: 16,
    titleFontWeight: 600,
  },
  createdAt: nowText(),
  updatedAt: nowText(),
});

router.get('/v1/global-config/detail', async (req, res) => {
  await req.sleep(0.15);
  req.json.data = getGlobalConfig();
  res.json(req.json);
});

router.post('/v1/global-config/theme/create', async (req, res) => {
  await req.sleep(0.15);

  const name = normalizeText(req.body?.name);
  const globalConfig = getGlobalConfig();
  if (!name) {
    req.json.code = 40000;
    req.json.message = '主题方案名称不能为空';
    req.json.data = null;
    return res.json(req.json);
  }

  if (globalConfig.themes.some((item) => item.name === name)) {
    req.json.code = 40000;
    req.json.message = '主题方案名称已存在';
    req.json.data = null;
    return res.json(req.json);
  }

  const newTheme = createDefaultTheme(name);
  globalConfig.themes.push(newTheme);
  globalConfig.currentThemeId = newTheme.id;
  setGlobalConfig(globalConfig);

  req.json.data = { id: newTheme.id };
  res.json(req.json);
});

router.post('/v1/global-config/theme/update', async (req, res) => {
  await req.sleep(0.15);

  const globalConfig = getGlobalConfig();
  const id = normalizeText(req.body?.id);
  const name = normalizeText(req.body?.name);
  const currentTheme = globalConfig.themes.find((item) => item.id === id);

  if (!currentTheme) {
    req.json.code = 40004;
    req.json.message = '主题方案不存在';
    req.json.data = null;
    return res.json(req.json);
  }

  if (!name) {
    req.json.code = 40000;
    req.json.message = '主题方案名称不能为空';
    req.json.data = null;
    return res.json(req.json);
  }

  if (globalConfig.themes.some((item) => item.name === name && item.id !== id)) {
    req.json.code = 40000;
    req.json.message = '主题方案名称已存在';
    req.json.data = null;
    return res.json(req.json);
  }

  const updatedTheme = {
    ...currentTheme,
    name,
    pageBackground: sanitizeBackgroundConfig(req.body?.pageBackground),
    widgetBackground: sanitizeBackgroundConfig(req.body?.widgetBackground),
    widgetTitle: sanitizeWidgetTitleConfig(req.body?.widgetTitle),
    updatedAt: nowText(),
  };

  globalConfig.themes = globalConfig.themes.map((item) => (item.id === id ? updatedTheme : item));
  globalConfig.currentThemeId = id;
  setGlobalConfig(globalConfig);

  req.json.data = { id };
  res.json(req.json);
});

router.post('/v1/global-config/theme/delete', async (req, res) => {
  await req.sleep(0.15);

  const globalConfig = getGlobalConfig();
  const id = normalizeText(req.body?.id);
  if (!globalConfig.themes.some((item) => item.id === id)) {
    req.json.code = 40004;
    req.json.message = '主题方案不存在';
    req.json.data = null;
    return res.json(req.json);
  }

  if (globalConfig.themes.length <= 1) {
    req.json.code = 40000;
    req.json.message = '至少需要保留一个主题方案';
    req.json.data = null;
    return res.json(req.json);
  }

  globalConfig.themes = globalConfig.themes.filter((item) => item.id !== id);
  if (globalConfig.currentThemeId === id) {
    globalConfig.currentThemeId = globalConfig.themes[0]?.id;
  }
  setGlobalConfig(globalConfig);

  req.json.data = {
    success: true,
    currentThemeId: globalConfig.currentThemeId,
  };
  res.json(req.json);
});

router.post('/v1/global-config/component-data-source/save', async (req, res) => {
  await req.sleep(0.12);

  const globalConfig = getGlobalConfig();
  const businessApiUrl = normalizeText(req.body?.businessApiUrl);
  const documentStorageUrl = normalizeText(req.body?.documentStorageUrl);

  if (!businessApiUrl) {
    req.json.code = 40000;
    req.json.message = '业务 API 地址不能为空';
    req.json.data = null;
    return res.json(req.json);
  }

  if (!documentStorageUrl) {
    req.json.code = 40000;
    req.json.message = '文档存储服务地址不能为空';
    req.json.data = null;
    return res.json(req.json);
  }

  globalConfig.componentDataSource = {
    businessApiUrl,
    documentStorageUrl,
  };
  setGlobalConfig(globalConfig);

  req.json.data = clone(globalConfig.componentDataSource);
  res.json(req.json);
});

router.post('/v1/global-config/message-copy/save', async (req, res) => {
  await req.sleep(0.12);

  const globalConfig = getGlobalConfig();
  const successText = normalizeText(req.body?.['form.success']);
  const errorText = normalizeText(req.body?.['form.error']);

  if (!successText || !errorText) {
    req.json.code = 40000;
    req.json.message = '消息文案不能为空';
    req.json.data = null;
    return res.json(req.json);
  }

  globalConfig.messageCopies = {
    'form.success': successText,
    'form.error': errorText,
  };
  setGlobalConfig(globalConfig);

  req.json.data = clone(globalConfig.messageCopies);
  res.json(req.json);
});

router.post('/v1/global-config/opencode/save', async (req, res) => {
  await req.sleep(0.12);

  const globalConfig = getGlobalConfig();
  const serviceUrl = normalizeBaseUrl(req.body?.serviceUrl);

  if (!serviceUrl) {
    req.json.code = 40000;
    req.json.message = 'OpenCode 服务地址不能为空';
    req.json.data = null;
    return res.json(req.json);
  }

  globalConfig.opencode = {
    serviceUrl,
  };
  setGlobalConfig(globalConfig);

  req.json.data = clone(globalConfig.opencode);
  res.json(req.json);
});

module.exports = router;
