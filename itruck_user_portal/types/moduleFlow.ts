/** Buy & Sell (and future) module flow cards for the chatbot UI */

export type ModuleFlowStep = {
  order: number;
  title: string;
  body: string;
  bullets?: string[];
};

export type ModuleFlow = {
  id: string;
  module: string;
  title: string;
  intro: string;
  prompt: string;
  category: string;
  stepCount: number;
  steps: ModuleFlowStep[];
  related?: Array<{ label: string; value: string }>;
  actions?: Array<{ type: string; label: string; payload?: Record<string, unknown> }>;
};
