import type {
  AdvertisementAdType,
  AdvertisementDisplayLocation,
  AdvertisementStatus,
} from "@/model/api";
import { resolvePublicFileUrl } from "@/lib/fileUrl";

export interface FilterState {
  status: "" | AdvertisementStatus;
  adType: "" | AdvertisementAdType;
  displayLocation: "" | AdvertisementDisplayLocation;
  search: string;
}

export interface FormState {
  adTitle: string;
  clientName: string;
  adType: AdvertisementAdType;
  description: string;
  redirectUrl: string;
  displayLocation: AdvertisementDisplayLocation;
  startDate: string;
  expiryDate: string;
  displayPriority: string;
  status: AdvertisementStatus;
  mediaUrl: string;
}

export type SetFormFieldFn = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

export const EMPTY_FORM: FormState = {
  adTitle: "",
  clientName: "",
  adType: "Banner",
  description: "",
  redirectUrl: "",
  displayLocation: "Home Page",
  startDate: "",
  expiryDate: "",
  displayPriority: "0",
  status: "Enabled",
  mediaUrl: "",
};

export const EMPTY_FILTERS: FilterState = {
  status: "",
  adType: "",
  displayLocation: "",
  search: "",
};

export function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function formatDisplayDate(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function mediaTypesRequiringFile(adType: AdvertisementAdType): boolean {
  return adType === "Banner" || adType === "Image" || adType === "Video";
}

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
] as const;

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

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

export function validateMediaFile(
  file: File,
  adType: AdvertisementAdType,
): string | null {
  if (file.size > MAX_MEDIA_BYTES) {
    return "File size must be 50MB or smaller.";
  }

  const isImage = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type);
  const isVideo = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(file.type);

  if (adType === "Video") {
    if (!isImage && !isVideo) {
      return "Video ads support MP4, WebM, QuickTime, or image files (PNG, JPEG, GIF, WebP).";
    }
    return null;
  }

  if (!isImage) {
    return "Banner and Image ads require PNG, JPEG, GIF, or WebP image files.";
  }

  return null;
}
