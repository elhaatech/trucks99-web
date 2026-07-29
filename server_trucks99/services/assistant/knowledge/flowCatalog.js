'use strict';

/**
 * Lightweight flow catalog for the chatbot UI.
 * Derived from knowledge modules — never duplicated in React components.
 */

const { getAllIntents } = require('./registry');

function summarizeSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps.map((step, i) => {
    if (typeof step === 'string') {
      return { order: i + 1, title: step, body: '' };
    }
    return {
      order: i + 1,
      title: step.title || `Step ${i + 1}`,
      body: step.body || step.text || '',
      bullets: step.bullets || [],
    };
  });
}

/**
 * @returns {Array<{
 *  id: string,
 *  module: string,
 *  title: string,
 *  intro: string,
 *  prompt: string,
 *  category: string,
 *  stepCount: number,
 *  steps: Array<{order:number,title:string,body:string,bullets:string[]}>,
 *  related: Array<{label:string,value:string}>
 * }>}
 */
function getModuleFlows() {
  return getAllIntents().map((intent) => {
    const article = intent.article || {};
    const steps = summarizeSteps(article.steps);
    const related = (article.related || []).map((r) =>
      typeof r === 'string' ? { label: r, value: r } : r,
    );
    const prompt =
      related[0]?.value ||
      article.title ||
      intent.id;

    return {
      id: intent.id,
      module: intent.module || article.module || 'general',
      title: article.title || intent.id,
      intro: article.intro || '',
      prompt,
      category: categorizeIntent(intent.id),
      stepCount: steps.length,
      steps,
      related,
      actions: article.actions || [],
    };
  });
}

function categorizeIntent(id) {
  const key = String(id || '');
  if (/post_vehicle|edit_vehicle|delete_vehicle|my_vehicles|mark_sold|renew|not_visible/.test(key)) {
    return 'Sell';
  }
  if (/buy_vehicle|make_offer|my_offers|search|favorites|chat_seller|share|report/.test(key)) {
    return 'Buy';
  }
  if (/featured|payments|manage_offers/.test(key)) {
    return 'Grow';
  }
  return 'Guide';
}

module.exports = {
  getModuleFlows,
  categorizeIntent,
};
