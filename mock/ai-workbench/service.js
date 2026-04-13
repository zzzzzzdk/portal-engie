const path = require('path');
const { LOCAL_CONFIG_PATH, PROVIDER_DEFINITIONS, readProviderConfig } = require('./providers/config');
const { callProvider, callProviderStreamPreview } = require('./providers');
const {
  buildPortalBuilderContext,
  buildStreamPreviewSystemPrompt,
  buildStreamPreviewUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  detectClearIntent,
  fallbackGenerateResult,
  serializeSelectedSectionsForPrompt,
  serializeSnapshotForPrompt,
} = require('./skills/portalBuilderRuntime');
const {
  AI_WORKBENCH_RESPONSE_SCHEMA,
  normalizeModelResult,
} = require('./validators/dashboardSnapshot');

const MAX_HISTORY_MESSAGES = 8;
const MAX_REPAIR_ISSUES = 5;

const AI_WORKBENCH_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'intent',
    'styleDirection',
    'layoutStrategy',
    'componentStrategy',
    'dataStrategy',
    'editStrategy',
    'qualityChecklist',
  ],
  properties: {
    intent: { type: 'string' },
    styleDirection: { type: 'string' },
    layoutStrategy: {
      type: 'array',
      items: { type: 'string' },
    },
    componentStrategy: {
      type: 'array',
      items: { type: 'string' },
    },
    dataStrategy: {
      type: 'array',
      items: { type: 'string' },
    },
    editStrategy: {
      type: 'array',
      items: { type: 'string' },
    },
    qualityChecklist: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

const trimHistory = (messages) =>
  (Array.isArray(messages) ? messages : [])
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-MAX_HISTORY_MESSAGES);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isModelJsonError = (error) =>
  error instanceof Error
  && (
    error.message.includes('Model response is not valid JSON.')
    || error.message.includes('Model response is empty.')
  );

const isRetriableUpstreamError = (error) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /(Upstream request failed:\s*(408|429|500|502|503|504)|timeout|timed out|abort|aborted)/i.test(message);
};

const listModels = () =>
  Object.keys(PROVIDER_DEFINITIONS).map((providerId) => {
    const config = readProviderConfig(providerId);
    return {
      id: config.id,
      name: config.name,
      provider: config.provider,
      description: config.description,
      recommended: config.recommended,
      configured: config.configured,
      configHint: config.configHint,
    };
  });

const dedupeReasoning = (steps) =>
  (Array.isArray(steps) ? steps : [])
    .map((item) => ({
      title: String(item?.title || '').trim(),
      content: String(item?.content || '').trim(),
    }))
    .filter((item) => item.title && item.content)
    .filter((item, index, collection) =>
      collection.findIndex((candidate) => candidate.title === item.title && candidate.content === item.content) === index)
    .slice(0, 4);

const buildCurrentSnapshotSummary = (snapshot) => ({
  title: snapshot?.dashboardConfig?.title || '',
  widgetCount: Array.isArray(snapshot?.widgets) ? snapshot.widgets.length : 0,
  widgetTypes: Array.isArray(snapshot?.widgets)
    ? Array.from(new Set(snapshot.widgets.map((item) => item?.type).filter(Boolean)))
    : [],
});

const serializeDraftResultForPrompt = (result) => ({
  reply: typeof result?.reply === 'string' ? result.reply : '',
  reasoning: Array.isArray(result?.reasoning) ? result.reasoning.slice(0, 4) : [],
  summary: result?.summary || {},
  snapshot: serializeSnapshotForPrompt(result?.snapshot),
});

const buildPlanningSystemPrompt = (prepared) => [
  'You are the planning stage for a Portal Engine dashboard generation pipeline.',
  'Return JSON only. Do not use markdown fences.',
  'Write concise, user-visible planning conclusions. Do not output hidden chain-of-thought.',
  `Current inferred intent: ${prepared.portalBuilderContext.intent}.`,
  'Use portal-builder references to ensure layout completeness, feature coverage, visual style direction, and mock data quality.',
  'Plan for the final result to be import-ready DashboardSnapshot JSON in a later generation stage.',
].join('\n');

