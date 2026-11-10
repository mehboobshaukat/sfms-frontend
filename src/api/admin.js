import { apiClient } from "./client";

const data = (res) => res.data;
const enc = encodeURIComponent;

// Admin layer: everything under /admin/* (the backend checks the role on every call).
export const adminApi = {
  me: () => apiClient.get("/admin/me").then(data),

  // ---- contact messages ----
  messageStats: () => apiClient.get("/admin/messages/stats").then(data),
  listMessages: (params) => apiClient.get("/admin/messages", { params }).then(data),
  getMessage: (slug) => apiClient.get(`/admin/messages/${enc(slug)}`).then(data),
  updateMessage: (slug, patch) => apiClient.patch(`/admin/messages/${enc(slug)}`, patch).then(data),
  bulkMessages: (slugs, action) => apiClient.post("/admin/messages/bulk", { slugs, action }).then(data),
  trashMessage: (slug) => apiClient.delete(`/admin/messages/${enc(slug)}`),
  restoreMessage: (slug) => apiClient.post(`/admin/messages/${enc(slug)}/restore`).then(data),
  replyToMessage: (slug, payload) => apiClient.post(`/admin/messages/${enc(slug)}/replies`, payload).then(data),

  // ---- users ----
  listUsers: (params) => apiClient.get("/admin/users", { params }).then(data),
  getUser: (username) => apiClient.get(`/admin/users/${enc(username)}`).then(data),
  blockUser: (username, reason) => apiClient.post(`/admin/users/${enc(username)}/block`, { reason }).then(data),
  unblockUser: (username) => apiClient.post(`/admin/users/${enc(username)}/unblock`).then(data),
  unlockUser: (username) => apiClient.post(`/admin/users/${enc(username)}/unlock`).then(data),
  revokeSessions: (username) => apiClient.post(`/admin/users/${enc(username)}/revoke-sessions`).then(data),
  resendVerification: (username) => apiClient.post(`/admin/users/${enc(username)}/resend-verification`).then(data),

  // ---- admins (super admin only) ----
  listAdmins: () => apiClient.get("/admin/admins").then(data),
  promoteAdmin: (username, password) => apiClient.post("/admin/admins", { username, password }).then(data),
  removeAdmin: (username, password) => apiClient.post(`/admin/admins/${enc(username)}/remove`, { password }).then(data),
};
