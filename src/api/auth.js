import { apiClient, endSession, refreshAccessToken, tokenStore } from "./client";

const AUTH = "/web/auth";

function finishIfAuthenticated(res) {
  if (res.data?.status === "authenticated") tokenStore.setSession(res.data); // refresh token arrives as the HttpOnly cookie
  return res.data;
}

export const authApi = {
  register: (payload) => apiClient.post(`${AUTH}/register`, payload).then((r) => r.data),

  login: async (payload) => {
    const { data } = await apiClient.post(`${AUTH}/login`, payload);
    tokenStore.setSession(data); // access token -> memory only; the refresh token arrives as an HttpOnly cookie
    return data;
  },

  /** Silent sign-in on page load: trades the refresh cookie for an access token. Rejects when signed out. */
  restoreSession: () => refreshAccessToken(),

  /** Ends THIS browser's session on the server (other devices stay signed in), then tells every tab. */
  logout: async () => {
    try {
      await apiClient.post(`${AUTH}/logout`);
    } finally {
      endSession("logged_out");
    }
  },

  // ---- Google sign-in (see GoogleAuth.jsx). Outcomes: authenticated | link_required | profile_required
  googleLogin: (idToken, nonce) => apiClient.post(`${AUTH}/google`, { id_token: idToken, nonce }).then(finishIfAuthenticated),
  googleComplete: (payload) => apiClient.post(`${AUTH}/google/complete`, payload).then(finishIfAuthenticated),
  googleLink: (ticket, password) => apiClient.post(`${AUTH}/google/link`, { ticket, password }).then(finishIfAuthenticated),

  // ---- step-up re-authentication + device/session management
  /** Returns a short-lived token (header `X-Reauth-Token`) that unlocks sensitive actions for this session. */
  reauth: (password) => apiClient.post(`${AUTH}/reauth`, { password }).then((r) => r.data.reauth_token),
  sessions: () => apiClient.get(`${AUTH}/sessions`).then((r) => r.data),
  revokeSession: (publicId, reauthToken) =>
    apiClient.delete(`${AUTH}/sessions/${publicId}`, { headers: { "X-Reauth-Token": reauthToken } }),
  revokeOtherSessions: (reauthToken) =>
    apiClient.post(`${AUTH}/sessions/revoke-others`, null, { headers: { "X-Reauth-Token": reauthToken } }).then((r) => r.data),

  verifyEmail: (token) => apiClient.post(`${AUTH}/verify-email`, { token }).then((r) => r.data),
  resendVerification: (email) => apiClient.post(`${AUTH}/resend-verification`, { email }).then((r) => r.data),
  forgotPassword: (email) => apiClient.post(`${AUTH}/forgot-password`, { email }).then((r) => r.data),
  resetPassword: (payload) => apiClient.post(`${AUTH}/reset-password`, payload).then((r) => r.data),
};