const buildPlanningUserPrompt = (prepared) => JSON.stringify({
  task: prepared.prompt,
  mode: prepared.normalizedMode,
  conversationHistory: prepared.normalizedMessages,
  currentSnapshotSummary: buildCurrentSnapshotSummary(prepared.currentSnapshot),
  outputRequirements: {
    focus: [
      'layout completeness',
      'component coverage',
      'visual style direction',
      'mock data richness',
      'edit-or-rebuild strategy',
    ],
  },
});

const buildGenerationSystemPrompt = (prepared) => [
  buildSystemPrompt(prepared.portalBuilderContext),
  'You are in the generation stage of a multi-step pipeline.',
  'Produce a high-quality, visually complete, import-ready DashboardSnapshot.',
  'Include sufficiently rich mock data, clear regional hierarchy, and balanced layout spacing.',
].join('\n\n');

const buildGenerationUserPrompt = (prepared, plan) => JSON.stringify({
  task: prepared.prompt,
  mode: prepared.normalizedMode,
  currentDate: new Date().toISOString(),
  conversationHistory: prepared.normalizedMessages,
  currentSnapshot: serializeSnapshotForPrompt(prepared.currentSnapshot),
  activeSkill: 'portal-builder',
  plannerResult: plan,
  skillRuntime: {
    intent: prepared.portalBuilderContext.intent,
    requestedWidgetTypes: prepared.portalBuilderContext.requestedWidgetTypes,
    existingWidgetTypes: prepared.portalBuilderContext.existingWidgetTypes,
    selectedReferences: serializeSelectedSectionsForPrompt(prepared.portalBuilderContext.selectedSections),
  },
  outputRequirements: {
    replyLanguage: 'same_as_user',
    reasoningStepCountMax: 4,
    preserveCurrentSnapshotOnEdit: prepared.normalizedMode === 'edit',
    normalizeForCurrentRuntime: true,
    groupsDefaultEmpty: true,
    floatingModulesDefaultEmpty: true,
    prioritizeVisualCompleteness: true,
    prioritizeMockDataRichness: true,
  },
});

const buildRepairSystemPrompt = (prepared) => [
  buildSystemPrompt(prepared.portalBuilderContext),
  'You are in the repair stage of a multi-step pipeline.',
  'Return JSON only. Do not use markdown fences.',
  'Improve the provided draft result without dropping valid existing content.',
  'Fix completeness, layout balance, style richness, and mock data quality issues first.',
].join('\n\n');

const buildRepairUserPrompt = (prepared, plan, draftResult, issues) => JSON.stringify({
  task: prepared.prompt,
  mode: prepared.normalizedMode,
  plannerResult: plan,
  repairIssues: issues,
  currentSnapshot: serializeSnapshotForPrompt(prepared.currentSnapshot),
  draftResult: serializeDraftResultForPrompt(draftResult),
  outputRequirements: {
    preserveValidStructure: true,
    fixListedIssuesFirst: true,
    strengthenVisualConsistency: true,
    strengthenDataRichness: true,
    keepImportReadyDashboardSnapshot: true,
  },
});

const buildPlanReasoning = (plan) => {
  if (!plan) {
    return [];
  }

  return dedupeReasoning([
    {
      title: 'Plan',
      content: [
        plan.styleDirection,
        ...(Array.isArray(plan.layoutStrategy) ? plan.layoutStrategy.slice(0, 2) : []),
      ].filter(Boolean).join(' | '),
    },
    {
      title: 'Component strategy',
      content: Array.isArray(plan.componentStrategy)
        ? plan.componentStrategy.slice(0, 3).join(' | ')
        : '',
    },
    {
      title: 'Data strategy',
      content: Array.isArray(plan.dataStrategy)
        ? plan.dataStrategy.slice(0, 3).join(' | ')
        : '',
    },
  ]);
};

