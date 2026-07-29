import { axiosClient } from "./axiosClient";

export type Category = {
  _id: string;
  id?: string;
  uuid?: string;
  category_name: string;
  status: string;
  created_by?: string;
  updated_by?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BulkUploadResult = {
  message?: string;
  total?: number;
  inserted?: number;
  skipped?: number;
  errors?: { row: number; message: string }[];
};

type CategoryResponse = Category | { data: Category } | { category: Category };

function normalizeError(error: unknown): never {
  if (typeof error === "object" && error && "response" in error) {
    const e = error as { response?: { data?: { message?: string } } };
    throw new Error(e.response?.data?.message || "Request failed");
  }
  throw error instanceof Error ? error : new Error("Request failed");
}

function extractCategory(raw: CategoryResponse): Category {
  if ("category_name" in raw) return raw as Category;
  if ("category" in raw) return (raw as { category: Category }).category;
  if ("data" in raw) return (raw as { data: Category }).data;
  return raw as Category;
}

/**
 * Returns the MongoDB _id — used as the value in BuySell payload
 * because the BuySell schema stores category_id as ObjectId ref.
 */
export function getCategoryRowId(row: Category): string {
  return row._id;
}

/**
 * Returns the uuid/id string — used when fetching subcategories,
 * because the SubCategory schema stores category_id as the uuid string.
 * Backend validates: Category.findOne({ id: category_id })
 */
export function getCategoryUuid(row: Category): string {
  return row.id ?? row.uuid ?? row._id;
}

export type GetCategoriesOptions = {
  status?: string;
  activeOnly?: boolean;
};

export async function getCategories(
  options: GetCategoriesOptions = {},
): Promise<Category[]> {
  try {
    const params = new URLSearchParams();
    if (options.status) {
      params.set("status", options.status);
    } else if (options.activeOnly) {
      params.set("status", "active");
    }

    const query = params.toString();
    const url = query ? `/api/category/all?${query}` : "/api/category/all";
    const res = await axiosClient.get<Category[]>(url);
    return res.data ?? [];
  } catch (error) {
    normalizeError(error);
  }
}

export async function getCategory(id: string): Promise<Category> {
  try {
    const res = await axiosClient.get<CategoryResponse>(`/api/category/${id}`);
    return extractCategory(res.data);
  } catch (error) {
    normalizeError(error);
  }
}

export async function createCategory(payload: { category_name: string }) {
  try {
    const res = await axiosClient.post<{ message: string; category: Category }>(
      "/api/category/add",
      payload
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function updateCategory(id: string, payload: { category_name: string }) {
  try {
    const res = await axiosClient.put<{ message: string; category: Category }>(
      `/api/category/edit/${id}`,
      payload
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function deleteCategory(ids: string[]) {
  try {
    const res = await axiosClient.delete<{ message: string }>("/api/category/delete", {
      data: { ids },
    });
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function bulkUploadCategories(file: File): Promise<BulkUploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await axiosClient.post<BulkUploadResult>(
      '/api/category/bulk-upload',
      formData,
    );

    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}
