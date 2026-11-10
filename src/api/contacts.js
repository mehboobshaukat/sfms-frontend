import { apiClient, sharedGet } from "./client";

export const contactsApi = {
  // Pass { category_slug } alone for the transaction form's auto-loaded
  // list (union across all linked groups); add group_slug to narrow.
  listPaged: (params) => sharedGet("/contacts/paged", { params }).then((r) => r.data),
  list: (params) => sharedGet("/contacts", { params }).then((r) => r.data),
  create: (payload) => apiClient.post("/contacts", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/contacts/${slug}`, payload).then((r) => r.data),
  remove: (slug) => apiClient.delete(`/contacts/${slug}`),
  link: (slug, groupSlug) => apiClient.post(`/contacts/${slug}/link/${groupSlug}`).then((r) => r.data),
  unlink: (slug, groupSlug) => apiClient.delete(`/contacts/${slug}/link/${groupSlug}`).then((r) => r.data),
};
