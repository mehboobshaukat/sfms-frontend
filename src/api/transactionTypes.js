import { apiClient, sharedGet } from "./client";

export const transactionTypesApi = {
  listPaged: (params) => sharedGet("/transaction-types/paged", { params }).then((r) => r.data),
  list: (params) => sharedGet("/transaction-types", { params }).then((r) => r.data),
  create: (payload) => apiClient.post("/transaction-types", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/transaction-types/${slug}`, payload).then((r) => r.data),
  remove: (slug, confirm = false) =>
    apiClient.delete(`/transaction-types/${slug}`, { params: confirm ? { confirm: true } : {} }),
};
