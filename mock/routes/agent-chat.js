const express = require('express');
const {
  buildStreamErrorPayload,
  generateChatResultStream,
} = require('../ai-workbench/service');

const router = express.Router();

const conversations = new Map();
const activeRequests = new Map();

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const nowString = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const writeSseEvent = (res, event, payload) => {
  if (res.writableEnded) {
    return;
  }
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const resolveForwardAuthorization = (req) => {
  const authorization = req?.headers?.authorization;
  return typeof authorization === 'string' ? authorization.trim() : '';
};

const ensureConversation = (conversationId, title = '') => {
  if (conversationId && conversations.has(conversationId)) {
    const existing = conversations.get(conversationId);
    if (title) {
      existing.title = title;
    }
    existing.updatedAt = nowString();
    return existing;
  }

  const id = conversationId || createId('conversation');
  const now = nowString();
  const record = {
    id,
    title: title || 'AI 会话',
    status: 'active',
    upstreamSessionId: id,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  conversations.set(id, record);
  return record;
};

const syncConversationId = (previousConversationId, nextConversationId, title = '') => {
  const normalizedNextId = String(nextConversationId || '').trim();
  if (!normalizedNextId) {
    return ensureConversation(previousConversationId, title);
  }

  const existingNext = conversations.get(normalizedNextId);
  const previous = previousConversationId ? conversations.get(previousConversationId) : null;
  const target = existingNext || previous || ensureConversation(normalizedNextId, title);

  target.id = normalizedNextId;
  target.upstreamSessionId = normalizedNextId;
  target.title = title || target.title || 'AI 会话';
  target.updatedAt = nowString();
  target.messages = (Array.isArray(target.messages) ? target.messages : []).map((item) => ({
    ...item,
    conversationId: normalizedNextId,
  }));

  if (previousConversationId && previousConversationId !== normalizedNextId) {
    conversations.delete(previousConversationId);
  }
  conversations.set(normalizedNextId, target);

  if (previousConversationId && previousConversationId !== normalizedNextId && activeRequests.has(previousConversationId)) {
    const controller = activeRequests.get(previousConversationId);
    activeRequests.delete(previousConversationId);
    activeRequests.set(normalizedNextId, controller);
  }

  return target;
};

const pushMessage = (conversation, role, content, extra = {}) => {
  const message = {
    id: createId(role),
    conversationId: conversation.id,
    role,
    content,
    status: extra.status || 'completed',
    sequence: conversation.messages.length + 1,
    upstreamMessageId: extra.upstreamMessageId || null,
    errorMessage: extra.errorMessage || null,
    model: extra.model || '',
    snapshotRecovered: extra.snapshotRecovered !== false,
    reasoning: Array.isArray(extra.reasoning) ? extra.reasoning : [],
    summary: extra.summary || null,
    snapshot: extra.snapshot || null,
    createdAt: nowString(),
  };

  conversation.messages.push(message);
  conversation.lastMessageAt = message.createdAt;
  conversation.updatedAt = message.createdAt;
  return message;
};

router.get('/v1/agent-chat/conversations', async (req, res) => {
  const data = Array.from(conversations.values())
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      upstreamSessionId: item.upstreamSessionId,
      lastMessageAt: item.lastMessageAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

  res.send({
    ...req.json,
    data,
  });
});

router.get('/v1/agent-chat/conversations/:conversationId/messages', async (req, res) => {
  const conversation = conversations.get(req.params.conversationId);
  res.send({
    ...req.json,
    data: conversation ? conversation.messages : [],
  });
});

router.post('/v1/agent-chat/conversations/:conversationId/abort', async (req, res) => {
  const conversationId = String(req.params.conversationId || '').trim();
  const controller = activeRequests.get(conversationId);
  const conversation = conversations.get(conversationId);

  if (controller) {
    controller.abort();
    activeRequests.delete(conversationId);
  }

  if (conversation) {
    conversation.status = 'aborted';
    conversation.updatedAt = nowString();
  }

  res.send({
    ...req.json,
    data: {
      conversationId,
      interrupted: Boolean(controller || conversation),
    },
  });
});

router.post('/v1/agent-chat/chat/stream', async (req, res) => {
  const controller = new AbortController();
  const authorization = resolveForwardAuthorization(req);
  const body = req.body || {};
  const prompt = String(body.prompt || '').trim();
  const requestedConversationId = String(body.conversationId || '').trim();
  const title = String(body.title || '').trim() || prompt.slice(0, 24) || 'AI 会话';
  let conversation = ensureConversation(requestedConversationId, title);
  let userMessageSaved = false;

  req.on('close', () => controller.abort());
  activeRequests.set(conversation.id, controller);
  conversation.status = 'streaming';

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': ping\n\n');
    }
  }, 15000);

  try {
    if (!prompt) {
      throw new Error('Prompt cannot be empty.');
    }

    await generateChatResultStream(
      {
        ...body,
        prompt,
        conversationId: requestedConversationId || undefined,
      },
      async (event, payload) => {
        if (event === 'status') {
          conversation = syncConversationId(
            conversation.id,
            payload?.conversationId || requestedConversationId,
            title,
          );

          if (!userMessageSaved) {
            pushMessage(conversation, 'user', prompt);
            userMessageSaved = true;
          }

          writeSseEvent(res, 'status', {
            ...payload,
            conversationId: conversation.id,
          });
          return;
        }

        if (event === 'reply_delta' || event === 'thinking_delta' || event === 'reasoning') {
          writeSseEvent(res, event, {
            ...payload,
            conversationId: conversation.id,
          });
          return;
        }

        if (event === 'result') {
          conversation = syncConversationId(
            conversation.id,
            payload?.conversationId || requestedConversationId,
            title,
          );

          if (!userMessageSaved) {
            pushMessage(conversation, 'user', prompt);
            userMessageSaved = true;
          }

          const assistantMessage = pushMessage(
            conversation,
            'assistant',
            String(payload?.reply || ''),
            {
              model: payload?.model || '',
              snapshotRecovered: payload?.snapshotRecovered !== false,
              reasoning: payload?.reasoning || [],
              summary: payload?.summary || null,
              snapshot: payload?.snapshot || null,
            },
          );
          conversation.status = 'active';

          writeSseEvent(res, 'message', {
            conversationId: conversation.id,
            model: payload?.model || '',
            reply: payload?.reply || '',
            snapshotRecovered: payload?.snapshotRecovered !== false,
            reasoning: payload?.reasoning || [],
            summary: payload?.summary || null,
            snapshot: payload?.snapshot || null,
            message: assistantMessage,
          });
          return;
        }

        if (event === 'done') {
          activeRequests.delete(conversation.id);
          writeSseEvent(res, 'done', {
            ...payload,
            conversationId: conversation.id,
          });
        }
      },
      {
        signal: controller.signal,
        authorization,
      },
    );
  } catch (error) {
    console.error('Agent chat request failed:', error);
    conversation.status = controller.signal.aborted ? 'aborted' : 'failed';
    conversation.updatedAt = nowString();
    const errorPayload = buildStreamErrorPayload(
      error,
      conversation.id,
      'OpenCode 会话执行失败。',
    );
    writeSseEvent(res, 'error', {
      ...errorPayload,
      conversationId: errorPayload.conversationId || conversation.id,
    });
    writeSseEvent(res, 'done', {
      ok: false,
      conversationId: errorPayload.conversationId || conversation.id,
    });
  } finally {
    activeRequests.delete(conversation.id);
    clearInterval(heartbeat);
    res.end();
  }
});

module.exports = router;
