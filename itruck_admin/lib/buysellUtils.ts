import { resolvePublicFileUrl } from "@/lib/fileUrl";

/** Resolve a stored path like `/uploads/foo.jpg` to a full API URL. */
export function getBuySellImageUrl(path?: string | null): string {
  return resolvePublicFileUrl(path);
}
