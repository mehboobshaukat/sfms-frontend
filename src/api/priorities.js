import { apiClient, sharedGet } from "./client";

export const prioritiesApi = {
  listPaged: (params) => sharedGet("/priorities/paged", { params }).then((r) => r.data),
  list: (params) => sharedGet("/priorities", { params }).then((r) => r.data),
  create: (payload) => apiClient.post("/priorities", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/priorities/${slug}`, payload).then((r) => r.data),
  remove: (slug, confirm = false) => apiClient.delete(`/priorities/${slug}`, { params: confirm ? { confirm: true } : {} }),
};
