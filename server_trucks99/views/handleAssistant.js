'use strict';

const express = require('express');
const { requireAuth } = require('../helpers/requireAuth');
const assistantService = require('../services/assistant/assistantService');

const assistantRouter = express.Router();

assistantRouter.use(requireAuth);

function getActorId(req) {
  return req.user?._id || req.user?.id;
}

/** GET /api/assistant/suggestions */
assistantRouter.get('/suggestions', (_req, res) => {
  res.status(200).json({ suggestions: assistantService.SUGGESTIONS });
});

/** GET /api/assistant/flows — module how-to flows for chatbot UI cards */
assistantRouter.get('/flows', (_req, res) => {
  try {
    const { getModuleFlows } = require('../services/assistant/knowledge');
    res.status(200).json({ flows: getModuleFlows() });
  } catch (error) {
    console.error('[Assistant] flows', error);
    res.status(500).json({ message: error.message || 'Failed to load flows' });
  }
});

/** GET /api/assistant/sessions?search= */
assistantRouter.get('/sessions', async (req, res) => {
  try {
    const sessions = await assistantService.listSessions(getActorId(req), {
      search: typeof req.query.search === 'string' ? req.query.search : '',
      limit: req.query.limit,
    });
    res.status(200).json({ sessions });
  } catch (error) {
    console.error('[Assistant] list sessions', error);
    res.status(500).json({ message: error.message || 'Failed to list sessions' });
  }
});

/** POST /api/assistant/sessions */
assistantRouter.post('/sessions', async (req, res) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title : undefined;
    const session = await assistantService.createSession(getActorId(req), title);
    res.status(201).json({ session });
  } catch (error) {
    console.error('[Assistant] create session', error);
    res.status(500).json({ message: error.message || 'Failed to create session' });
  }
});

/** GET /api/assistant/sessions/:id */
assistantRouter.get('/sessions/:id', async (req, res) => {
  try {
    const data = await assistantService.getSessionWithMessages(
      getActorId(req),
      req.params.id,
    );
    if (!data) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error('[Assistant] get session', error);
    res.status(500).json({ message: error.message || 'Failed to load session' });
  }
});

/** PATCH /api/assistant/sessions/:id — rename */
assistantRouter.patch('/sessions/:id', async (req, res) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title : '';
    const session = await assistantService.renameSession(
      getActorId(req),
      req.params.id,
      title,
    );
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.status(200).json({ session });
  } catch (error) {
    console.error('[Assistant] rename session', error);
    res.status(500).json({ message: error.message || 'Failed to rename session' });
  }
});

/** DELETE /api/assistant/sessions/:id */
assistantRouter.delete('/sessions/:id', async (req, res) => {
  try {
    const ok = await assistantService.deleteSession(getActorId(req), req.params.id);
    if (!ok) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Assistant] delete session', error);
    res.status(500).json({ message: error.message || 'Failed to delete session' });
  }
});

/** POST /api/assistant/sessions/:id/messages */
assistantRouter.post('/sessions/:id/messages', async (req, res) => {
  try {
    const content =
      typeof req.body?.content === 'string'
        ? req.body.content
        : typeof req.body?.message === 'string'
          ? req.body.message
          : '';
    const result = await assistantService.sendMessage(
      req.user,
      req.params.id,
      content,
    );
    res.status(200).json(result);
  } catch (error) {
    console.error('[Assistant] send message', error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Failed to send message' });
  }
});

module.exports = assistantRouter;
