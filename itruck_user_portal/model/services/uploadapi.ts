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
  // Text fields MUST come before the file so multer can read `key` in destination().
  formData.append("key", key);
  formData.append("file", file);

  const res = await axiosClient.post<UploadResponse>(
    `/api/upload?key=${encodeURIComponent(key)}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return res.data.url || res.data.path;
}
