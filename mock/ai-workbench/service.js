const {
  DEFAULT_AGENT,
  abortSession,
  consumeEventStream,
  ensureSession,
  isAbortError,
  listSessionMessages,
  safeJsonParse,
  sendPromptAsync,
} = require('./opencode-client');
const {
  createEmptySnapshot,
  fallbackGenerateResult,
  serializeSnapshotForPrompt,
} = require('./skills/portalBuilderRuntime');
const {
  AI_WORKBENCH_RESPONSE_SCHEMA,
  normalizeModelResult,
} = require('./validators/dashboardSnapshot');

const FIXED_ASSISTANT_ID = 'opencode-fixed-assistant';
const FIXED_ASSISTANT_NAME = process.env.AI_WORKBENCH_ASSISTANT_NAME || '工作台 AI 助手';
const ALLOW_LOCAL_FALLBACK = process.env.AI_WORKBENCH_OPENCODE_ALLOW_FALLBACK === 'true';
const HISTORY_LIMIT = 6;
const HISTORY_TEXT_LIMIT = 280;
const DEFAULT_STATUS_PHASES = ['context', 'skill', 'request', 'validate', 'finalize'];

const normalizeSnapshot = (snapshot) => {
  const baseSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : createEmptySnapshot();

  return {
    widgets: Array.isArray(baseSnapshot.widgets) ? baseSnapshot.widgets : [],
    groups: Array.isArray(baseSnapshot.groups) ? baseSnapshot.groups : [],
    floatingModules: Array.isArray(baseSnapshot.floatingModules) ? baseSnapshot.floatingModules : [],
    dashboardConfig:
      baseSnapshot.dashboardConfig && typeof baseSnapshot.dashboardConfig === 'object'
        ? baseSnapshot.dashboardConfig
        : {},
  };
};

const truncateText = (value, maxLength = HISTORY_TEXT_LIMIT) => {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
};

const trimHistory = (messages) =>
  (Array.isArray(messages) ? messages : [])
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-HISTORY_LIMIT)
    .map((item) => ({
      role: item.role,
      content: truncateText(item.content),
    }));

const dedupeReasoning = (steps) =>
  (Array.isArray(steps) ? steps : [])
    .map((item) => ({
      title: String(item?.title || '').trim(),
      content: String(item?.content || '').trim(),
    }))
    .filter((item) => item.title && item.content)
    .filter((item, index, collection) =>
      collection.findIndex((candidate) => candidate.title === item.title && candidate.content === item.content) === index)
    .slice(0, 6);

const buildSummaryFromSnapshot = (snapshot, mode, fallbackTitle = '') => ({
  title: String(snapshot?.dashboardConfig?.title || fallbackTitle || '').trim(),
  widgetCount: Array.isArray(snapshot?.widgets) ? snapshot.widgets.length : 0,
  widgetTypes: Array.isArray(snapshot?.widgets)
    ? Array.from(new Set(snapshot.widgets.map((item) => item?.type).filter(Boolean)))
    : [],
  mode: mode === 'create' ? 'create' : 'edit',
});

const normalizeSummary = (summary, snapshot, mode, fallbackTitle = '') => {
  const snapshotSummary = buildSummaryFromSnapshot(snapshot, mode, fallbackTitle);
  const nextSummary = summary && typeof summary === 'object'
    ? summary
    : typeof summary === 'string'
      ? { title: summary }
      : {};

  return {
    title: String(nextSummary.title || snapshotSummary.title || '').trim(),
    widgetCount: Number.isFinite(Number(nextSummary.widgetCount))
      ? Number(nextSummary.widgetCount)
      : snapshotSummary.widgetCount,
    widgetTypes: Array.isArray(nextSummary.widgetTypes) && nextSummary.widgetTypes.length
      ? nextSummary.widgetTypes.filter(Boolean)
      : snapshotSummary.widgetTypes,
    mode: nextSummary.mode === 'create' ? 'create' : nextSummary.mode === 'edit' ? 'edit' : snapshotSummary.mode,
  };
};

