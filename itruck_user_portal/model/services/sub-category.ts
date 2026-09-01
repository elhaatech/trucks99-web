import { axiosClient } from "./axiosClient";

export type SubCategory = {
  _id: string;
  id?: string;
  uuid?: string;
  sub_category_name: string;
  // category_id is stored as the uuid/id string in the SubCategory collection
  // because the subcategory backend does: Category.findOne({ id: category_id })
  category_id: string;
  status: string;
  created_by?: string;
  updated_by?: string;
  createdAt?: string;
  updatedAt?: string;
  category?: {
    _id: string;
    id?: string;
    uuid?: string;
    category_name: string;
  };
};

type SubCategoryResponse =
  | SubCategory
  | { data: SubCategory }
  | { sub_category: SubCategory };

function asRecordId(value: unknown): string {
  return value == null ? "" : String(value);
}

function normalizeError(error: unknown): never {
  if (typeof error === "object" && error && "response" in error) {
    const e = error as { response?: { data?: { message?: string } } };
    throw new Error(e.response?.data?.message || "Request failed");
  }
  throw error instanceof Error ? error : new Error("Request failed");
}

function extractSubCategory(raw: SubCategoryResponse): SubCategory {
  if ("sub_category_name" in raw) return raw as SubCategory;
  if ("sub_category" in raw) return (raw as { sub_category: SubCategory }).sub_category;
  if ("data" in raw) return (raw as { data: SubCategory }).data;
  return raw as SubCategory;
}

/**
 * Returns the MongoDB _id for use in BuySell payload (ObjectId ref).
 */
export function getSubCategoryRowId(row: SubCategory): string {
  return asRecordId(row._id ?? row.id ?? row.uuid ?? "");
}

export type GetSubCategoriesOptions = {
  /** When true (default for dropdowns), return only active subcategories. */
  activeOnly?: boolean;
  /** Explicit status filter — overrides activeOnly when set. */
  status?: string;
  /** Admin lists: include inactive subcategories (disables activeOnly). */
  includeInactive?: boolean;
};

/**
 * Fetch sub-categories, optionally filtered by parent category.
 *
 * The SubCategory schema stores category_id as the category uuid string
 * (not MongoDB _id). Pass either uuid or Mongo _id — the backend resolves both.
 *
 * @param categoryId - parent category uuid, Mongo _id, or business id
 */
export async function getSubCategories(
  categoryId?: string,
  options: GetSubCategoriesOptions = {},
): Promise<SubCategory[]> {
  try {
    const { activeOnly = !options.includeInactive, status, includeInactive } =
      options;

    const body: Record<string, unknown> = {};

    if (categoryId) {
      body.search = [categoryId];
      body.category_id = categoryId;
      body.categoryId = categoryId;
    } else {
      body.search = [];
    }

    if (status) {
      body.status = status;
    } else if (activeOnly && !includeInactive) {
      body.activeOnly = true;
    }

    if (includeInactive) {
      body.includeInactive = true;
    }

    const res = await axiosClient.post<SubCategory[]>(
      "/api/sub-category/all",
      body,
    );
    return res.data ?? [];
  } catch (error) {
    normalizeError(error);
  }
}

export type BulkUploadResult = {
  message?: string;
  total?: number;
  inserted?: number;
  skipped?: number;
  errors?: { row: number; message: string }[];
};

export async function getSubCategory(id: string): Promise<SubCategory> {
  try {
    const res = await axiosClient.get<SubCategoryResponse>(`/api/sub-category/${id}`);
    return extractSubCategory(res.data);
  } catch (error) {
    normalizeError(error);
  }
}

export async function bulkUploadSubCategories(file: File): Promise<BulkUploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await axiosClient.post<BulkUploadResult>(
      '/api/sub-category/bulk-upload',
      formData,
    );

    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

/**
 * Create a sub-category.
 * category_id must be the uuid/id of the parent category (NOT _id).
 * Backend validates: Category.findOne({ id: category_id })
 */
export async function createSubCategory(payload: {
  category_id: string; // uuid of parent category
  sub_category_name: string;
}) {
  try {
    const res = await axiosClient.post<{ message: string; sub_category: SubCategory }>(
      "/api/sub-category/add",
      payload
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

/**
 * Update a sub-category.
 * category_id must be the uuid/id of the parent category (NOT _id).
 */
export async function updateSubCategory(
  id: string,
  payload: { category_id: string; sub_category_name: string }
) {
  try {
    const res = await axiosClient.put<{ message: string; sub_category: SubCategory }>(
      `/api/sub-category/edit/${id}`,
      payload
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function deleteSubCategory(ids: string[]) {
  try {
    const res = await axiosClient.delete<{ message: string }>("/api/sub-category/delete", {
      data: { ids },
    });
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}