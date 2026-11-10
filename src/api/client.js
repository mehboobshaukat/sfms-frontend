import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

/** Resolve backend-served media such as /media/profile_images/... against the API host. */
export function backendAssetUrl(value) {
  if (!value) return null;
  if (/^(?:https?:|data:|blob:)/i.test(value)) return value;
  try {
    const origin = new URL(API_BASE_URL, window.location.origin).origin;
    return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
  } catch {
    return value;
  }
}

const ACCESS_KEY = "sfms_access_token";
const REFRESH_KEY = "sfms_refresh_token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Auto-refresh-on-401 with a single in-flight refresh shared by all callers ----
let refreshPromise = null;

async function performRefresh() {
  const refresh_token = tokenStore.getRefresh();
  if (!refresh_token) throw new Error("No refresh token");
  const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refresh_token });
  tokenStore.set(res.data.access_token, res.data.refresh_token);
  return res.data.access_token;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRoute = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh-token");

    if (error.response?.status === 401 && !original._retry && !isAuthRoute && tokenStore.getRefresh()) {
      original._retry = true;
      try {
        if (!refreshPromise) refreshPromise = performRefresh().finally(() => (refreshPromise = null));
        const newAccess = await refreshPromise;
        original.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      } catch (refreshErr) {
        tokenStore.clear();
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

// Share *in-flight only* identical GET requests, e.g. React StrictMode
// development effect replays or two widgets requesting the same summary.
// No completed responses are cached: mutations always see fresh data.
const inflightReads = new Map();

export function sharedGet(url, config = {}) {
  // Params in this app are simple flat objects (page, range, filters).
  // Account identity is part of the key to avoid cross-login coalescing.
  const params = Object.entries(config.params || {}).sort(([a], [b]) => a.localeCompare(b));
  const key = JSON.stringify([url, params, tokenStore.getAccess()]);
  const pending = inflightReads.get(key);
  if (pending) return pending;
  const request = apiClient.get(url, config);
  inflightReads.set(key, request);
  request.then(
    () => { if (inflightReads.get(key) === request) inflightReads.delete(key); },
    () => { if (inflightReads.get(key) === request) inflightReads.delete(key); },
  );
  return request;
}

/** Extracts a friendly message from a FastAPI error response. */
export function apiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail) && typeof detail.message === "string") {
    // Our deletion-guard 409s: {status: "blocked"|"confirm", message, cascade?}
    return detail.message;
  }
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join(" ");
  }
  if (error?.response?.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (error?.response?.status === 423) return detail || "Account temporarily locked. Try again later.";
  if (error?.message === "Network Error") return "Can't reach the server. Check your connection and try again.";
  return fallback;
}

/**
 * Reads a delete-guard 409 response (see backend app/crud/deletion_guard.py)
 * off an axios error. Returns null for any other kind of error so callers
 * can fall back to apiErrorMessage() for a plain toast.
 *
 *   { status: "blocked", message }
 *   { status: "confirm", message, cascade: { label: count, ... } }
 */
export function getDeletionPlan(error) {
  if (error?.response?.status !== 409) return null;
  const detail = error?.response?.data?.detail;
  if (!detail || typeof detail !== "object") return null;
  if (detail.status !== "blocked" && detail.status !== "confirm") return null;
  return detail;
}
