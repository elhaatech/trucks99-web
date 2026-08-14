/**
 * Normalize unknown thrown values / API failures into Error.
 * Keeps UI notify paths consistent without changing API payloads.
 */
export function toError(error: unknown, fallback = "Request failed"): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string" && error.trim()) return new Error(error);
  if (error && typeof error === "object") {
    const body = error as {
      message?: unknown;
      response?: { data?: { message?: unknown; error?: unknown } };
    };
    const msg =
      (typeof body.response?.data?.message === "string" &&
        body.response.data.message) ||
      (typeof body.response?.data?.error === "string" &&
        body.response.data.error) ||
      (typeof body.message === "string" && body.message);
    if (msg) return new Error(msg);
  }
  return new Error(fallback);
}

export function toErrorMessage(error: unknown, fallback = "Request failed"): string {
  return toError(error, fallback).message;
}

export function isAuthFailure(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    /token missing|token expired|unauthorized|please log in|please sign in|authentication/i.test(
      message,
    ) || (error as { status?: number; response?: { status?: number } })?.response?.status === 401
    || (error as { status?: number })?.status === 401
  );
}
