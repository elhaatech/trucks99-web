import type { Role } from "@/model/services/role";

const PREFERRED_ROLE_NAMES = ["Buy/Sell", "Buy/sell", "Buy Sell", "Buy Sell User"];

export function isBuySellMarketplaceRoleName(name: string | undefined | null): boolean {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return false;
  if (/super\s*admin/i.test(trimmed)) return false;
  return /^buy\s*[/\\-]?\s*sell(\s+user)?$/i.test(trimmed);
}

export function getRoleDocumentId(role: Role): string {
  return String(role._id ?? role.id ?? "").trim();
}

/** Pick the Buy/Sell role for marketplace registration (no role dropdown). */
export function pickBuySellMarketplaceRole(roles: Role[]): Role | null {
  if (!roles.length) return null;

  for (const preferred of PREFERRED_ROLE_NAMES) {
    const hit = roles.find((r) => String(r.name ?? "").trim() === preferred);
    if (hit && getRoleDocumentId(hit)) return hit;
  }

  const eligible = roles.filter(
    (r) => isBuySellMarketplaceRoleName(r.name) && getRoleDocumentId(r),
  );
  return eligible[0] ?? null;
}
