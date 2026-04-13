const REQUEST_TIMEOUT_MS = 120000;

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const createTimeoutSignal = (timeoutMs, parentSignal) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromParent = () => controller.abort();

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      if (parentSignal) {
        parentSignal.removeEventListener('abort', abortFromParent);
      }
    },
  };
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

const resolveRequestUrl = (baseUrl, pathOrUrl, fallbackPath) => {
  const raw = String(pathOrUrl || fallbackPath || '').trim();
  if (!raw) {
    return baseUrl;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  if (!baseUrl) {
    return raw;
  }
  const normalizedBase = String(baseUrl).replace(/\/+$/, '');
  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
  return `${normalizedBase}${normalizedPath}`;
};

const resolveApiStyle = (config, requestType = 'request') =>
  requestType === 'stream'
    ? (config.streamApiStyle || config.apiStyle)
    : (config.requestApiStyle || config.apiStyle);

const buildAuthHeaders = (config, apiStyle, extraHeaders = {}) => {
  const headers = { ...extraHeaders };
  const authStyle = String(
    config.authStyle || (apiStyle === 'anthropic-messages' ? 'x-api-key' : 'bearer'),
  ).toLowerCase();

  if (!config.apiKey || authStyle === 'none') {
    return headers;
  }

  if (authStyle === 'x-api-key') {
    headers['x-api-key'] = config.apiKey;
    return headers;
  }

  headers.Authorization = `Bearer ${config.apiKey}`;
  return headers;
};

const buildJsonHeaders = (config, apiStyle, extraHeaders = {}) =>
  buildAuthHeaders(config, apiStyle, {
    'Content-Type': 'application/json',
    ...(config.extraHeaders || {}),
    ...extraHeaders,
  });

const resolveTemperature = (config) => {
  const parsed = Number(config.temperature);
  return Number.isFinite(parsed) ? parsed : 0.2;
};

const resolveMaxTokens = (config, fallback = undefined) => {
  const parsed = Number(config.maxTokens);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildOpenAIChatResponseFormat = (config, responseSchema) => {
  if (!responseSchema) return undefined;
  const responseFormat = String(config.responseFormat || 'none').toLowerCase();

  if (responseFormat === 'json_schema') {
    return {
      type: 'json_schema',
      json_schema: {
        name: 'ai_workbench_result',
        strict: true,
        schema: responseSchema,
      },
    };
  }

  if (responseFormat === 'json_object') {
    return { type: 'json_object' };
  }

  return undefined;
};

const extractTextFromAnthropic = (payload) =>
  Array.isArray(payload?.content)
    ? payload.content
      .filter((item) => item?.type === 'text' && typeof item?.text === 'string')
      .map((item) => item.text)
      .join('\n')
    : '';

const extractTextFromOpenAIResponse = (payload) =>
  payload?.output_text ||
  payload?.output?.map?.((item) => item?.content?.map?.((part) => part?.text).join('')).join('\n') ||
  payload?.response?.output_text ||
  payload?.response?.output?.map?.((item) => item?.content?.map?.((part) => part?.text).join('')).join('\n') ||
  '';

const extractJsonObject = (text) => {
  const normalized = String(text || '').trim();
  if (!normalized) {
    throw new Error('Model response is empty.');
  }

  const withoutFence = normalized
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const direct = safeJsonParse(withoutFence);
  if (direct) {
    return direct;
  }

  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const maybeJson = withoutFence.slice(firstBrace, lastBrace + 1);
    const parsed = safeJsonParse(maybeJson);
    if (parsed) {
      return parsed;
    }
  }

  throw new Error('Model response is not valid JSON.');
};

const createOpenAIChatBody = ({ config, systemPrompt, userPrompt, messages, responseSchema, stream = false }) => {
  const body = {
    model: config.model,
    temperature: resolveTemperature(config),
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((item) => ({
        role: item.role,
        content: item.content,
      })),
      { role: 'user', content: userPrompt },
    ],
  };

  const maxTokens = resolveMaxTokens(config);
  if (typeof maxTokens === 'number') {
    body.max_tokens = maxTokens;
  }

  if (!stream) {
    const responseFormat = buildOpenAIChatResponseFormat(config, responseSchema);
    if (responseFormat) {
      body.response_format = responseFormat;
    }
  }

  return body;
};

const streamSseResponse = async (response, onEvent) => {
  if (!response.body) {
    throw new Error('Streaming response body is empty.');
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

    for (const event of parsed.events) {
      await onEvent(event);
    }
  }
};

