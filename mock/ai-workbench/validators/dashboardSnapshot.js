const {
  GRID_COLUMNS,
  VALID_WIDGET_TYPES,
  WIDGET_LAYOUT_PRESETS,
  applyThemeByPrompt,
  createEmptySnapshot,
  detectClearIntent,
  detectRenameIntent,
  extractExplicitTitle,
  getSnapshotTitle,
  reflowWidgetsCompact36,
} = require('../skills/portalBuilderRuntime');

const AI_WORKBENCH_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'reasoning', 'summary', 'snapshot'],
  properties: {
    reply: { type: 'string' },
    reasoning: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'content'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
        },
      },
    },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'widgetCount', 'widgetTypes', 'mode'],
      properties: {
        title: { type: 'string' },
        widgetCount: { type: 'number' },
        widgetTypes: {
          type: 'array',
          items: { type: 'string' },
        },
        mode: { type: 'string', enum: ['create', 'edit'] },
      },
    },
    snapshot: {
      type: 'object',
      additionalProperties: false,
      required: ['widgets', 'groups', 'floatingModules'],
      properties: {
        widgets: { type: 'array', items: { type: 'object' } },
        groups: { type: 'array', items: { type: 'object' } },
        floatingModules: { type: 'array', items: { type: 'object' } },
        dashboardConfig: { type: 'object' },
      },
    },
  },
};

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const clone = (value) => JSON.parse(JSON.stringify(value));
const trimString = (value) => String(value || '').trim();

const normalizeSnapshot = (snapshot) => ({
  widgets: Array.isArray(snapshot?.widgets) ? clone(snapshot.widgets) : [],
  groups: Array.isArray(snapshot?.groups) ? clone(snapshot.groups) : [],
  floatingModules: Array.isArray(snapshot?.floatingModules) ? clone(snapshot.floatingModules) : [],
  dashboardConfig: snapshot?.dashboardConfig ? clone(snapshot.dashboardConfig) : {},
});

const sanitizeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getWidgetLayoutPreset = (type) => WIDGET_LAYOUT_PRESETS[type] || { w: 8, h: 6, minW: 4, minH: 3 };

const normalizeCarouselConfig = (config) => {
  const nextConfig = { ...config };
  if (!nextConfig.dataSourceType) nextConfig.dataSourceType = 'static';
  if (!nextConfig.autoplay || typeof nextConfig.autoplay !== 'object') nextConfig.autoplay = {};
  if (typeof nextConfig.autoplay.enabled !== 'boolean') nextConfig.autoplay.enabled = true;
  if (typeof nextConfig.autoPlay === 'boolean' && typeof nextConfig.autoplay.enabled !== 'boolean') {
    nextConfig.autoplay.enabled = nextConfig.autoPlay;
  }
  if (Number.isFinite(Number(nextConfig.interval)) && !Number.isFinite(Number(nextConfig.autoplay.delay))) {
    nextConfig.autoplay.delay = Number(nextConfig.interval);
  }
  if (Array.isArray(nextConfig.slides)) {
    nextConfig.slides = nextConfig.slides.map((item, index) => {
      const slide = { ...item };
      if (!slide.id) slide.id = createId(`slide-${index}`);
      if (!slide.imageUrl && slide.image) slide.imageUrl = slide.image;
      return slide;
    });
  }
  if (nextConfig.backgroundColor && !nextConfig.backgroundType) {
    nextConfig.backgroundType = 'color';
  }
  delete nextConfig.autoPlay;
  delete nextConfig.interval;
  return nextConfig;
};

const normalizeNavGroupConfig = (config) => {
  const nextConfig = { ...config };
  if (!Array.isArray(nextConfig.staticItems) && Array.isArray(nextConfig.items)) {
    nextConfig.staticItems = nextConfig.items;
  }
  if (!Array.isArray(nextConfig.staticItems)) {
    nextConfig.staticItems = [];
  }
  if (nextConfig.backgroundColor && !nextConfig.backgroundType) {
    nextConfig.backgroundType = 'color';
  }
  delete nextConfig.items;
  return nextConfig;
};