const parseSnapshotCandidate = (candidate) => {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === 'string') {
    const parsed = safeJsonParse(candidate, null);
    return parsed ? normalizeSnapshot(parsed) : null;
  }

  if (typeof candidate === 'object') {
    return normalizeSnapshot(candidate);
  }

  return null;
};

const parseStructuredCandidate = (candidate) => {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === 'string') {
    return safeJsonParse(candidate, null);
  }

  if (typeof candidate === 'object') {
    return candidate;
  }

  return null;
};

const extractSnapshotFromMessagePayload = (messagePayload) => {
  const artifact = messagePayload?.artifact && typeof messagePayload.artifact === 'object'
    ? messagePayload.artifact
    : {};
  const artifactPayload = artifact?.payload && typeof artifact.payload === 'object'
    ? artifact.payload
    : {};

  const candidates = [
    messagePayload?.snapshot,
    messagePayload?.dashboardSnapshot,
    artifact?.snapshot,
    artifactPayload?.snapshot,
    artifactPayload?.dashboardSnapshot,
    artifactPayload?.portalSnapshot,
    artifactPayload?.workspaceSnapshot,
    artifactPayload?.workspace?.snapshot,
    artifactPayload?.result?.snapshot,
    artifactPayload?.data?.snapshot,
  ];

  for (const candidate of candidates) {
    const snapshot = parseSnapshotCandidate(candidate);
    if (snapshot) {
      return snapshot;
    }
  }

  return null;
};

const extractPublishedPayload = (parts) => {
  const toolPart = [...(Array.isArray(parts) ? parts : [])]
    .reverse()
    .find((part) => part?.type === 'tool'
      && part?.tool === 'publish_message_payload'
      && part?.state?.status === 'completed'
      && typeof part?.state?.output === 'string');

  if (!toolPart) {
    return null;
  }

  return safeJsonParse(toolPart.state.output, null);
};

const extractReplyText = (parts) =>
  (Array.isArray(parts) ? parts : [])
    .filter((part) => part?.type === 'text' && part?.ignored !== true && part?.synthetic !== true)
    .map((part) => String(part?.text || ''))
    .join('')
    .trim();

const extractReasoningSteps = (parts) => dedupeReasoning(
  (Array.isArray(parts) ? parts : [])
    .filter((part) => part?.type === 'reasoning' && String(part?.text || '').trim())
    .map((part, index) => ({
      title: String(part?.metadata?.title || '').trim() || `推理 ${index + 1}`,
      content: String(part?.text || '').trim(),
    })),
);

const buildFallbackResult = ({
  sessionId,
  modelLabel,
  prompt,
  mode,
  currentSnapshot,
  replyText,
  reasoningSteps,
}) => {
  const fallback = fallbackGenerateResult({
    prompt,
    mode,
    currentSnapshot,
  });

  return {
    conversationId: sessionId,
    model: modelLabel,
    reply: replyText || fallback.reply,
    snapshotRecovered: true,
    reasoning: dedupeReasoning([
      ...reasoningSteps,
      ...fallback.reasoning,
    ]),
    snapshot: normalizeSnapshot(fallback.snapshot),
    summary: normalizeSummary(fallback.summary, fallback.snapshot, mode),
  };
};

const buildResultFromStructuredPayload = ({
  sessionId,
  structuredPayload,
  modelLabel,
  prompt,
  mode,
  currentSnapshot,
}) => {
  const fallback = fallbackGenerateResult({
    prompt,
    mode,
    currentSnapshot,
  });
  const normalized = normalizeModelResult(structuredPayload, fallback, {
    mode,
    prompt,
    currentSnapshot,
  });
  const normalizedSnapshot = parseSnapshotCandidate(normalized?.snapshot);

  return {
    conversationId: sessionId,
    model: modelLabel,
    reply: String(normalized?.reply || '').trim(),
    snapshotRecovered: Boolean(normalizedSnapshot),
    reasoning: dedupeReasoning(normalized?.reasoning),
    snapshot: normalizedSnapshot,
    summary: normalizedSnapshot
      ? normalizeSummary(
        normalized?.summary,
        normalizedSnapshot,
        mode,
        normalized?.summary?.title || normalizedSnapshot?.dashboardConfig?.title || '',
      )
      : null,
  };
};

