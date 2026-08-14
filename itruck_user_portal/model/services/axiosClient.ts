import axios from "axios";
import { resolveApiBase } from "@/lib/apiBase";

const TOKEN_KEY = "itruck_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export const axiosClient = axios.create({
  baseURL: resolveApiBase(),
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  // Re-resolve on every request so deploy host never stays stuck on localhost
  config.baseURL = resolveApiBase();

  const token = getToken();
  const headers = config.headers || {};

  if (token) {
    if (typeof (headers as any).set === "function") {
      (headers as any).set("Authorization", `Bearer ${token}`);
    } else {
      (headers as any).Authorization = `Bearer ${token}`;
    }
  }

  // Let the browser/Axios set multipart boundary. AxiosHeaders.delete is required —
  // `delete headers["Content-Type"]` does not clear the accessor on Axios 1.x.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (typeof (headers as any).delete === "function") {
      (headers as any).delete("Content-Type");
    } else {
      delete (headers as any)["Content-Type"];
      delete (headers as any)["content-type"];
    }
  } else if (!headers["Content-Type"] && !headers["content-type"]) {
    if (typeof (headers as any).set === "function") {
      (headers as any).set("Content-Type", "application/json");
    } else {
      (headers as any)["Content-Type"] = "application/json";
    }
  }

  config.headers = headers;
  return config;
});
