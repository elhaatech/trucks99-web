import { resolvePublicFileUrl } from "@/lib/fileUrl";
import type { AdvertisementAdType } from "@/model/api";

export function resolveMediaUrl(url: string): string {
  return resolvePublicFileUrl(url);
}

export function isVideoMedia(
  adType: AdvertisementAdType,
  mediaUrl?: string,
  file?: File | null,
): boolean {
  if (file) return file.type.startsWith("video/");
  if (mediaUrl && /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl)) return true;
  return adType === "Video" && Boolean(mediaUrl);
}
