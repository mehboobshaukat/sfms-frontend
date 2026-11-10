import { apiClient, sharedGet } from "./client";

export const paymentMethodsApi = {
  listPaged: (params) => sharedGet("/payment-methods/paged", { params }).then((r) => r.data),
  list: (params) => sharedGet("/payment-methods", { params }).then((r) => r.data),
  create: (payload) => apiClient.post("/payment-methods", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/payment-methods/${slug}`, payload).then((r) => r.data),
  remove: (slug) => apiClient.delete(`/payment-methods/${slug}`),
};
