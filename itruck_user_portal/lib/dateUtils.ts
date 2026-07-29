/** Display when a date value is missing or invalid. */
export const EMPTY_DATE_DISPLAY = "-";

const CREATED_DATE_FIELD_KEYS = [
  "createdAt",
  "created_at",
  "created_date",
] as const;

/** Parse a date-like value into a valid Date in the user's local timezone. */
export function parseDateValue(
  value?: string | Date | number | null,
): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Numeric timestamp for sorting; null when unavailable. */
export function getDateTimestamp(
  value?: string | Date | number | null,
): number | null {
  const date = parseDateValue(value);
  return date ? date.getTime() : null;
}

/**
 * Format as DD/MM/YYYY hh:mm AM/PM in the user's local timezone.
 * Example: 15/07/2026 10:45 AM
 */
export function formatCreatedDate(
  value?: string | Date | number | null,
): string {
  const date = parseDateValue(value);
  if (!date) return EMPTY_DATE_DISPLAY;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  const hours = String(hours12).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

/** Extract a created-date field from common API response shapes. */
export function extractCreatedAt(row: unknown): string | undefined {
  if (!row || typeof row !== "object") return undefined;

  const record = row as Record<string, unknown>;
  for (const key of CREATED_DATE_FIELD_KEYS) {
    const value = record[key];
    if (value != null && value !== "") {
      return String(value);
    }
  }

  return undefined;
}

/** Column ids that should sort by timestamp instead of formatted text. */
export const DATE_SORT_COLUMN_IDS = new Set([
  "createdAt",
  "created_at",
  "created_date",
  "updatedAt",
  "updated_at",
  "updated_date",
]);

export function isDateSortColumn(columnId: string): boolean {
  return DATE_SORT_COLUMN_IDS.has(columnId);
}