const buildResultFromAssistantMessage = ({
  sessionId,
  assistantMessage,
  modelLabel,
  prompt,
  mode,
  currentSnapshot,
}) => {
  const structuredPayload = parseStructuredCandidate(assistantMessage?.info?.structured);
  if (structuredPayload) {
    return buildResultFromStructuredPayload({
      sessionId,
      structuredPayload,
      modelLabel,
      prompt,
      mode,
      currentSnapshot,
    });
  }

  const parts = Array.isArray(assistantMessage?.parts) ? assistantMessage.parts : [];
  const replyText = extractReplyText(parts);
  const reasoningSteps = extractReasoningSteps(parts);
  const publishedPayload = extractPublishedPayload(parts);

  if (!publishedPayload) {
    if (replyText) {
      return {
        conversationId: sessionId,
        model: modelLabel,
        reply: replyText,
        snapshotRecovered: false,
        reasoning: reasoningSteps,
        snapshot: null,
        summary: null,
      };
    }

    if (ALLOW_LOCAL_FALLBACK) {
      return buildFallbackResult({
        sessionId,
        modelLabel,
        prompt,
        mode,
        currentSnapshot,
        replyText,
        reasoningSteps,
      });
    }
    throw new Error('OpenCode 未返回 publish_message_payload，无法恢复工作台快照。');
  }

  if (publishedPayload.ok !== true) {
    const errorMessage = publishedPayload?.error?.message || 'OpenCode 正式结果发布失败。';
    throw new Error(errorMessage);
  }

  const messagePayload = publishedPayload?.message?.payload || {};
  const snapshot = extractSnapshotFromMessagePayload(messagePayload);

  if (!snapshot) {
    if (replyText) {
      return {
        conversationId: sessionId,
        model: modelLabel,
        reply: replyText,
        snapshotRecovered: false,
        reasoning: reasoningSteps,
        snapshot: null,
        summary: null,
      };
    }

    if (ALLOW_LOCAL_FALLBACK) {
      return buildFallbackResult({
        sessionId,
        modelLabel,
        prompt,
        mode,
        currentSnapshot,
        replyText,
        reasoningSteps,
      });
    }
    throw new Error('OpenCode 正式结果中未包含可用的工作台快照。');
  }

  const summary = normalizeSummary(
    messagePayload?.summary || messagePayload?.artifact?.summary,
    snapshot,
    mode,
    snapshot?.dashboardConfig?.title || '',
  );

  return {
    conversationId: sessionId,
    model: modelLabel,
    snapshotRecovered: true,
    reply: replyText || '已完成工作台更新。',
    reasoning: reasoningSteps,
    snapshot,
    summary,
  };
};

const buildModelLabel = (assistantInfo, fallbackLabel) => {
  const providerId = assistantInfo?.providerID || assistantInfo?.model?.providerID || '';
  const modelId = assistantInfo?.modelID || assistantInfo?.model?.modelID || assistantInfo?.model?.id || '';
  if (providerId && modelId) {
    return `${providerId}/${modelId}`;
  }

  if (assistantInfo?.model?.name) {
    return String(assistantInfo.model.name);
  }

  if (fallbackLabel) {
    return fallbackLabel;
  }

  return FIXED_ASSISTANT_NAME;
};

const resolveSessionIdFromEvent = (payload) =>
  payload?.properties?.sessionID
  || payload?.properties?.info?.sessionID
  || payload?.properties?.part?.sessionID
  || '';

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const loadLatestAssistantMessage = async (sessionId, preferredMessageId, signal, authorization) => {
  const messages = await listSessionMessages(sessionId, signal, authorization);
  const assistantMessages = (Array.isArray(messages) ? messages : [])
    .filter((item) => item?.info?.role === 'assistant');

  if (!assistantMessages.length) {
    throw new Error('OpenCode 会话中未找到 assistant 消息。');
  }

  const exactMatch = assistantMessages.find((item) => item?.info?.id === preferredMessageId);
  if (exactMatch) {
    return exactMatch;
  }

  return assistantMessages.sort((left, right) =>
    Number(right?.info?.time?.created || 0) - Number(left?.info?.time?.created || 0))[0];
};