const callOpenAICompatibleChat = async ({ config, systemPrompt, userPrompt, messages, responseSchema, signal }) => {
  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS, signal);
  try {
    const response = await fetch(resolveRequestUrl(config.baseUrl, config.chatPath, '/chat/completions'), {
      method: 'POST',
      headers: buildJsonHeaders(config, 'openai-chat'),
      body: JSON.stringify(createOpenAIChatBody({ config, systemPrompt, userPrompt, messages, responseSchema })),
      signal: timeout.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.message || `Upstream request failed: ${response.status}`);
    }
    const text = payload?.choices?.[0]?.message?.content;
    return extractJsonObject(text);
  } finally {
    timeout.clear();
  }
};

const callOpenAICompatibleChatStream = async ({ config, systemPrompt, userPrompt, messages, onTextDelta, signal }) => {
  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS, signal);
  let fullText = '';

  try {
    const response = await fetch(resolveRequestUrl(config.baseUrl, config.chatPath, '/chat/completions'), {
      method: 'POST',
      headers: buildJsonHeaders(config, 'openai-chat'),
      body: JSON.stringify({
        ...createOpenAIChatBody({ config, systemPrompt, userPrompt, messages, stream: true }),
        stream: true,
      }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error?.message || payload?.message || `Upstream request failed: ${response.status}`);
    }

    await streamSseResponse(response, async ({ data }) => {
      if (data === '[DONE]') {
        return;
      }
      const payload = safeJsonParse(data, {});
      const delta = payload?.choices?.[0]?.delta;
      const text = Array.isArray(delta?.content)
        ? delta.content.map((item) => item?.text || item?.content || '').join('')
        : typeof delta?.content === 'string'
          ? delta.content
          : '';
      if (text) {
        fullText += text;
        await onTextDelta?.(text);
      }
    });

    return fullText;
  } finally {
    timeout.clear();
  }
};

const callOpenAIResponses = async ({ config, systemPrompt, userPrompt, messages, responseSchema, signal }) => {
  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS, signal);
  try {
    const requestBody = {
      model: config.model,
      temperature: resolveTemperature(config),
      input: [
        { role: 'system', content: systemPrompt },
        ...messages.map((item) => ({ role: item.role, content: item.content })),
        { role: 'user', content: userPrompt },
      ],
      text: responseSchema ? {
        format: {
          type: 'json_schema',
          name: 'ai_workbench_result',
          strict: true,
          schema: responseSchema,
        },
      } : undefined,
    };
    const maxTokens = resolveMaxTokens(config);
    if (typeof maxTokens === 'number') {
      requestBody.max_output_tokens = maxTokens;
    }

    const response = await fetch(resolveRequestUrl(config.baseUrl, config.responsesPath, '/responses'), {
      method: 'POST',
      headers: buildJsonHeaders(config, 'openai-responses'),
      body: JSON.stringify(requestBody),
      signal: timeout.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.message || `Upstream request failed: ${response.status}`);
    }
    const text =
      payload?.output_text ||
      payload?.output?.map?.((item) => item?.content?.map?.((part) => part?.text).join('')).join('\n') ||
      '';
    return extractJsonObject(text);
  } finally {
    timeout.clear();
  }
};

const callOpenAIResponsesStream = async ({
  config,
  systemPrompt,
  userPrompt,
  messages,
  onTextDelta,
  onReasoningDelta,
  signal,
}) => {
  const createBody = (includeReasoningSummary) => ({
    model: config.model,
    temperature: resolveTemperature(config),
    stream: true,
    ...(typeof resolveMaxTokens(config) === 'number' ? { max_output_tokens: resolveMaxTokens(config) } : {}),
    ...(includeReasoningSummary ? {
      reasoning: {
        summary: 'auto',
      },
    } : {}),
    input: [
      { role: 'system', content: systemPrompt },
      ...messages.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: userPrompt },
    ],
  });

  const requestStream = async (includeReasoningSummary) => {
    const response = await fetch(resolveRequestUrl(config.baseUrl, config.responsesPath, '/responses'), {
      method: 'POST',
      headers: buildJsonHeaders(config, 'openai-responses'),
      body: JSON.stringify(createBody(includeReasoningSummary)),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(payload?.error?.message || payload?.message || `Upstream request failed: ${response.status}`);
      error.statusCode = response.status;
      throw error;
    }

    return response;
  };

  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS, signal);
  let fullText = '';

  try {
    let response;
    try {
      response = await requestStream(true);
    } catch (error) {
      response = await requestStream(false);
    }

    await streamSseResponse(response, async ({ data }) => {
      if (data === '[DONE]') {
        return;
      }

      const payload = safeJsonParse(data, {});
      const type = String(payload?.type || '');

      if (type === 'response.output_text.delta' && payload?.delta) {
        fullText += payload.delta;
        await onTextDelta?.(payload.delta);
        return;
      }

      if ((type === 'response.reasoning_summary_text.delta' || type === 'response.reasoning_text.delta') && payload?.delta) {
        await onReasoningDelta?.(payload.delta);
        return;
      }

      if ((type === 'response.completed' || type === 'response.output_item.done') && !fullText) {
        fullText = extractTextFromOpenAIResponse(payload) || fullText;
      }

      if (type === 'error') {
        throw new Error(payload?.error?.message || payload?.message || 'Upstream streaming request failed.');
      }
    });

    return fullText;
  } finally {
    timeout.clear();
  }
};