const normalizeQueryFilterConfig = (config) => {
  const nextConfig = { ...config };
  if (!Array.isArray(nextConfig.queryFields) && Array.isArray(nextConfig.fields)) {
    nextConfig.queryFields = nextConfig.fields;
  }
  if (!Array.isArray(nextConfig.queryFields)) nextConfig.queryFields = [];
  if (!nextConfig.submitMethod) nextConfig.submitMethod = 'eventRoute';
  if (!Number.isFinite(Number(nextConfig.layoutCols))) nextConfig.layoutCols = 4;
  if (nextConfig.backgroundColor && !nextConfig.backgroundType) nextConfig.backgroundType = 'color';
  delete nextConfig.fields;
  return nextConfig;
};

const normalizeDataTableConfig = (config) => {
  const nextConfig = { ...config };
  if (!Array.isArray(nextConfig.staticData) && Array.isArray(nextConfig.tableData)) {
    nextConfig.staticData = nextConfig.tableData;
  }
  if (!nextConfig.paginationMode && nextConfig.pagination) nextConfig.paginationMode = 'pagination';
  if (nextConfig.paginationMode === 'pagination' && !nextConfig.paginationConfig) {
    nextConfig.paginationConfig = { page: 1, pageSize: 10, showTotal: true };
  }
  if (nextConfig.backgroundColor && !nextConfig.backgroundType) nextConfig.backgroundType = 'color';
  delete nextConfig.tableData;
  return nextConfig;
};

const normalizeHeaderBarConfig = (config, title) => {
  const nextConfig = { ...config };
  if (!nextConfig.headerTitle) nextConfig.headerTitle = nextConfig.title || title;
  if (!nextConfig.textColor) nextConfig.textColor = '#EAF4FF';
  if (Array.isArray(nextConfig.menuItems) && !Array.isArray(nextConfig.navItems)) {
    nextConfig.navItems = nextConfig.menuItems;
  }
  if (!Array.isArray(nextConfig.navItems)) nextConfig.navItems = [];
  if (nextConfig.backgroundGradient && !nextConfig.backgroundType) nextConfig.backgroundType = 'gradient';
  if (nextConfig.backgroundColor && !nextConfig.backgroundType) nextConfig.backgroundType = 'color';
  return nextConfig;
};

const normalizeRichTextConfig = (config) => {
  const nextConfig = { ...config };
  if (typeof nextConfig.html === 'string' && nextConfig.html && !/style=/.test(nextConfig.html)) {
    nextConfig.html = `<div style="color:#222222;line-height:1.8">${nextConfig.html}</div>`;
  }
  if (nextConfig.backgroundColor && !nextConfig.backgroundType) nextConfig.backgroundType = 'color';
  return nextConfig;
};

const normalizeWidgetConfig = (type, rawConfig, title) => {
  const config = rawConfig && typeof rawConfig === 'object' ? { ...rawConfig } : {};
  switch (type) {
    case 'carousel':
      return normalizeCarouselConfig(config);
    case 'navGroup':
      return normalizeNavGroupConfig(config);
    case 'queryFilter':
      return normalizeQueryFilterConfig(config);
    case 'dataTable':
      return normalizeDataTableConfig(config);
    case 'headerBar':
      return normalizeHeaderBarConfig(config, title);
    case 'richText':
      return normalizeRichTextConfig(config);
    case 'news':
    case 'topList':
      if ((Array.isArray(config.staticData) || Array.isArray(config.newsItems)) && !config.dataSource) {
        return {
          ...config,
          dataSource: 'static',
          ...(config.backgroundColor && !config.backgroundType ? { backgroundType: 'color' } : {}),
        };
      }
      return config.backgroundColor && !config.backgroundType
        ? { ...config, backgroundType: 'color' }
        : config;
    default:
      if (config.backgroundGradient && !config.backgroundType) {
        return { ...config, backgroundType: 'gradient' };
      }
      if (config.backgroundColor && !config.backgroundType) {
        return { ...config, backgroundType: 'color' };
      }
      return config;
  }
};

