'use strict';

/**
 * Knowledge-base registry.
 * Register future modules here (loads, trucks, dashboard, subscriptions, …)
 * without changing assistant core routing.
 */

const buySell = require('./modules/buySell');

/** @type {Array<{ MODULE: string, INTENTS: any[], SUGGESTIONS?: string[] }>} */
const MODULES = [buySell];

function getAllIntents() {
  return MODULES.flatMap((mod) => mod.INTENTS || []);
}

function getModuleSuggestions() {
  return MODULES.flatMap((mod) => mod.SUGGESTIONS || []);
}

function registerModule(mod) {
  if (!mod || !Array.isArray(mod.INTENTS)) {
    throw new Error('Knowledge module must export INTENTS[]');
  }
  MODULES.push(mod);
}

module.exports = {
  MODULES,
  getAllIntents,
  getModuleSuggestions,
  registerModule,
};
