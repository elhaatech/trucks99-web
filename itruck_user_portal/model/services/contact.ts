import { publicApi, resolveApiBase } from "@/model/services/common";

export type ContactInfo = {
  phone: string;
  email: string;
  whatsappNumber: string;
  callUrl: string;
  whatsappUrl: string;
  mailtoUrl: string;
};

export type ContactSubmitInput = {
  name: string;
  mobile: string;
  email: string;
  message: string;
  attachmentFile?: File | null;
};

type ContactInfoResponse = {
  message: string;
  data: ContactInfo;
};

type ContactSubmitResponse = {
  message: string;
  data: { id: string; _id: string; createdAt?: string };
};

/** GET /api/contact/info */
export async function getContactInfo(signal?: AbortSignal): Promise<ContactInfo> {
  const res = await publicApi<ContactInfoResponse>("/api/contact/info", { signal });
  return res.data;
}

/** POST /api/contact/submit — multipart when a file is attached. */
export async function submitContactForm(
  input: ContactSubmitInput,
  signal?: AbortSignal,
): Promise<ContactSubmitResponse> {
  if (input.attachmentFile) {
    const formData = new FormData();
    formData.append("name", input.name);
    formData.append("mobile", input.mobile);
    formData.append("email", input.email);
    formData.append("message", input.message);
    formData.append("attachment", input.attachmentFile);

    const base = resolveApiBase().replace(/\/$/, "");
    const res = await fetch(`${base}/api/contact/submit`, {
      method: "POST",
      body: formData,
      credentials: "include",
      signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || res.statusText || "Request failed");
    }
    return data as ContactSubmitResponse;
  }

  return publicApi<ContactSubmitResponse>("/api/contact/submit", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      mobile: input.mobile,
      email: input.email,
      message: input.message,
    }),
    signal,
  });
}
