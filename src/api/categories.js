import { apiClient, sharedGet } from "./client";

export const categoriesApi = {
  listPaged: (params) => sharedGet("/categories/paged", { params }).then((r) => r.data),
  list: (params) => sharedGet("/categories", { params }).then((r) => r.data),
  create: (payload) => apiClient.post("/categories", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/categories/${slug}`, payload).then((r) => r.data),
  remove: (slug, confirm = false) => apiClient.delete(`/categories/${slug}`, { params: confirm ? { confirm: true } : {} }),
  // Option-B reuse: link an already-existing category to another transaction type instead of duplicating it.
  link: (slug, transactionTypeSlug) => apiClient.post(`/categories/${slug}/link/${transactionTypeSlug}`).then((r) => r.data),
  unlink: (slug, transactionTypeSlug) => apiClient.delete(`/categories/${slug}/link/${transactionTypeSlug}`).then((r) => r.data),
};
