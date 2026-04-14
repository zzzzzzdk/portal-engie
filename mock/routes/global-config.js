var express = require('express');

var router = express.Router();

const {
  createAIModel,
  deleteAIModel,
  getAIModels,
  setDefaultAIModel,
  updateAIModel,
} = require('../config/ai-models-state');

const nowText = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeText = (value) => String(value || '').trim();

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

let globalConfig = {
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
        backgroundImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
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
};

router.get('/v1/global-config/detail', async (req, res) => {
  await req.sleep(0.15);
  req.json.data = {
    ...clone(globalConfig),
    aiModels: getAIModels(),
  };
  res.json(req.json);
});

router.post('/v1/global-config/theme/create', async (req, res) => {
  await req.sleep(0.15);

  const name = normalizeText(req.body?.name);
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

  req.json.data = { id: newTheme.id };
  res.json(req.json);
});

router.post('/v1/global-config/theme/update', async (req, res) => {
  await req.sleep(0.15);

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

  req.json.data = { id };
  res.json(req.json);
});

router.post('/v1/global-config/theme/delete', async (req, res) => {
  await req.sleep(0.15);

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

  req.json.data = {
    success: true,
    currentThemeId: globalConfig.currentThemeId,
  };
  res.json(req.json);
});

router.post('/v1/global-config/component-data-source/save', async (req, res) => {
  await req.sleep(0.12);

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

  req.json.data = clone(globalConfig.componentDataSource);
  res.json(req.json);
});

router.post('/v1/global-config/message-copy/save', async (req, res) => {
  await req.sleep(0.12);

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

  req.json.data = clone(globalConfig.messageCopies);
  res.json(req.json);
});

router.post('/v1/global-config/ai-model/create', async (req, res) => {
  await req.sleep(0.12);

  try {
    const createdModel = createAIModel(req.body || {});
    req.json.data = { id: createdModel.id };
    res.json(req.json);
  } catch (error) {
    req.json.code = 40000;
    req.json.message = error instanceof Error ? error.message : '新增模型配置失败';
    req.json.data = null;
    res.json(req.json);
  }
});

router.post('/v1/global-config/ai-model/update', async (req, res) => {
  await req.sleep(0.12);

  try {
    const updatedModel = updateAIModel(req.body || {});
    req.json.data = { id: updatedModel.id };
    res.json(req.json);
  } catch (error) {
    req.json.code = 40000;
    req.json.message = error instanceof Error ? error.message : '保存模型配置失败';
    req.json.data = null;
    res.json(req.json);
  }
});

router.post('/v1/global-config/ai-model/delete', async (req, res) => {
  await req.sleep(0.12);

  try {
    req.json.data = deleteAIModel(req.body?.id);
    res.json(req.json);
  } catch (error) {
    req.json.code = 40000;
    req.json.message = error instanceof Error ? error.message : '删除模型配置失败';
    req.json.data = null;
    res.json(req.json);
  }
});

router.post('/v1/global-config/ai-model/set-default', async (req, res) => {
  await req.sleep(0.12);

  try {
    const defaultModel = setDefaultAIModel(req.body?.id);
    req.json.data = { id: defaultModel.id };
    res.json(req.json);
  } catch (error) {
    req.json.code = 40000;
    req.json.message = error instanceof Error ? error.message : '设置默认模型失败';
    req.json.data = null;
    res.json(req.json);
  }
});

module.exports = router;
