'use strict';

/**
 * Response template helpers for knowledge-base articles.
 * Keep formatting centralized so modules only supply content.
 */

function formatSteps(steps) {
  if (!Array.isArray(steps) || !steps.length) return '';
  return steps
    .map((step, i) => {
      if (typeof step === 'string') return `${i + 1}. ${step}`;
      const title = step.title ? `**${step.title}**` : '';
      const body = step.body || step.text || '';
      const bullets = Array.isArray(step.bullets)
        ? '\n' + step.bullets.map((b) => `   • ${b}`).join('\n')
        : '';
      return `${i + 1}. ${title}${title && body ? '\n   ' : ''}${body}${bullets}`.trim();
    })
    .join('\n\n');
}

/**
 * @param {object} article
 * @param {string} article.title
 * @param {string} [article.intro]
 * @param {Array<string|object>} [article.steps]
 * @param {string} [article.outro]
 * @param {string[]} [article.tips]
 * @param {Array<{label:string,value:string}>} [article.related]
 * @param {Array<{type:string,label:string,payload?:object}>} [article.actions]
 * @param {string} [article.intent]
 */
function buildGuideResponse(article) {
  const parts = [];
  if (article.title) parts.push(`## ${article.title}`);
  if (article.intro) parts.push(article.intro);
  if (article.steps?.length) parts.push(formatSteps(article.steps));
  if (article.tips?.length) {
    parts.push('**Tips**\n' + article.tips.map((t) => `• ${t}`).join('\n'));
  }
  if (article.outro) parts.push(article.outro);

  const steps = (article.steps || []).map((step, i) => {
    if (typeof step === 'string') {
      return { order: i + 1, title: step, body: '', bullets: [] };
    }
    return {
      order: i + 1,
      title: step.title || `Step ${i + 1}`,
      body: step.body || step.text || '',
      bullets: step.bullets || [],
    };
  });

  return {
    content: parts.filter(Boolean).join('\n\n'),
    quickReplies: (article.related || []).map((r) =>
      typeof r === 'string' ? { label: r, value: r } : r,
    ),
    actions: article.actions || [],
    intent: article.intent || article.id || 'guide',
    data: {
      knowledgeId: article.id,
      module: article.module,
      flowTitle: article.title,
      steps,
    },
  };
}

module.exports = {
  formatSteps,
  buildGuideResponse,
};
