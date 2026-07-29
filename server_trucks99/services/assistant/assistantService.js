'use strict';

const AssistantChatSession = require('../../schema/assistantChatSession');
const AssistantChatMessage = require('../../schema/assistantChatMessage');
const { buildUserAssistantContext } = require('./contextBuilder');
const { handleSellFlow } = require('./sellFlow');
const { handleBusinessQuery } = require('./queryHandlers');
const { isGuidanceQuestion } = require('./intentDetector');
const {
  tryAnswerGuidance,
  getKnowledgeSuggestions,
} = require('./knowledge/knowledgeService');

/** Mix of action + help prompts (knowledge-driven suggestions appended). */
const ACTION_SUGGESTIONS = [
  'How many vehicles do I have?',
  'I want to sell my truck',
  'Show my featured vehicles',
  'Show pending listings',
  'Show sold vehicles',
  'Search Tata',
];

const SUGGESTIONS = [
  ...getKnowledgeSuggestions(6),
  ...ACTION_SUGGESTIONS,
];

/**
 * True when the user wants to *perform* the sell wizard (not ask how-to).
 */
function wantsSellFlow(text) {
  const q = String(text || '').trim();
  if (!q) return false;
  // Never hijack how-to / explanation questions into the create wizard.
  if (isGuidanceQuestion(q)) return false;
  return /^(i want to sell|sell my|create (a )?(listing|truck|car)|list (my |a )?(truck|vehicle|car)|publish (this |my )?(listing|vehicle))/i.test(
    q,
  ) || /^(create a truck listing|create a car listing)$/i.test(q);
}

function defaultWelcome(userName) {
  const name = userName ? ` ${userName}` : '';
  const helpSuggestions = getKnowledgeSuggestions(4);
  return {
    content:
      `Hi${name}! I'm your **TRUCK99 AI Assistant** for Buy & Sell.\n\n` +
      `I can:\n` +
      `- Explain every marketplace workflow step-by-step\n` +
      `- Create listings conversationally\n` +
      `- Check your inventory, offers, and featured status\n` +
      `- Search your vehicles by brand, price, or location\n\n` +
      `Ask me anything — for example *How do I post a vehicle?*`,
    quickReplies: [...helpSuggestions, ...ACTION_SUGGESTIONS.slice(0, 2)].map((s) => ({
      label: s,
      value: s,
    })),
    intent: 'welcome',
  };
}

async function listSessions(userId, { search = '', limit = 40 } = {}) {
  const filter = { userId, status: 'active' };
  if (search.trim()) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { lastMessage: { $regex: search.trim(), $options: 'i' } },
    ];
  }
  return AssistantChatSession.find(filter)
    .sort({ updatedAt: -1 })
    .limit(Math.min(Number(limit) || 40, 100))
    .lean();
}

async function createSession(userId, title) {
  const session = await AssistantChatSession.create({
    userId,
    title: title || 'New chat',
    context: {},
  });
  const welcome = defaultWelcome();
  await AssistantChatMessage.create({
    sessionId: session._id,
    userId,
    role: 'assistant',
    content: welcome.content,
    meta: {
      quickReplies: welcome.quickReplies,
      intent: welcome.intent,
    },
  });
  session.lastMessage = welcome.content.slice(0, 200);
  session.lastMessageAt = new Date();
  session.messageCount = 1;
  await session.save();
  return session.toObject();
}

async function getSessionWithMessages(userId, sessionId) {
  const session = await AssistantChatSession.findOne({
    _id: sessionId,
    userId,
  }).lean();
  if (!session) return null;
  const messages = await AssistantChatMessage.find({ sessionId: session._id })
    .sort({ createdAt: 1 })
    .lean();
  return { session, messages };
}

async function renameSession(userId, sessionId, title) {
  return AssistantChatSession.findOneAndUpdate(
    { _id: sessionId, userId },
    { $set: { title: String(title || '').trim().slice(0, 120) || 'New chat' } },
    { new: true },
  ).lean();
}

async function deleteSession(userId, sessionId) {
  const session = await AssistantChatSession.findOneAndUpdate(
    { _id: sessionId, userId },
    { $set: { status: 'archived' } },
    { new: true },
  );
  return Boolean(session);
}

function deriveTitle(message) {
  const t = String(message || '').trim().replace(/\s+/g, ' ');
  if (!t) return 'New chat';
  return t.length > 48 ? `${t.slice(0, 45)}…` : t;
}

/**
 * Route a turn:
 * 1) Continue active sell wizard
 * 2) Knowledge-base how-to guides
 * 3) Start sell wizard (action phrasing)
 * 4) Live data queries (counts, search, lists)
 * 5) Fallback with suggestions
 */
async function resolveAssistantTurn(user, ctx, text) {
  if (ctx.flow === 'sell') {
    return handleSellFlow(ctx, text);
  }

  const guide = tryAnswerGuidance(text);
  if (guide) return guide;

  if (wantsSellFlow(text)) {
    return handleSellFlow(ctx, text);
  }

  const dataAnswer = await handleBusinessQuery(user, text);
  if (dataAnswer) return dataAnswer;

  // Soft knowledge retry for near-miss phrasings
  const softGuide = tryAnswerGuidance(text);
  if (softGuide) return softGuide;

  return {
    content:
      "I can explain Buy & Sell workflows, check your listings, or help you create a vehicle listing.\n\nTry one of these:",
    quickReplies: SUGGESTIONS.slice(0, 8).map((s) => ({ label: s, value: s })),
    intent: 'fallback',
  };
}

async function sendMessage(user, sessionId, content) {
  const text = String(content || '').trim();
  if (!text) {
    const err = new Error('Message content is required');
    err.status = 400;
    throw err;
  }

  const session = await AssistantChatSession.findOne({
    _id: sessionId,
    userId: user._id,
    status: 'active',
  });
  if (!session) {
    const err = new Error('Chat session not found');
    err.status = 404;
    throw err;
  }

  await AssistantChatMessage.create({
    sessionId: session._id,
    userId: user._id,
    role: 'user',
    content: text,
  });

  await buildUserAssistantContext(user);

  const ctx = session.context || {};
  const result = await resolveAssistantTurn(user, ctx, text);

  if (result.contextPatch !== undefined) {
    session.context =
      result.contextPatch === null || result.contextPatch.flow === null
        ? {}
        : { ...ctx, ...result.contextPatch };
  }

  if (session.title === 'New chat') {
    session.title = deriveTitle(text);
  }

  const assistantMsg = await AssistantChatMessage.create({
    sessionId: session._id,
    userId: user._id,
    role: 'assistant',
    content: result.content,
    meta: {
      quickReplies: result.quickReplies || [],
      actions: result.actions || [],
      data: result.data || null,
      intent: result.intent || null,
    },
  });

  session.lastMessage = result.content.slice(0, 240);
  session.lastMessageAt = new Date();
  session.messageCount = (session.messageCount || 0) + 2;
  session.updatedAt = new Date();
  await session.save();

  return {
    session: session.toObject(),
    userMessage: { role: 'user', content: text },
    assistantMessage: assistantMsg.toObject(),
  };
}

module.exports = {
  SUGGESTIONS,
  listSessions,
  createSession,
  getSessionWithMessages,
  renameSession,
  deleteSession,
  sendMessage,
  defaultWelcome,
  resolveAssistantTurn,
};
