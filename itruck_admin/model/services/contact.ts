import { api } from "./common";
import { resolveApiBase } from "@/lib/apiBase";

export type ContactEnquiryStatus = "new" | "read" | "closed";

export type ContactEnquiry = {
  id?: string;
  _id?: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  attachment?: string | null;
  status?: ContactEnquiryStatus;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ContactEnquiryFilterParams = {
  search?: string;
  status?: ContactEnquiryStatus | "all" | "";
  page?: number;
  limit?: number;
};

export type ContactEnquiryListResponse = {
  message?: string;
  data: ContactEnquiry[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function unwrapEnquiry(payload: unknown): ContactEnquiry {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: ContactEnquiry }).data;
  }
  return payload as ContactEnquiry;
}

export function resolveContactAttachmentUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = resolveApiBase().replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

/** POST /api/contact/list — admin enquiry list (filters in JSON body). */
export async function getContactEnquiries(
  params?: ContactEnquiryFilterParams,
): Promise<ContactEnquiryListResponse> {
  const body = {
    page: params?.page || 1,
    limit: params?.limit || 20,
    search: params?.search?.trim() || "",
    status: params?.status && params.status !== "all" ? params.status : "",
  };

  const res = await api<ContactEnquiryListResponse | ContactEnquiry[]>("/api/contact/list", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (Array.isArray(res)) {
    return { data: res, pagination: { page: 1, limit: res.length, total: res.length, totalPages: 1 } };
  }
  return {
    message: res?.message,
    data: Array.isArray(res?.data) ? res.data : [],
    pagination: res?.pagination,
  };
}

/** GET /api/contact/:id */
export async function getContactEnquiry(id: string): Promise<ContactEnquiry> {
  const res = await api<ContactEnquiry | { data: ContactEnquiry }>(
    `/api/contact/${encodeURIComponent(id)}`,
  );
  return unwrapEnquiry(res);
}

/** PUT /api/contact/:id/status */
export async function updateContactEnquiryStatus(
  id: string,
  status: ContactEnquiryStatus,
): Promise<ContactEnquiry> {
  const res = await api<ContactEnquiry | { data: ContactEnquiry }>(
    `/api/contact/${encodeURIComponent(id)}/status`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
  );
  return unwrapEnquiry(res);
}

/** DELETE /api/contact/:id */
export async function deleteContactEnquiry(id: string): Promise<void> {
  await api(`/api/contact/${encodeURIComponent(id)}`, { method: "DELETE" });
}