const buildContextText = ({ prompt, mode, currentSnapshot, messages }) => {
  const normalizedSnapshot = normalizeSnapshot(currentSnapshot);
  const recentMessages = trimHistory(messages);
  const currentTitle = String(normalizedSnapshot?.dashboardConfig?.title || '').trim();

  return [
    'PORTAL_ENGINE_CONTEXT_V1',
    JSON.stringify({
      application: 'portal-engine',
      feature: 'workspace-ai-assistant',
      mode: mode === 'create' ? 'create' : 'edit',
      prompt: truncateText(prompt, 400),
      currentSnapshot: serializeSnapshotForPrompt(normalizedSnapshot),
      recentMessages,
      titleRules: {
        currentTitle,
        preserveExistingTitleOnEdit: Boolean(currentTitle),
        renameOnlyWhenUserExplicitlyRequests: true,
        keepSummaryTitleAlignedWithSnapshotTitle: true,
      },
      requiredResult: {
        responseLanguage: 'zh-CN',
        transport: 'json_schema',
        keys: ['reply', 'reasoning', 'summary', 'snapshot'],
        payload: '请在正式 payload 中返回可直接应用的 DashboardSnapshot',
        snapshotShape: ['widgets', 'groups', 'floatingModules', 'dashboardConfig'],
        titlePolicy: {
          create: '用户明确指定标题时必须使用该标题，否则才允许推断标题。',
          edit: '如果 currentSnapshot.dashboardConfig.title 非空，默认必须保留原标题，除非用户明确要求重命名页面。',
          alignment: 'summary.title、snapshot.dashboardConfig.title 和头部标题文案必须保持一致。',
        },
      },
    }),
  ].join('\n');
};

const buildPromptParts = ({ prompt, mode, currentSnapshot, messages }) => ([
  {
    type: 'text',
    synthetic: true,
    text: buildContextText({ prompt, mode, currentSnapshot, messages }),
  },
  {
    type: 'text',
    text: String(prompt || '').trim(),
  },
]);

const buildSystemPrompt = () => [
  '你是 Portal Engine 工作台 AI 助手。',
  '当用户请求创建或编辑页面时，优先使用 portal-builder skill 生成可直接应用的 DashboardSnapshot。',
  '必须严格按照 json_schema 返回 reply、reasoning、summary、snapshot 四个字段。',
  'reasoning 只能输出面向用户的简短摘要，不要输出隐藏思维。',
  '标题规则是强约束。',
  '编辑模式下，如果 currentSnapshot.dashboardConfig.title 已有值，默认必须保留原标题，除非用户明确要求改标题或重命名页面。',
  '用户只是修改布局、主题、组件、样式、数据时，不得默认改页面标题。',
  'summary.title、snapshot.dashboardConfig.title、页面头部标题必须保持一致。',
].join('\n');

const resolveToolPhase = (toolName) => {
  if (toolName === 'publish_message_payload') {
    return 'validate';
  }
  if (/validate|readiness|context_patch/i.test(toolName)) {
    return 'validate';
  }
  if (/skill|modeling|knowledge|query|schema|resource|retrieval/i.test(toolName)) {
    return 'skill';
  }
  return 'request';
};

const normalizePhase = (phase) =>
  DEFAULT_STATUS_PHASES.includes(phase) ? phase : 'request';

const pickFirstText = (...values) => {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) {
      return text;
    }
  }
  return '';
};

