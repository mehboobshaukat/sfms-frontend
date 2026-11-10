import { apiClient, sharedGet } from "./client";

export const groupsApi = {
  listPaged: (params) => sharedGet("/groups/paged", { params }).then((r) => r.data),
  list: (params) => sharedGet("/groups", { params }).then((r) => r.data),
  create: (payload) => apiClient.post("/groups", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/groups/${slug}`, payload).then((r) => r.data),
  remove: (slug, confirm = false) => apiClient.delete(`/groups/${slug}`, { params: confirm ? { confirm: true } : {} }),
  link: (slug, categorySlug) => apiClient.post(`/groups/${slug}/link/${categorySlug}`).then((r) => r.data),
  unlink: (slug, categorySlug) => apiClient.delete(`/groups/${slug}/link/${categorySlug}`).then((r) => r.data),
};
