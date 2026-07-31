/**
 * Shared API typing helpers — does not change wire contracts.
 */

/** Successful envelope some endpoints return. */
export type ApiSuccessEnvelope<T> = {
  success?: boolean;
  data: T;
  message?: string;
};

/** Error-shaped body from Express routes. */
export type ApiErrorBody = {
  message?: string;
  error?: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AsyncStatus = "idle" | "loading" | "success" | "error";
