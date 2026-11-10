import { apiClient, tokenStore } from "./client";

export const authApi = {
  register: (payload) => apiClient.post("/auth/register", payload).then((r) => r.data),

  login: async (payload) => {
    const { data } = await apiClient.post("/auth/login", payload);
    tokenStore.set(data.access_token, data.refresh_token);
    return data;
  },

  logout: async () => {
    const refresh_token = tokenStore.getRefresh();
    try {
      if (refresh_token) await apiClient.post("/auth/logout", { refresh_token });
    } finally {
      tokenStore.clear();
    }
  },

  verifyEmail: (token) => apiClient.post("/auth/verify-email", { token }).then((r) => r.data),
  resendVerification: (email) => apiClient.post("/auth/resend-verification", { email }).then((r) => r.data),
  forgotPassword: (email) => apiClient.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (payload) => apiClient.post("/auth/reset-password", payload).then((r) => r.data),
};