const extractErrorText = (candidate) => {
  if (typeof candidate === 'string') {
    return candidate.trim();
  }

  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const message = extractErrorText(item);
      if (message) {
        return message;
      }
    }
    return '';
  }

  if (!candidate || typeof candidate !== 'object') {
    return '';
  }

  const error =
    candidate.error && typeof candidate.error === 'object'
      ? candidate.error
      : {};
  const detail = candidate.detail;
  const body = candidate.body;
  const response = candidate.response;
  const cause = candidate.cause;
  const message = pickFirstText(
    candidate.message,
    error.message,
    typeof detail === 'string' ? detail : '',
    candidate.error_message,
    candidate.msg,
  );

  if (message) {
    const errorType = pickFirstText(
      candidate.type,
      error.type,
      candidate.errorType,
      candidate.__type,
    );
    if (errorType && !message.toLowerCase().includes(errorType.toLowerCase())) {
      return `${errorType}: ${message}`;
    }
    return message;
  }

  for (const nested of [detail, body, response, cause, error]) {
    const nestedMessage = extractErrorText(nested);
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return '';
};

const buildStreamErrorPayload = (
  error,
  conversationId = '',
  fallbackMessage = 'OpenCode 会话执行失败。',
) => {
  const rawPayload = error instanceof Error ? error.payload : null;
  const payload =
    rawPayload && typeof rawPayload === 'object'
      ? rawPayload
      : error && typeof error === 'object' && !(error instanceof Error)
        ? error
        : {};
  const nestedError =
    payload.error && typeof payload.error === 'object'
      ? payload.error
      : {};
  const message = pickFirstText(
    extractErrorText(error),
    extractErrorText(payload),
    extractErrorText(nestedError),
    error instanceof Error ? error.message : '',
    fallbackMessage,
  );
  const errorType = pickFirstText(
    payload.type,
    nestedError.type,
    payload.errorType,
    payload.__type,
  );
  const code = pickFirstText(
    payload.code,
    nestedError.code,
    payload.statusCode,
    nestedError.statusCode,
    error instanceof Error ? error.statusCode : '',
  );
  const details =
    payload && Object.keys(payload).length
      ? payload
      : error instanceof Error
        ? { message: error.message }
        : null;

  const response = {
    message: message || fallbackMessage,
    conversationId: conversationId || String(payload.conversationId || '').trim(),
  };
  if (errorType) {
    response.type = errorType;
  }
  if (code) {
    response.code = code;
  }
  if (details) {
    response.details = details;
  }
  return response;
};

const createStatusEmitter = (emit) => {
  const seen = new Set();

  return async (phase, message) => {
    const normalizedPhase = normalizePhase(phase);
    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) {
      return;
    }

    const fingerprint = `${normalizedPhase}:${normalizedMessage}`;
    if (seen.has(fingerprint)) {
      return;
    }

    seen.add(fingerprint);
    await emit('status', {
      phase: normalizedPhase,
      message: normalizedMessage,
    });
  };
};

