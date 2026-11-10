import { apiClient, sharedGet } from "./client";

export const transactionsApi = {
  list: (params) => sharedGet("/transactions", { params }).then((r) => r.data),
  filter: (payload) => apiClient.post("/transactions/filter", payload).then((r) => r.data),
  get: (transactionCode) => sharedGet(`/transactions/${transactionCode}`).then((r) => r.data),
  create: (payload) => apiClient.post("/transactions", payload).then((r) => r.data),
  update: (transactionCode, payload) => apiClient.put(`/transactions/${transactionCode}`, payload).then((r) => r.data),
  remove: (transactionCode) => apiClient.delete(`/transactions/${transactionCode}`),
};
