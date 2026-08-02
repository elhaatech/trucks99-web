import { publicApi } from "@/model/services/common_fixed";

export type LegalType = "terms" | "privacy";

export type LegalSection = {
  number: number;
  title: string;
  content: string;
  bullets: string[];
};

export type LegalDocument = {
  type: LegalType;
  title: string;
  subtitle: string;
  intro: string;
  sections: LegalSection[];
  contactEmail: string;
  contactLabel: string;
  updatedAt?: string;
};

type LegalDocumentResponse = {
  message: string;
  data: LegalDocument;
};

const TYPE_PATH: Record<LegalType, string> = {
  terms: "terms",
  privacy: "privacy",
};

/** GET /api/legal/:type */
export async function getLegalDocument(
  type: LegalType,
  signal?: AbortSignal,
): Promise<LegalDocument> {
  const res = await publicApi<LegalDocumentResponse>(`/api/legal/${TYPE_PATH[type]}`, {
    signal,
  });
  return res.data;
}

/** POST /api/legal — fetch by payload type string */
export async function fetchLegalDocumentByPayload(
  type: string,
  signal?: AbortSignal,
): Promise<LegalDocument> {
  const res = await publicApi<LegalDocumentResponse>("/api/legal", {
    method: "POST",
    body: JSON.stringify({ type }),
    signal,
  });
  return res.data;
}

export function parseLegalPageType(raw: string | undefined): LegalType | null {
  const key = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (["terms", "terms-and-conditions", "terms-of-service"].includes(key)) {
    return "terms";
  }
  if (["privacy", "privacy-policy", "policy"].includes(key)) {
    return "privacy";
  }
  return null;
}

export function formatLegalUpdatedDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
