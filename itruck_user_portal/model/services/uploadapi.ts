import { axiosClient } from "./axiosClient";

export type UploadResponse = {
  message: string;
  path: string;
  url: string;
  filename: string;
  folder: string;
};

/**
 * Uploads a single file to /api/upload under a given folder "key"
 * (must be one of the allowedFolders on the backend, e.g. "buy_sell_doc").
 */
export async function uploadFile(file: File, key: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", key);

  const res = await axiosClient.post<UploadResponse>("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.url || res.data.path;
}