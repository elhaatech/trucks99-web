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

export async function getSpecifications(
  params: ListParams = {}
): Promise<Specification[]> {
  try {
    const res = await axiosClient.get<Specification[]>("/api/specifications", {
      params,
    });
    return res.data ?? [];
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
    const res = await axiosClient.get<SpecificationValue[]>(
      "/api/specification-values",
      { params }
    );
    return res.data ?? [];
  } catch (error) {
    normalizeError(error);
  }
}

export async function getSpecificationValue(
  id: string
): Promise<SpecificationValue> {
  try {
    const res = await axiosClient.get<SpecificationValue[]>(
      "/api/specification-values",
      { params: { specification_value_id: id } }
    );
    const item = Array.isArray(res.data) ? res.data[0] : undefined;
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