/**
 * Helpers to interpret backend `status` values for common Block/Unblock models.
 *
 * Backend uses `status` values like:
 * - "active" / "inactive"
 * - "Active" / "Inactive"
 */
export function normalizeStatus(status: unknown): string {
  return String(status ?? "").trim().toLowerCase();
}

export function isBlockedStatus(status: unknown): boolean {
  const s = normalizeStatus(status);
  // Most entities store blocked as "inactive"
  if (s === "inactive") return true;
  if (s === "blocked") return true;
  return false;
}

export function getStatusText(status: unknown): "Active" | "Blocked" {
  return isBlockedStatus(status) ? "Blocked" : "Active";
}

export function getBlockUnblockAction(status: unknown): { action: "block" | "unblock"; label: string } {
  return isBlockedStatus(status) ? { action: "unblock", label: "Unblock" } : { action: "block", label: "Block" };
}

