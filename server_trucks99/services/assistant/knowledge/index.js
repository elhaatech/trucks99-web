'use strict';

/**
 * Public entry for knowledge APIs / future module registration.
 */
const registry = require('./registry');
const knowledgeService = require('./knowledgeService');
const responseBuilder = require('./responseBuilder');
const flowCatalog = require('./flowCatalog');

module.exports = {
  ...knowledgeService,
  registerModule: registry.registerModule,
  getAllIntents: registry.getAllIntents,
  getModuleSuggestions: registry.getModuleSuggestions,
  buildGuideResponse: responseBuilder.buildGuideResponse,
  getModuleFlows: flowCatalog.getModuleFlows,
};
