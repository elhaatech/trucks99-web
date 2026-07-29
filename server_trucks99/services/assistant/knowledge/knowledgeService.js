'use strict';

const { detectKnowledgeIntent, isGuidanceQuestion } = require('../intentDetector');
const { buildGuideResponse } = require('./responseBuilder');
const { getModuleSuggestions } = require('./registry');

/**
 * Resolve a natural-language help question against the knowledge base.
 * Returns null when no guide matches (caller may fall through to other handlers).
 */
function answerFromKnowledge(text) {
  const match = detectKnowledgeIntent(text);
  if (!match) return null;
  return buildGuideResponse(match.article);
}

/**
 * Prefer knowledge answers for guidance-style questions.
 */
function tryAnswerGuidance(text) {
  if (!isGuidanceQuestion(text) && !detectKnowledgeIntent(text)) {
    return null;
  }
  return answerFromKnowledge(text);
}

function getKnowledgeSuggestions(limit = 8) {
  const list = getModuleSuggestions();
  return list.slice(0, limit);
}

module.exports = {
  answerFromKnowledge,
  tryAnswerGuidance,
  getKnowledgeSuggestions,
};
