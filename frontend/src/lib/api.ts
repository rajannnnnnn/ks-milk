import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const api = axios.create({ baseURL: API_URL });

function getStoredTokens(prefix: "customer" | "admin" | "delivery") {
  const raw = localStorage.getItem(`ksmilk_${prefix}_auth`);
  return raw ? (JSON.parse(raw) as { accessToken: string; refreshToken: string }) : null;
}

export function storeTokens(prefix: "customer" | "admin" | "delivery", accessToken: string, refreshToken: string) {
  localStorage.setItem(`ksmilk_${prefix}_auth`, JSON.stringify({ accessToken, refreshToken }));
}

export function clearTokens(prefix: "customer" | "admin" | "delivery") {
  localStorage.removeItem(`ksmilk_${prefix}_auth`);
}

// Resolves which role's token to attach based on the current path, since all
// three apps share one bundle but keep independent sessions.
function currentPrefix(): "customer" | "admin" | "delivery" {
  if (location.pathname.startsWith("/admin")) return "admin";
  if (location.pathname.startsWith("/delivery")) return "delivery";
  return "customer";
}

api.interceptors.request.use((config) => {
  const prefix = currentPrefix();
  const tokens = getStoredTokens(prefix);
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const prefix = currentPrefix();
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const tokens = getStoredTokens(prefix);
      if (!tokens?.refreshToken) {
        clearTokens(prefix);
        return Promise.reject(error);
      }

      refreshing =
        refreshing ??
        api
          .post("/auth/refresh", { refreshToken: tokens.refreshToken })
          .then((res) => {
            storeTokens(prefix, res.data.accessToken, res.data.refreshToken);
            return res.data.accessToken as string;
          })
          .catch(() => {
            clearTokens(prefix);
            return null;
          })
          .finally(() => {
            refreshing = null;
          });

      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);

export interface ApiErrorBody {
  error?: { code: string; message: string };
}

export function extractErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const body = (err as { response?: { data?: ApiErrorBody } })?.response?.data;
  return body?.error?.message ?? fallback;
}
