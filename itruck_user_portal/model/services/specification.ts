import { axiosClient } from "./axiosClient";

export type SpecificationType =
  | "selectable"
  | "input"
  | "date"
  | "datetime"
  | "number"
  | "file"
  | "multiselect";

export type YesNo = "Yes" | "No";
export type ActiveInactive = "Active" | "Inactive";

export type Specification = {
  subcategory_id: string;
  _id: string;
  id?: string;
  specification_name: string;
  type: SpecificationType;
  is_required: YesNo;
  need_filter?: YesNo;
  status: ActiveInactive;
  created_date?: string;
  created_by?: string;
  updated_date?: string;
  updated_by?: string;
  number_min?: number | null;
  number_max?: number | null;
  number_decimal?: YesNo;
  date_min?: string | null;
  date_max?: string | null;
  file_max_size_mb?: number | null;
  file_allowed_types?: string[];
  file_multiple?: YesNo;
};

export type SpecificationValue = {
  _id: string;
  id?: string;
  specification_id: string;
  // Scopes this value (e.g. a brand) to the sub category it belongs to,
  // so brand lists can be filtered per sub category instead of globally.
  subcategory_id: string;
  specification_value_name: string;
  status: ActiveInactive;
  specification?: any,
}

type ListParams = {
  search?: string;
  status?: string;
  specification_id?: string;
  specification_value_id?: string;
  subcategory_id?: string;
};

export type CreateSpecificationPayload = {
  specification_name: string;
  type?: SpecificationType;
  is_required?: YesNo;
  need_filter?: YesNo;
  status?: ActiveInactive;
  number_min?: number | null;
  number_max?: number | null;
  number_decimal?: YesNo;
  date_min?: string | null;
  date_max?: string | null;
  file_max_size_mb?: number | null;
  file_allowed_types?: string[];
  file_multiple?: YesNo;
};

export type UpdateSpecificationPayload = {
  specification_name: string;
  type: SpecificationType;
  is_required: YesNo;
  need_filter: YesNo;
  status: ActiveInactive;
  number_min?: number | null;
  number_max?: number | null;
  number_decimal?: YesNo;
  date_min?: string | null;
  date_max?: string | null;
  file_max_size_mb?: number | null;
  file_allowed_types?: string[];
  file_multiple?: YesNo;
};

// ─── Add these to your existing model/api.ts ────────────────────────────
// (types + functions only — everything else in your file stays as-is)

export type BulkUploadResult = {
  message?: string;
  total?: number;
  inserted?: number;
  skipped?: number;
  errors?: { row: number; message: string }[];
  created?: any[];
};

export async function bulkUploadSpecifications(
  file: File
): Promise<BulkUploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axiosClient.post<BulkUploadResult>(
      "/api/specifications/bulk-upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function bulkUploadSpecificationValues(
  file: File
): Promise<BulkUploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axiosClient.post<BulkUploadResult>(
      "/api/specification-values/bulk-upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

function normalizeError(error: unknown): never {
  if (typeof error === "object" && error && "response" in error) {
    const e = error as { response?: { data?: { message?: string } } };
    throw new Error(e.response?.data?.message || "Request failed");
  }
  throw error instanceof Error ? error : new Error("Request failed");
}

/** Prefer Mongo _id for buy/sell refs; fall back to catalog uuid. */
export function getSpecificationRowId(item?: {
  _id?: unknown;
  id?: unknown;
} | null): string {
  if (!item) return "";
  const oid = item._id != null ? String(item._id) : "";
  if (/^[a-fA-F0-9]{24}$/.test(oid)) return oid;
  const id = item.id != null ? String(item.id) : "";
  return id || oid;
}

export function getSpecificationValueRowId(item?: {
  _id?: unknown;
  id?: unknown;
} | null): string {
  return getSpecificationRowId(item);
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const list = obj.data ?? obj.specifications ?? obj.specification_values ?? obj.items ?? obj.rows;
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}

function normalizeSpecification(row: Specification): Specification {
  const _id = getSpecificationRowId(row);
  return {
    ...row,
    _id,
    id: row.id || _id,
  };
}

function normalizeSpecificationValue(row: SpecificationValue): SpecificationValue {
  const _id = getSpecificationValueRowId(row);
  return {
    ...row,
    _id,
    id: row.id || _id,
    specification_id: row.specification_id
      ? getSpecificationRowId({
          _id: row.specification_id,
          id: (row.specification as { id?: string } | undefined)?.id,
        }) || String(row.specification_id)
      : row.specification_id,
  };
}

export async function getSpecifications(
  params: ListParams = {}
): Promise<Specification[]> {
  try {
    const res = await axiosClient.get<unknown>("/api/specifications", {
      params,
    });
    return unwrapList<Specification>(res.data).map(normalizeSpecification);
  } catch (error) {
    normalizeError(error);
  }
}

export async function getSpecification(id: string): Promise<Specification> {
  try {
    const res = await axiosClient.get<Specification>(
      `/api/specifications/${id}`
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function createSpecification(
  payload: CreateSpecificationPayload
) {
  try {
    const res = await axiosClient.post<{
      message: string;
      specification: Specification;
    }>("/api/specifications", payload);
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function updateSpecification(
  id: string,
  payload: UpdateSpecificationPayload
) {
  try {
    const res = await axiosClient.put<{
      message: string;
      specification: Specification;
    }>(`/api/specifications/${id}`, payload);
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function deleteSpecification(id: string) {
  try {
    const res = await axiosClient.delete<{ message: string }>(
      `/api/specifications/${id}`
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getSpecificationValues(
  params: ListParams = {}
): Promise<SpecificationValue[]> {
  try {
    const res = await axiosClient.get<unknown>(
      "/api/specification-values",
      { params }
    );
    return unwrapList<SpecificationValue>(res.data).map(normalizeSpecificationValue);
  } catch (error) {
    normalizeError(error);
  }
}

export async function getSpecificationValue(
  id: string
): Promise<SpecificationValue> {
  try {
    const res = await axiosClient.get<unknown>(
      "/api/specification-values",
      { params: { specification_value_id: id } }
    );
    const rows = unwrapList<SpecificationValue>(res.data).map(normalizeSpecificationValue);
    const item = rows[0];
    if (!item) throw new Error("Specification value not found");
    return item;
  } catch (error) {
    normalizeError(error);
  }
}

export async function createSpecificationValue(payload: {
  specification_id: string;
  subcategory_id: string;
  specification_value_name: string;
}) {
  try {
    const res = await axiosClient.post<{
      message: string;
      specification_value: SpecificationValue;
    }>("/api/specification-values", payload);
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function updateSpecificationValue(
  id: string,
  payload: {
    specification_id: string;
    subcategory_id: string;
    specification_value_name: string;
    status: ActiveInactive;
  }
) {
  try {
    const res = await axiosClient.put<{
      message: string;
      specification_value: SpecificationValue;
    }>(`/api/specification-values/${id}`, payload);
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function deleteSpecificationValue(id: string) {
  try {
    const res = await axiosClient.delete<{ message: string }>(
      `/api/specification-values/${id}`
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}