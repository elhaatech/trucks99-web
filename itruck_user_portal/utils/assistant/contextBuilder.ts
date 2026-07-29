/**
 * Client-side context helpers (server builds the authoritative context).
 * Used for optimistic UI and suggested questions personalization.
 */

export type ClientAssistantContext = {
  isLoggedIn: boolean;
  userName?: string;
  listingTotal?: number;
};

export function buildClientContextHints(ctx: ClientAssistantContext): string[] {
  const hints: string[] = [];
  if (!ctx.isLoggedIn) {
    hints.push("Sign in to manage your listings with the assistant.");
    return hints;
  }
  if (typeof ctx.listingTotal === "number") {
    hints.push(`You have ${ctx.listingTotal} listing(s) on file.`);
  }
  return hints;
}
