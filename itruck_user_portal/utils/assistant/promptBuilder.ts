import type { AssistantSession } from "@/types/assistant";

/** Build a short system-style prompt summary for UI / future LLM adapters */
export function buildSessionPromptHint(session: AssistantSession | null): string {
  if (!session) return "";
  const flow = (session.context as { flow?: string } | undefined)?.flow;
  if (flow === "sell") {
    return "Active flow: create listing. Guide the user step by step.";
  }
  return "Answer using marketplace data. Prefer concise markdown tables for lists.";
}

export function buildSellKickoffPrompt(categoryHint?: string): string {
  if (categoryHint?.trim()) {
    return `I want to sell a ${categoryHint.trim()}`;
  }
  return "I want to sell my vehicle";
}
