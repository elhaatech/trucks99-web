import axios from "axios";
import { axiosClient } from "./axiosClient";

export type UploadResponse = {
  message: string;
  path: string;
  url: string;
  filename: string;
  folder: string;
};

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Returns an error message if the file is not a valid profile image, otherwise null. */
export function validateProfileImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please select a valid image file.";
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return "Image must be smaller than 5MB.";
  }
  return null;
}

/**
 * Uploads a single file to /api/upload under a given folder "key"
 * (must be one of the allowedFolders on the backend, e.g. "buy_sell_doc").
 *
 * Field names match multer: `key` (folder) + `file` (binary).
 * Do not set Content-Type — Axios must add the multipart boundary.
 */
export async function uploadFile(file: File, key: string): Promise<string> {
  const formData = new FormData();
  // Text fields MUST come before the file so multer can read `key` in destination().
  formData.append("key", key);
  formData.append("file", file);

  try {
    const res = await axiosClient.post<UploadResponse>(
      `/api/upload?key=${encodeURIComponent(key)}`,
      formData,
    );

    const url = res.data?.url || res.data?.path;
    if (!url) {
      throw new Error("Upload succeeded but no image path was returned.");
    }
    return url;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const message =
        (err.response?.data as { message?: string } | undefined)?.message ||
        err.message ||
        "Failed to upload file.";
      throw new Error(message);
    }
    throw err;
  }
}