const callAnthropicMessages = async ({ config, systemPrompt, userPrompt, messages, signal }) => {
  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS, signal);
  try {
    const response = await fetch(resolveRequestUrl(config.baseUrl, config.messagesPath, '/v1/messages'), {
      method: 'POST',
      headers: buildJsonHeaders(config, 'anthropic-messages', {
        'anthropic-version': config.anthropicVersion || '2023-06-01',
      }),
      body: JSON.stringify({
        model: config.model,
        max_tokens: resolveMaxTokens(config, 4096),
        temperature: resolveTemperature(config),
        system: systemPrompt,
        messages: [
          ...messages.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: timeout.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.message || `Upstream request failed: ${response.status}`);
    }
    return extractJsonObject(extractTextFromAnthropic(payload));
  } finally {
    timeout.clear();
  }
};

const callAnthropicMessagesStream = async ({
  config,
  systemPrompt,
  userPrompt,
  messages,
  onTextDelta,
  onReasoningDelta,
  signal,
}) => {
  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS, signal);
  let fullText = '';

  try {
    const response = await fetch(resolveRequestUrl(config.baseUrl, config.messagesPath, '/v1/messages'), {
      method: 'POST',
      headers: buildJsonHeaders(config, 'anthropic-messages', {
        'anthropic-version': config.anthropicVersion || '2023-06-01',
      }),
      body: JSON.stringify({
        model: config.model,
        max_tokens: resolveMaxTokens(config, 4096),
        temperature: resolveTemperature(config),
        stream: true,
        system: systemPrompt,
        messages: [
          ...messages.map((item) => ({
            role: item.role,
            content: item.content,
          })),
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error?.message || payload?.message || `Upstream request failed: ${response.status}`);
    }

    await streamSseResponse(response, async ({ event, data }) => {
      if (data === '[DONE]') {
        return;
      }

      const payload = safeJsonParse(data, {});
      const type = String(payload?.type || event || '');
      const deltaType = String(payload?.delta?.type || '');
      const textDelta = payload?.delta?.text || '';
      const thinkingDelta = payload?.delta?.thinking || payload?.delta?.text || '';

      if ((type === 'content_block_delta' || type === 'message_delta') && deltaType === 'text_delta' && textDelta) {
        fullText += textDelta;
        await onTextDelta?.(textDelta);
        return;
      }

      if ((type === 'content_block_delta' || type === 'message_delta') && deltaType === 'thinking_delta' && thinkingDelta) {
        await onReasoningDelta?.(thinkingDelta);
      }
    });

    return fullText;
  } finally {
    timeout.clear();
  }
};

const callProvider = async ({ config, systemPrompt, userPrompt, messages, responseSchema, signal }) => {
  const apiStyle = resolveApiStyle(config, 'request');
  if (apiStyle === 'anthropic-messages') {
    return callAnthropicMessages({ config, systemPrompt, userPrompt, messages, signal });
  }
  if (apiStyle === 'openai-responses') {
    return callOpenAIResponses({ config, systemPrompt, userPrompt, messages, responseSchema, signal });
  }
  return callOpenAICompatibleChat({ config, systemPrompt, userPrompt, messages, responseSchema, signal });
};

const callProviderStreamPreview = async ({
  config,
  systemPrompt,
  userPrompt,
  messages,
  onTextDelta,
  onReasoningDelta,
  signal,
}) => {
  const apiStyle = resolveApiStyle(config, 'stream');
  if (apiStyle === 'anthropic-messages') {
    return callAnthropicMessagesStream({ config, systemPrompt, userPrompt, messages, onTextDelta, onReasoningDelta, signal });
  }
  if (apiStyle === 'openai-responses') {
    return callOpenAIResponsesStream({ config, systemPrompt, userPrompt, messages, onTextDelta, onReasoningDelta, signal });
  }
  return callOpenAICompatibleChatStream({ config, systemPrompt, userPrompt, messages, onTextDelta, signal });
};

module.exports = {
  callProvider,
  callProviderStreamPreview,
};
