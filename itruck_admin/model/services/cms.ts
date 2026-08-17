import { api } from "./common";

export type FormState = {
  page_title: string;
  page_description: string;
};

export const EMPTY_FORM: FormState = {
  page_title: "",
  page_description: "",
};

export type FilterState = {
  search: string;
  status: string;
};

export const EMPTY_FILTERS: FilterState = {
  search: "",
  status: "",
};

/** Single CMS page (shared by list, get, create, update responses). */
export type CMSPage = {
  _id: string;
  id?: string;
  page_title: string;
  slug: string;
  page_description: string;
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

/** GET /all — list of CMS pages. */
export type CMSPageListResponse = CMSPage[];

/** GET /:identifier — single page (by id or slug). */
export type CMSPageSingleResponse = CMSPage;

/** POST /add and PUT /edit/:id — shared response shape. */
export type CMSPageMutationResponse = {
  message: string;
  data: CMSPage;
};

/** DELETE /delete — response shape. */
export type CMSPageDeleteResponse = {
  message: string;
  deletedCount: number;
  ids: string[];
};

export async function getCMSPageAll(): Promise<CMSPageListResponse> {
  return api<CMSPageListResponse>("/api/cms/all");
}

export async function getCMSPage(
  identifier: string,
): Promise<CMSPageSingleResponse> {
  return api<CMSPageSingleResponse>(`/api/cms/${identifier}`);
}

export async function createCMSPage(body: {
  page_title: string;
  page_description: string;
  status?: "active" | "inactive";
}): Promise<CMSPageMutationResponse> {
  return api<CMSPageMutationResponse>("/api/cms/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCMSPage(
  id: string,
  body: Partial<{
    page_title: string;
    page_description: string;
    status: "active" | "inactive";
  }>,
): Promise<CMSPageMutationResponse> {
  return api<CMSPageMutationResponse>(`/api/cms/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteCMSPage(
  ids: string[],
): Promise<CMSPageDeleteResponse> {
  return api<CMSPageDeleteResponse>("/api/cms/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}