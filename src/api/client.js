import axios from "axios";

/**
 * Base URL of the SFMS API, including the /api prefix.
 *
 *   "/api"                         (default) the website proxies /api/* to the backend (see vercel.json and
 *                                   the dev proxy in vite.config.js). The browser only ever talks to ONE origin,
 *                                   so the refresh cookie is first-party and works even if the website and the
 *                                   API live on completely different domains.
 *   "https://api.sfms.xyz/api"     direct calls. Only valid when the site and the API share a registrable
 *                                   domain (sfms.xyz + api.sfms.xyz); then the backend's CORS_ORIGINS must list
 *                                   this site and WEB_COOKIE_DOMAIN may be set.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

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

// ---------------------------------------------------------------------------
// Session handling
//
//  * The ACCESS token lives only in this JavaScript variable. It is never written to localStorage /
//    sessionStorage / cookies, so a page reload starts without one and silently asks for a new one.
//  * The REFRESH credential is an HttpOnly cookie set by the backend. JavaScript cannot read it.
//  * Every call that depends on that cookie carries `X-SFMS-Client: web` (CSRF protection).
// ---------------------------------------------------------------------------
const AUTH = "/web/auth";
const CLIENT_HEADERS = { "X-SFMS-Client": "web" };
const SIGNED_IN_HINT = "sfms_signed_in"; // not a secret: lets signed-out visitors skip a pointless refresh call

let accessToken = null;
let sessionExpiresAt = null;

const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("sfms-auth") : null;

export const tokenStore = {
  getAccess: () => accessToken,
  getSessionExpiresAt: () => sessionExpiresAt,
  /** Stores the result of a login / refresh response. */
  setSession: (data) => {
    accessToken = data.access_token;
    sessionExpiresAt = data.session_expires_at ? new Date(data.session_expires_at) : null;
    try { localStorage.setItem(SIGNED_IN_HINT, "1"); } catch { /* storage blocked: fine */ }
  },
  clear: () => {
    accessToken = null;
    sessionExpiresAt = null;
    try { localStorage.removeItem(SIGNED_IN_HINT); } catch { /* ignore */ }
  },
  mayHaveSession: () => {
    try { return localStorage.getItem(SIGNED_IN_HINT) === "1"; } catch { return true; }
  },
};

/** Messages for the ways a session can end (codes come from the backend's `detail.code`). */
const SESSION_END_MESSAGES = {
  session_expired: "Your session has expired. Please log in again.",
  session_revoked: "For your security this session was ended. Please log in again.",
  session_ended: "Your session has ended. Please log in again.",
  no_session: "Please log in to continue.",
};

export function sessionEndMessage(code) {
  return SESSION_END_MESSAGES[code] || "Please log in again to continue.";
}

/** Tells the app (and other tabs) that this browser no longer has a session. */
export function endSession(code, { broadcast = true } = {}) {
  tokenStore.clear();
  window.dispatchEvent(new CustomEvent("sfms:session-ended", { detail: { code } }));
  if (broadcast && channel) channel.postMessage({ type: "session-ended", code });
}
if (channel) {
  channel.onmessage = (ev) => {
    if (ev.data?.type === "session-ended") endSession(ev.data.code, { broadcast: false });
  };
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // the refresh cookie is only ever sent to /web/auth/*; harmless elsewhere
  headers: CLIENT_HEADERS,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Refresh: one in-flight call per tab, serialised across tabs --------------------------------
let refreshPromise = null;

async function requestRefresh() {
  const res = await axios.post(`${API_BASE_URL}${AUTH}/refresh`, null, { withCredentials: true, headers: CLIENT_HEADERS });
  tokenStore.setSession(res.data);
  return res.data.access_token;
}

/**
 * Exchanges the refresh cookie for a new access token. Browser tabs share one cookie, so concurrent
 * refreshes from several tabs are queued with the Web Locks API instead of racing each other.
 */
export function refreshAccessToken() {
  if (!refreshPromise) {
    const run = () => requestRefresh();
    const locked = typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request("sfms-refresh", run) : run();
    refreshPromise = Promise.resolve(locked).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

const isAuthUrl = (url = "") => url.includes(`${AUTH}/login`) || url.includes(`${AUTH}/refresh`) || url.includes(`${AUTH}/logout`);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && !isAuthUrl(original.url)) {
      original._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      } catch (refreshErr) {
        // Only a definite refusal ends the session. A network hiccup while refreshing must not log anyone out.
        const status = refreshErr?.response?.status;
        if (status === 401 || status === 403) {
          endSession(refreshErr.response?.data?.detail?.code || "session_ended");
        }
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
  if (error?.response?.status === 429) {
    const wait = Number(error.response.headers?.["retry-after"]);
    return wait > 0
      ? `Too many attempts. Please try again in ${wait >= 90 ? `${Math.ceil(wait / 60)} minutes` : `${wait} seconds`}.`
      : "Too many requests. Please wait a moment and try again.";
  }
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
