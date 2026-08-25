import axios from "axios";
import { joinApiUrl } from "@/src/config/BASE_URL";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { clearMarketplaceAuthStorage } from "@/lib/marketplaceUser";
import { notifyMarketplaceAuthChanged } from "@/lib/marketplaceAuth";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export const axiosClient = axios.create({
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.url = joinApiUrl(config.url);
    config.baseURL = "";
  }

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

axiosClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      clearMarketplaceAuthStorage();
      notifyMarketplaceAuthChanged();
    }
    return Promise.reject(error);
  },
);
