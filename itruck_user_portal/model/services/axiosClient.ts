import axios from "axios";
import { API_BASE } from "./common";

const TOKEN_KEY = "itruck_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export const axiosClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  const headers = config.headers || {};

  if (token) {
    (headers as any).Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete (headers as any)["Content-Type"];
    delete (headers as any)["content-type"];
  } else if (!headers["Content-Type"] && !headers["content-type"]) {
    (headers as any)["Content-Type"] = "application/json";
  }

  config.headers = headers;
  return config;
});
