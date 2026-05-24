import axios, { type AxiosRequestConfig } from "axios";
import type { AttachmentKind } from "@/types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: attach Bearer token ────────────────────────────────
api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// ─── Response interceptor: silent token refresh on 401 ──────────────────────
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        if (!refreshing) {
          const refresh = localStorage.getItem("refresh");
          if (!refresh) throw new Error("No refresh token");

          refreshing = axios
            .post(`${BASE_URL}/api/auth/refresh/`, { refresh })
            .then((res) => {
              const newAccess: string = res.data.access;
              localStorage.setItem("access", newAccess);
              return newAccess;
            })
            .finally(() => {
              refreshing = null;
            });
        }

        const newAccess = await refreshing;
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newAccess}`,
        };
        return api(original);
      } catch {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export const mediaUrl = (path: string) => {
  const base = import.meta.env.VITE_MEDIA_BASE_URL ?? "http://localhost:8000";
  return path.startsWith("http") ? path : `${base}${path}`;
};

export const attachmentUrl = (path: string, kind: AttachmentKind) => {
  if (path.startsWith("http")) {
    return path;
  }

  const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE_URL;
  if (cloudinaryBase) {
    const normalizedBase = cloudinaryBase.replace(/\/+$/, "");
    const normalizedPath = path.replace(/^\/?media\//, "").replace(/^\/+/, "");
    const resourceType =
      kind === "video" ? "video" : kind === "pdf" ? "raw" : "image";

    return `${normalizedBase}/${resourceType}/upload/${normalizedPath}`;
  }

  return mediaUrl(path);
};