const normalizeWidgetLayout = (type, rawLayout, autoPosition) => {
  const preset = getWidgetLayoutPreset(type);
  const width = Math.max(1, Math.min(GRID_COLUMNS, Math.round(sanitizeNumber(rawLayout?.w, preset.w))));
  const height = Math.max(1, Math.round(sanitizeNumber(rawLayout?.h, preset.h)));
  let x = Math.max(0, Math.round(sanitizeNumber(rawLayout?.x, autoPosition.x)));
  let y = Math.max(0, Math.round(sanitizeNumber(rawLayout?.y, autoPosition.y)));
  if (x + width > GRID_COLUMNS) x = Math.max(0, GRID_COLUMNS - width);
  return {
    i: String(rawLayout?.i || createId(`${type}-layout`)),
    x,
    y,
    w: width,
    h: height,
    minW: Math.max(1, Math.round(sanitizeNumber(rawLayout?.minW, preset.minW || 1))),
    minH: Math.max(1, Math.round(sanitizeNumber(rawLayout?.minH, preset.minH || 1))),
  };
};

const normalizeWidgetArray = (widgets) => {
  const normalized = [];
  const usedIds = new Set();

  for (const [index, rawWidget] of widgets.entries()) {
    if (!rawWidget || typeof rawWidget !== 'object') continue;
    const type = VALID_WIDGET_TYPES.has(rawWidget.type) ? rawWidget.type : null;
    if (!type) continue;

    let id = String(rawWidget.id || createId(type));
    if (usedIds.has(id)) id = createId(type);
    usedIds.add(id);

    const title = String(rawWidget.title || rawWidget.config?.title || type);
    normalized.push({
      id,
      type,
      title,
      layout: normalizeWidgetLayout(type, rawWidget.layout, { x: 0, y: index * 4 }),
      config: normalizeWidgetConfig(type, rawWidget.config, title),
      ...(rawWidget.groupId ? { groupId: String(rawWidget.groupId) } : {}),
    });
  }

  return reflowWidgetsCompact36(normalized);
};

const normalizeDashboardConfig = (config, titleFallback) => {
  const nextConfig = config && typeof config === 'object' ? { ...config } : {};
  if (!nextConfig.title && titleFallback) nextConfig.title = titleFallback;
  return nextConfig;
};

const normalizeModelSnapshot = (snapshot, titleFallback = '') => {
  const rawSnapshot = normalizeSnapshot(snapshot);
  return {
    widgets: normalizeWidgetArray(rawSnapshot.widgets),
    groups: rawSnapshot.groups,
    floatingModules: rawSnapshot.floatingModules,
    dashboardConfig: normalizeDashboardConfig(rawSnapshot.dashboardConfig, titleFallback),
  };
};

const mergeEditSnapshot = (currentSnapshot, incomingSnapshot, titleFallback, options = {}) => {
  const baseSnapshot = normalizeModelSnapshot(currentSnapshot, titleFallback);
  const nextSnapshot = normalizeModelSnapshot(incomingSnapshot, titleFallback);
  const resolvedTitle = trimString(options.resolvedTitle);

  const mergedSnapshot = {
    widgets: nextSnapshot.widgets.length ? nextSnapshot.widgets : baseSnapshot.widgets,
    groups: nextSnapshot.groups.length ? nextSnapshot.groups : baseSnapshot.groups,
    floatingModules: nextSnapshot.floatingModules.length ? nextSnapshot.floatingModules : baseSnapshot.floatingModules,
    dashboardConfig: {
      ...baseSnapshot.dashboardConfig,
      ...nextSnapshot.dashboardConfig,
    },
  };

  if (resolvedTitle) {
    mergedSnapshot.dashboardConfig.title = resolvedTitle;
  }

  return mergedSnapshot;
};

const syncSnapshotTitle = (snapshot, title) => {
  const resolvedTitle = trimString(title);
  if (!resolvedTitle || !snapshot || typeof snapshot !== 'object') return snapshot;

  if (!snapshot.dashboardConfig || typeof snapshot.dashboardConfig !== 'object') {
    snapshot.dashboardConfig = {};
  }
  snapshot.dashboardConfig.title = resolvedTitle;

  const header = Array.isArray(snapshot.widgets)
    ? snapshot.widgets.find((item) => item?.type === 'headerBar')
    : null;

  if (header) {
    header.title = resolvedTitle;
    header.config = normalizeWidgetConfig('headerBar', {
      ...header.config,
      title: resolvedTitle,
      headerTitle: resolvedTitle,
    }, resolvedTitle);
  }

  return snapshot;
};