const runOpenCodeConversation = async (payload, emit, options = {}) => {
  const { signal, authorization } = options;
  const prompt = String(payload?.prompt || '').trim();

  if (!prompt) {
    throw new Error('Prompt cannot be empty.');
  }

  const mode = payload?.mode === 'create' ? 'create' : 'edit';
  const currentSnapshot = normalizeSnapshot(payload?.currentSnapshot);
  const title = prompt.slice(0, 24) || FIXED_ASSISTANT_NAME;
  const status = createStatusEmitter(emit);
  const session = await ensureSession({
    sessionId: String(payload?.conversationId || '').trim(),
    title,
    signal,
    authorization,
  });

  await status('context', session?.id === payload?.conversationId
    ? '已复用 OpenCode 会话，继续当前工作台对话。'
    : '已创建 OpenCode 会话，准备提交工作台请求。');

  const deferred = createDeferred();
  const eventController = new AbortController();
  const state = {
    settled: false,
    promptSubmitted: false,
    assistantSeen: false,
    sessionIdle: false,
    assistantMessageId: '',
    modelLabel: '',
    partTypes: new Map(),
  };

  const settleResolve = (value) => {
    if (state.settled) {
      return;
    }
    state.settled = true;
    deferred.resolve(value);
  };

  const settleReject = (error) => {
    if (state.settled) {
      return;
    }
    state.settled = true;
    deferred.reject(error);
  };

  const closeEventStream = () => {
    eventController.abort();
  };

  const abortInFlightSession = async () => {
    closeEventStream();
    await abortSession(session.id, authorization);
  };

  const tryResolveFinalResult = async () => {
    if (state.settled || !state.sessionIdle || !state.assistantSeen) {
      return;
    }

    try {
      await status('validate', '正在解析 OpenCode 正式结果。');
      const latestAssistantMessage = await loadLatestAssistantMessage(
        session.id,
        state.assistantMessageId,
        signal,
        authorization,
      );
      const result = buildResultFromAssistantMessage({
        sessionId: session.id,
        assistantMessage: latestAssistantMessage,
        modelLabel: state.modelLabel || FIXED_ASSISTANT_NAME,
        prompt,
        mode,
        currentSnapshot,
      });

      if (result.snapshotRecovered && result.summary) {
        await status(
          'finalize',
          `结果已就绪，包含 ${result.summary.widgetCount} 个组件，准备应用到工作台。`,
        );
      } else {
        await status('finalize', 'OpenCode 已返回文本回复，未包含工作台快照。');
      }
      settleResolve(result);
    } catch (error) {
      settleReject(error);
    }
  };

  const abortHandler = () => {
    abortInFlightSession().catch(() => null);
    settleReject(new DOMException('Aborted', 'AbortError'));
  };

  if (signal) {
    if (signal.aborted) {
      abortHandler();
    } else {
      signal.addEventListener('abort', abortHandler, { once: true });
    }
  }

  const eventPromise = consumeEventStream({
    signal: eventController.signal,
    authorization,
    onEvent: async (eventPayload) => {
      const eventType = String(eventPayload?.type || '');
      const eventSessionId = resolveSessionIdFromEvent(eventPayload);

      if (!eventType || eventSessionId !== session.id || state.settled) {
        return;
      }

      if (eventType === 'session.error') {
        const errorPayload = buildStreamErrorPayload(
          eventPayload?.properties,
          session.id,
          'OpenCode 会话执行失败。',
        );
        const error = new Error(errorPayload.message);
        error.payload = errorPayload;
        settleReject(error);
        return;
      }

      if (eventType === 'session.idle') {
        state.sessionIdle = true;
        await status('finalize', 'OpenCode 当前回合已结束，正在整理结果。');
        await tryResolveFinalResult();
        return;
      }

      if (eventType === 'message.updated') {
        const info = eventPayload?.properties?.info || {};

        if (info?.role !== 'assistant') {
          return;
        }

        state.assistantSeen = true;
        state.assistantMessageId = String(info?.id || state.assistantMessageId || '');
        state.modelLabel = buildModelLabel(info, state.modelLabel);

        if (info?.error) {
          const errorPayload = buildStreamErrorPayload(
            info.error,
            session.id,
            'OpenCode 返回消息失败。',
          );
          const error = new Error(errorPayload.message);
          error.payload = errorPayload;
          settleReject(error);
          return;
        }

        if (!info?.time?.completed) {
          await status('request', 'OpenCode 已开始生成工作台回复。');
          return;
        }

        await status('finalize', 'OpenCode 回复已完成，等待会话收口。');
        await tryResolveFinalResult();
        return;
      }

      if (eventType === 'message.part.updated') {
        const part = eventPayload?.properties?.part || {};
        if (state.assistantMessageId && part?.messageID !== state.assistantMessageId) {
          return;
        }

        if (part?.id && part?.type) {
          state.partTypes.set(part.id, part.type);
        }

        if (part?.type === 'agent') {
          await status('skill', `已进入 agent：${part?.name || 'unknown'}`);
          return;
        }

        if (part?.type === 'subtask') {
          await status('skill', `已委派子任务：${part?.description || part?.agent || 'unknown'}`);
          return;
        }

        if (part?.type === 'step-start') {
          await status('request', 'OpenCode 正在执行当前回合。');
          return;
        }

        if (part?.type === 'step-finish') {
          await status('request', `当前步骤已完成：${part?.reason || 'completed'}`);
          return;
        }

        if (part?.type === 'tool') {
          const toolName = String(part?.tool || '').trim();
          const toolStatus = String(part?.state?.status || '').trim();
          const toolTitle = String(part?.state?.title || toolName || '').trim();

          if (!toolName || !toolStatus) {
            return;
          }

          if (toolName === 'publish_message_payload') {
            if (toolStatus === 'running') {
              await status('validate', '正在发布正式结果。');
            }
            if (toolStatus === 'completed') {
              await status('finalize', '正式结果已发布，等待收口。');
            }
            if (toolStatus === 'error') {
              await status('validate', `正式结果发布失败：${toolTitle || toolName}`);
            }
            return;
          }

          if (toolStatus === 'running') {
            await status(resolveToolPhase(toolName), `执行中：${toolTitle || toolName}`);
          }
          if (toolStatus === 'completed') {
            await status(resolveToolPhase(toolName), `已完成：${toolTitle || toolName}`);
          }
          if (toolStatus === 'error') {
            await status('validate', `工具失败：${toolTitle || toolName}`);
          }
        }
        return;
      }

      if (eventType === 'message.part.delta') {
        const delta = eventPayload?.properties || {};
        if (state.assistantMessageId && delta?.messageID !== state.assistantMessageId) {
          return;
        }

        const partType = state.partTypes.get(delta?.partID);
        if (partType === 'text' && delta?.field === 'text') {
          await emit('reply_delta', {
            delta: String(delta?.delta || ''),
          });
          return;
        }

        if (partType === 'reasoning' && delta?.field === 'text') {
          await emit('thinking_delta', {
            delta: String(delta?.delta || ''),
          });
        }
      }
    },
  }).catch((error) => {
    if (!state.settled && !isAbortError(error)) {
      settleReject(error);
    }
  });

  try {
    const model = await sendPromptAsync({
      sessionId: session.id,
      parts: buildPromptParts({
        prompt,
        mode,
        currentSnapshot,
        messages: payload?.messages,
      }),
      format: {
        type: 'json_schema',
        schema: AI_WORKBENCH_RESPONSE_SCHEMA,
      },
      system: buildSystemPrompt(),
      signal,
      authorization,
    });

    state.promptSubmitted = true;
    state.modelLabel = model?.label || FIXED_ASSISTANT_NAME;
    await status('request', `请求已提交到 OpenCode，固定模型 ${state.modelLabel}。`);

    const result = await deferred.promise;
    closeEventStream();
    await eventPromise.catch(() => null);
    return result;
  } catch (error) {
    if (state.promptSubmitted && !state.sessionIdle) {
      await abortInFlightSession();
    } else {
      closeEventStream();
    }
    await eventPromise.catch(() => null);
    throw error;
  } finally {
    if (signal) {
      signal.removeEventListener('abort', abortHandler);
    }
  }
};

const listModels = () => [{
  id: FIXED_ASSISTANT_ID,
  name: FIXED_ASSISTANT_NAME,
  provider: 'opencode',
  description: DEFAULT_AGENT
    ? `固定接入 OpenCode agent：${DEFAULT_AGENT}`
    : '固定接入 OpenCode 默认 agent 与 skill 链路',
  recommended: true,
  isDefault: true,
  configured: true,
  configHint: '',
}];

const generateChatResult = async (payload, options = {}) => {
  return runOpenCodeConversation(payload, async () => {}, options);
};

const generateChatResultStream = async (payload, emit, options = {}) => {
  const result = await runOpenCodeConversation(payload, emit, options);
  await emit('result', result);
  await emit('done', { ok: true });
  return result;
};

module.exports = {
  buildStreamErrorPayload,
  listModels,
  generateChatResult,
  generateChatResultStream,
};
