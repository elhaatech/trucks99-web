'use strict';

const { getAllIntents } = require('./knowledge/registry');

/**
 * Detect whether the user is asking for how-to / explanation guidance
 * (vs performing an action like starting the sell wizard).
 */
function isGuidanceQuestion(text) {
  const q = String(text || '').trim();
  if (!q) return false;
  return (
    /^(how|where|what|why|explain|guide|help)\b/i.test(q) ||
    /\bhow (do|can|to|does)\b/i.test(q) ||
    /\bwhere (do|can|to|is|are)\b/i.test(q) ||
    /\bwhat (is|are|can)\b/i.test(q) ||
    /\bwhy (is|are|isn'?t|does|do)\b/i.test(q) ||
    /\b(steps?|guide|tutorial|explain)\b/i.test(q) ||
    /\bhow.*(work|works)\b/i.test(q)
  );
}

/**
 * Score an intent against user text.
 * Higher score wins. Pattern match outweighs keyword overlap.
 */
function scoreIntent(intent, text) {
  const q = String(text || '').toLowerCase().trim();
  if (!q) return 0;
  let score = 0;

  for (const pattern of intent.patterns || []) {
    if (pattern.test(text)) {
      score += 100;
      break;
    }
  }

  if (Array.isArray(intent.keywords)) {
    for (const kw of intent.keywords) {
      if (q.includes(String(kw).toLowerCase())) score += 12;
    }
  }

  if (score > 0) score += Number(intent.priority || 0) / 1000;
  return score;
}

/**
 * @returns {{ id: string, module: string, article: object, score: number } | null}
 */
function detectKnowledgeIntent(text) {
  const intents = getAllIntents();
  let best = null;
  let bestScore = 0;

  for (const intent of intents) {
    const score = scoreIntent(intent, text);
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  if (!best || bestScore < 100) return null;

  return {
    id: best.id,
    module: best.module,
    article: { ...best.article, intent: best.id, module: best.module },
    score: bestScore,
  };
}

module.exports = {
  isGuidanceQuestion,
  detectKnowledgeIntent,
  scoreIntent,
};
