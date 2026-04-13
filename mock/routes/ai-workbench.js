const express = require('express');
const { generateChatResult, generateChatResultStream, listModels } = require('../ai-workbench/service');

const router = express.Router();

const writeSseEvent = (res, event, payload) => {
  if (res.writableEnded) {
    return;
  }
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

router.get('/v1/ai-workbench/models', async (req, res) => {
  res.send({
    ...req.json,
    data: listModels(),
  });
});

router.post('/v1/ai-workbench/chat', async (req, res) => {
  const controller = new AbortController();
  req.on('close', () => controller.abort());
  try {
    const data = await generateChatResult(req.body || {}, { signal: controller.signal });
    res.send({
      ...req.json,
      data,
    });
  } catch (error) {
    console.error('AI workbench request failed:', error);
    res.status(error.statusCode || 502).send({
      ...req.json,
      status: 1,
      message: error instanceof Error ? error.message : 'AI workbench request failed.',
    });
  }
});

router.post('/v1/ai-workbench/chat/stream', async (req, res) => {
  const controller = new AbortController();
  req.on('close', () => controller.abort());
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
    await generateChatResultStream(req.body || {}, async (event, payload) => {
      writeSseEvent(res, event, payload);
    }, { signal: controller.signal });
  } catch (error) {
    console.error('AI workbench streaming request failed:', error);
    writeSseEvent(res, 'error', {
      message: error instanceof Error ? error.message : 'AI workbench request failed.',
    });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

module.exports = router;
