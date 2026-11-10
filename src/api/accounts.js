import { apiClient, sharedGet } from "./client";

export const accountsApi = {
  list: (params) => sharedGet("/accounts", { params }).then((r) => r.data),
  create: (payload) => apiClient.post("/accounts", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/accounts/${slug}`, payload).then((r) => r.data),
  remove: (slug, confirm = false) => apiClient.delete(`/accounts/${slug}`, { params: confirm ? { confirm: true } : {} }),
};
