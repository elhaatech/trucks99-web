import { api, publicApi, resolveApiBase, getAuthHeaders } from "./common";
import type { ApiUser } from "./user";

export const AD_TYPES = ["Text", "Banner", "Image", "Video"] as const;
export const DISPLAY_LOCATIONS = [
  "Home Page",
  "Dashboard",
  "Product Listing",
  "Product Details",
  "Search Page",
  "Sidebar",
  "Footer",
  "Popup",
] as const;

export type AdvertisementAdType = (typeof AD_TYPES)[number];
export type AdvertisementDisplayLocation = (typeof DISPLAY_LOCATIONS)[number];
export type AdvertisementStatus = "Enabled" | "Disabled";

export type Advertisement = {
  _id: string;
  id?: string;
  uuid?: string;
  adTitle: string;
  clientName: string;
  adType: AdvertisementAdType;
  description: string;
  mediaUrl: string;
  redirectUrl: string;
  displayLocation: AdvertisementDisplayLocation;
  startDate: string;
  expiryDate: string;
  status: AdvertisementStatus;
  displayPriority: number;
  adSource?: "manual" | "google_ads";
  googleAdsConfig?: unknown;
  createdBy?: { id: string; name: string; role: string };
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  isExpired?: boolean;
};

export type AdvertisementFilterParams = {
  status?: string;
  adType?: string;
  displayLocation?: string;
  clientName?: string;
};

async function submitAdvertisementFormData(
  method: "POST" | "PUT",
  path: string,
  formData: FormData,
): Promise<{ message: string; advertisement: Advertisement }> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    method,
    body: formData,
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    advertisement?: Advertisement;
  };

  if (!res.ok) {
    throw new Error(data?.message || res.statusText || "Request failed");
  }

  if (!data.advertisement) {
    throw new Error(data?.message || "Advertisement response was incomplete");
  }

  return {
    message: data.message || "Success",
    advertisement: data.advertisement,
  };
}

export async function getAdvertisements(
  params?: AdvertisementFilterParams,
): Promise<Advertisement[]> {
  const query: Record<string, string> = {};
  if (params?.status) query.status = params.status;
  if (params?.adType) query.adType = params.adType;
  if (params?.displayLocation) query.displayLocation = params.displayLocation;
  if (params?.clientName) query.clientName = params.clientName;
  return api<Advertisement[]>("/api/advertisement", {
    params: Object.keys(query).length ? query : undefined,
  });
}

export async function getActiveAdvertisements(
  location: string,
): Promise<Advertisement[]> {
  return publicApi<Advertisement[]>("/api/advertisement/active", {
    params: { location },
  });
}

export async function getAdvertisement(id: string): Promise<Advertisement> {
  return api<Advertisement>(`/api/advertisement/${id}`);
}

export async function createAdvertisement(formData: FormData) {
  return submitAdvertisementFormData("POST", "/api/advertisement", formData);
}

export async function updateAdvertisement(id: string, formData: FormData) {
  return submitAdvertisementFormData("PUT", `/api/advertisement/${id}`, formData);
}

export async function updateAdvertisementStatus(
  id: string,
  body: { status: AdvertisementStatus; user?: ApiUser },
) {
  return api<{ message: string; advertisement: Advertisement }>(
    `/api/advertisement/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteAdvertisement(
  id: string,
  body?: { user?: ApiUser },
) {
  return api<{ message: string; id: string }>(`/api/advertisement/${id}`, {
    method: "DELETE",
    body: body ? JSON.stringify(body) : undefined,
  });
}