const assessSnapshotQuality = (result, prepared) => {
  if (detectClearIntent(prepared.prompt)) {
    return [];
  }

  const issues = [];
  const widgets = Array.isArray(result?.snapshot?.widgets) ? result.snapshot.widgets : [];
  const widgetTypes = new Set(widgets.map((item) => item?.type).filter(Boolean));
  const dashboardConfig = result?.snapshot?.dashboardConfig || {};
  const intent = prepared.portalBuilderContext.intent;
  const mode = prepared.normalizedMode;
  const prompt = String(prepared.prompt || '');

  const minWidgetCount = intent === 'dashboard'
    ? 5
    : intent === 'management'
      ? 3
      : 4;

  if (mode === 'create' && widgets.length < minWidgetCount) {
    issues.push(`Increase component coverage. Current widget count is ${widgets.length}, expected at least ${minWidgetCount}.`);
  }

  if ((mode === 'create' || intent !== 'clear') && !widgetTypes.has('headerBar')) {
    issues.push('Add a headerBar to improve structure and page identity.');
  }

  if (intent === 'dashboard' && !['stats', 'indicatorCard', 'chart', 'dataTable', 'topList'].some((type) => widgetTypes.has(type))) {
    issues.push('Add richer data-display components for the dashboard, such as stats, indicator cards, charts, tables, or ranking lists.');
  }

  if (intent === 'portal' && !['carousel', 'navGroup', 'news', 'richText'].some((type) => widgetTypes.has(type))) {
    issues.push('Add richer portal-style widgets such as carousel, navGroup, news, or richText.');
  }

  if (!dashboardConfig || Object.keys(dashboardConfig).length === 0) {
    issues.push('Complete dashboardConfig with visible page-level style settings.');
  }

  if (/(tech|digital|futur|cyber|\u79d1\u6280|\u6570\u5b57|\u8d5b\u535a|\u672a\u6765)/i.test(prompt) && !dashboardConfig.backgroundGradient) {
    issues.push('Strengthen the requested tech style with a visible page background gradient and stronger theme styling.');
  }

  const richDataWidgetCount = widgets.filter((widget) => {
    const config = widget?.config || {};
    return Array.isArray(config?.staticData)
      || Array.isArray(config?.slides)
      || Array.isArray(config?.queryFields)
      || Array.isArray(config?.columns)
      || (config?.staticData && typeof config.staticData === 'object');
  }).length;

  if (mode === 'create' && richDataWidgetCount < Math.min(2, widgets.length)) {
    issues.push('Add richer mock data to more widgets so the page feels complete instead of skeletal.');
  }
  return issues.slice(0, MAX_REPAIR_ISSUES);
};

const compareResults = (baseline, candidate, prepared) => {
  const baselineIssues = assessSnapshotQuality(baseline, prepared).length;
  const candidateIssues = assessSnapshotQuality(candidate, prepared).length;
  if (candidateIssues !== baselineIssues) {
    return candidateIssues < baselineIssues;
  }
  const baselineCount = baseline?.summary?.widgetCount || 0;
  const candidateCount = candidate?.summary?.widgetCount || 0;
  return candidateCount >= baselineCount;
};

const callStructuredStage = async ({
  prepared,
  stageName,
  systemPrompt,
  userPrompt,
  responseSchema,
  signal,
  tolerateJsonFailure = false,
  tolerateStageFailure = false,
  onStageStatus,
}) => {
  const tryCall = () => callProvider({
    config: prepared.config,
    systemPrompt,
    userPrompt,
    messages: prepared.normalizedMessages,
    responseSchema,
    signal,
  });

  try {
    return await tryCall();
  } catch (error) {
    if (!isModelJsonError(error)) {
      if (tolerateStageFailure && isRetriableUpstreamError(error)) {
        await onStageStatus?.(`${stageName} failed upstream and was skipped: ${error.message}`);
        return null;
      }
      throw error;
    }

    await onStageStatus?.(`${stageName} returned invalid JSON. Retrying once.`);

    try {
      return await tryCall();
    } catch (retryError) {
      if (!isModelJsonError(retryError)) {
        throw retryError;
      }
      if (tolerateJsonFailure) {
        await onStageStatus?.(`${stageName} still did not return valid JSON. Skipping this stage.`);
        return null;
      }
      throw retryError;
    }
  }
};

