import { API_BASE } from "@/model/services/common";
import type { AdvertisementAdType } from "@/model/api";

export function resolveMediaUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = API_BASE.replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
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