const resolveResultTitle = ({ mode, prompt, currentSnapshot, result, snapshot, fallbackTitle }) => {
  const currentTitle = getSnapshotTitle(currentSnapshot);
  const explicitTitle = extractExplicitTitle(prompt);
  const renameIntent = detectRenameIntent(prompt);
  const candidateTitle = [
    getSnapshotTitle(snapshot),
    trimString(result?.summary?.title),
    explicitTitle,
    trimString(fallbackTitle),
  ].find(Boolean) || '';

  if (mode === 'edit') {
    if (currentTitle && !renameIntent) return currentTitle;
    if (explicitTitle) return explicitTitle;
    if (currentTitle) return currentTitle;
  }

  return explicitTitle || candidateTitle;
};

const normalizeModelResult = (result, fallbackResult, options = {}) => {
  const normalizedOptions = typeof options === 'string'
    ? { mode: options }
    : (options || {});
  const mode = normalizedOptions.mode === 'create' ? 'create' : 'edit';
  const isClearIntent = detectClearIntent(normalizedOptions.prompt);
  const titleFallback = result?.summary?.title || fallbackResult.summary.title;

  let snapshot = normalizeModelSnapshot(
    result?.snapshot || fallbackResult.snapshot,
    titleFallback,
  );

  if (mode === 'edit' && result?.snapshot) {
    snapshot = mergeEditSnapshot(normalizedOptions.currentSnapshot, result.snapshot, titleFallback, {
      resolvedTitle: resolveResultTitle({
        mode,
        prompt: normalizedOptions.prompt,
        currentSnapshot: normalizedOptions.currentSnapshot,
        result,
        snapshot,
        fallbackTitle: titleFallback,
      }),
    });
  }

  if (isClearIntent) {
    snapshot = createEmptySnapshot();
  } else if (typeof normalizedOptions.prompt === 'string' && normalizedOptions.prompt.trim()) {
    applyThemeByPrompt(snapshot, normalizedOptions.prompt, { defaultPreset: null });
  }

  const resolvedTitle = isClearIntent
    ? ''
    : resolveResultTitle({
      mode,
      prompt: normalizedOptions.prompt,
      currentSnapshot: normalizedOptions.currentSnapshot,
      result,
      snapshot,
      fallbackTitle: titleFallback,
    });

  if (!isClearIntent) {
    syncSnapshotTitle(snapshot, resolvedTitle);
  }

  const widgetTypes = Array.from(new Set(snapshot.widgets.map((item) => item.type)));

  return {
    reply: isClearIntent
      ? 'Cleared the current workspace and returned an empty snapshot.'
      : typeof result?.reply === 'string' && result.reply.trim() ? result.reply.trim() : fallbackResult.reply,
    reasoning: isClearIntent
      ? [
        {
          title: 'Task understanding',
          content: 'The request was treated as a clear-page action and forced into an empty dashboard snapshot.',
        },
        {
          title: 'Result shape',
          content: 'Returned the default empty DashboardSnapshot structure with no widgets or dashboard configuration.',
        },
      ]
      : Array.isArray(result?.reasoning) && result.reasoning.length
      ? result.reasoning
        .map((item) => ({
          title: String(item?.title || '').trim(),
          content: String(item?.content || '').trim(),
        }))
        .filter((item) => item.title && item.content)
        .slice(0, 4)
      : fallbackResult.reasoning,
    summary: {
      title: isClearIntent
        ? ''
        : String(resolvedTitle || snapshot.dashboardConfig?.title || fallbackResult.summary.title),
      widgetCount: snapshot.widgets.length,
      widgetTypes,
      mode,
    },
    snapshot,
  };
};

module.exports = {
  AI_WORKBENCH_RESPONSE_SCHEMA,
  normalizeModelResult,
};