const prepareChatRequest = ({
  model = 'codex',
  prompt = '',
  mode = 'edit',
  currentSnapshot = null,
  messages = [],
  conversationId,
}) => {
  const config = readProviderConfig(model);
  if (!config) {
    const error = new Error(`Unknown model: ${model}`);
    error.statusCode = 400;
    throw error;
  }

  if (!config.configured) {
    const error = new Error(`${config.name} is not configured. Fill ${path.relative(process.cwd(), LOCAL_CONFIG_PATH)} or set environment variables.`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedMode = mode === 'create' ? 'create' : 'edit';
  const normalizedMessages = trimHistory(messages);
  const portalBuilderContext = buildPortalBuilderContext({
    prompt,
    mode: normalizedMode,
    currentSnapshot,
  });
  const systemPrompt = buildSystemPrompt(portalBuilderContext);
  const userPrompt = buildUserPrompt({
    prompt,
    mode: normalizedMode,
    currentSnapshot,
    messages: normalizedMessages,
    portalBuilderContext,
  });
  const fallbackResult = fallbackGenerateResult({
    prompt,
    mode: normalizedMode,
    currentSnapshot,
  });

  return {
    config,
    prompt,
    normalizedMode,
    currentSnapshot,
    normalizedMessages,
    conversationId: conversationId || `conversation-${Date.now()}`,
    portalBuilderContext,
    systemPrompt,
    userPrompt,
    legacySystemPrompt: systemPrompt,
    legacyUserPrompt: userPrompt,
    fallbackResult,
  };
};

const finalizeResult = (prepared, upstreamResult, plan, extraReasoning = []) => {
  const normalizedResult = {
    conversationId: prepared.conversationId,
    model: prepared.config.name,
    ...normalizeModelResult(upstreamResult, prepared.fallbackResult, {
      mode: prepared.normalizedMode,
      currentSnapshot: prepared.currentSnapshot,
      prompt: prepared.prompt,
    }),
  };

  normalizedResult.reasoning = dedupeReasoning([
    ...buildPlanReasoning(plan),
    ...extraReasoning,
    ...normalizedResult.reasoning,
  ]);

  return normalizedResult;
};

const executeSinglePassGeneration = async (prepared, options = {}) => {
  const { signal, onStatus, plan } = options;

  await onStatus?.('request', 'Upstream generation was slow. Switching to simplified single-pass generation.');
  const rawResult = await callStructuredStage({
    prepared,
    stageName: 'Single-pass generation',
    systemPrompt: prepared.legacySystemPrompt,
    userPrompt: prepared.legacyUserPrompt,
    responseSchema: AI_WORKBENCH_RESPONSE_SCHEMA,
    signal,
    tolerateJsonFailure: true,
    tolerateStageFailure: true,
    onStageStatus: async (message) => onStatus?.('validate', message),
  });

  return finalizeResult(prepared, rawResult, plan, [
    {
      title: 'Degrade',
      content: 'The upstream service was slow, so the workflow fell back to simplified single-pass generation.',
    },
  ]);
};

const executeChatPipeline = async (prepared, options = {}) => {
  const { signal, onStatus } = options;
  const isClearIntent = detectClearIntent(prepared.prompt);
  let plan = null;

  if (!isClearIntent) {
    await onStatus?.('request', 'Planning layout, style, and data strategy.');
    plan = await callStructuredStage({
      prepared,
      stageName: 'Planning stage',
      systemPrompt: buildPlanningSystemPrompt(prepared),
      userPrompt: buildPlanningUserPrompt(prepared),
      responseSchema: AI_WORKBENCH_PLAN_SCHEMA,
      signal,
      tolerateJsonFailure: true,
      tolerateStageFailure: true,
      onStageStatus: async (message) => onStatus?.('request', message),
    });
  }

  await onStatus?.('request', 'Generating structured DashboardSnapshot from the task, workspace context, and portal-builder references.');
  let upstreamResult;
  try {
    upstreamResult = await callStructuredStage({
      prepared,
      stageName: 'Generation stage',
      systemPrompt: buildGenerationSystemPrompt(prepared),
      userPrompt: buildGenerationUserPrompt(prepared, plan),
      responseSchema: AI_WORKBENCH_RESPONSE_SCHEMA,
      signal,
      tolerateJsonFailure: true,
      onStageStatus: async (message) => onStatus?.('validate', message),
    });
  } catch (error) {
    if (!isRetriableUpstreamError(error)) {
      throw error;
    }
    return executeSinglePassGeneration(prepared, { signal, onStatus, plan });
  }

  let normalizedResult = finalizeResult(prepared, upstreamResult, plan);

  const qualityIssues = assessSnapshotQuality(normalizedResult, prepared);

  if (qualityIssues.length && !isClearIntent) {
    await onStatus?.('validate', `Repairing result quality: ${qualityIssues.join(' | ')}`);
    const repairedRawResult = await callStructuredStage({
      prepared,
      stageName: 'Repair stage',
      systemPrompt: buildRepairSystemPrompt(prepared),
      userPrompt: buildRepairUserPrompt(prepared, plan, normalizedResult, qualityIssues),
      responseSchema: AI_WORKBENCH_RESPONSE_SCHEMA,
      signal,
      tolerateJsonFailure: true,
      tolerateStageFailure: true,
      onStageStatus: async (message) => onStatus?.('validate', message),
    });

    if (repairedRawResult) {
      const repairedResult = finalizeResult(prepared, repairedRawResult, plan, [
        {
          title: 'Repair',
          content: `Addressed quality issues: ${qualityIssues.join(' | ')}`,
        },
      ]);

      if (compareResults(normalizedResult, repairedResult, prepared)) {
        normalizedResult = repairedResult;
      }
    }
  }

  return normalizedResult;
};

const generateChatResult = async (payload, options = {}) => {
  const prepared = prepareChatRequest(payload);
  return executeChatPipeline(prepared, options);
};

const generateChatResultStream = async (payload, emit, options = {}) => {
  const { signal } = options;
  const prepared = prepareChatRequest(payload);
  const previewSystemPrompt = buildStreamPreviewSystemPrompt(prepared.portalBuilderContext);
  const previewUserPrompt = buildStreamPreviewUserPrompt({
    prompt: prepared.prompt,
    mode: prepared.normalizedMode,
    currentSnapshot: prepared.currentSnapshot,
    messages: prepared.normalizedMessages,
    portalBuilderContext: prepared.portalBuilderContext,
  });

  await emit('status', {
    phase: 'context',
    message: prepared.normalizedMode === 'create'
      ? '正在整理新页面生成所需的上下文'
      : '正在读取当前工作台并整理编辑上下文',
  });

  await emit('status', {
    phase: 'skill',
    message: '已装载 portal-builder skill，并按 SKILL.md 与 references 执行生成规则',
  });

  let streamedReasoningText = '';

  try {
    await callProviderStreamPreview({
      config: prepared.config,
      systemPrompt: previewSystemPrompt,
      userPrompt: previewUserPrompt,
      messages: prepared.normalizedMessages,
      signal,
      onTextDelta: async (delta) => {
        await emit('reply_delta', { delta });
      },
      onReasoningDelta: async (delta) => {
        streamedReasoningText += delta;
        await emit('thinking_delta', { delta });
      },
    });
  } catch (error) {
    await emit('status', {
      phase: 'request',
      message: `${prepared.config.name} 当前未返回可用的实时思考流，继续执行结构化生成流程`,
    });
  }

  const result = await executeChatPipeline(prepared, {
    signal,
    onStatus: async (phase, message) => {
      await emit('status', { phase, message });
    },
  });

  if (streamedReasoningText.trim()) {
    await emit('reasoning', {
      step: {
        title: '模型实时分析',
        content: streamedReasoningText.trim(),
      },
    });
  }

  for (const step of result.reasoning) {
    await emit('reasoning', { step });
    await wait(40);
  }

  await emit('status', {
    phase: 'finalize',
    message: `结果已就绪，正在整理 ${result.summary.widgetCount} 个组件并准备应用到工作台`,
  });

  await emit('result', result);
  await emit('done', { ok: true });

  return result;
};

module.exports = {
  listModels,
  generateChatResult,
  generateChatResultStream,
};
