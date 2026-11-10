import { apiClient, sharedGet } from "./client";

export const creditPurchasesApi = {
  // credit_type: "received" (items you got, you owe money) | "given" (items you handed over, you're owed money)
  list: (params) => sharedGet("/credit-purchases", { params }).then((r) => r.data),
  outstandingTotals: () => sharedGet("/credit-purchases/outstanding-totals").then((r) => r.data),
  get: (slug) => sharedGet(`/credit-purchases/${slug}`).then((r) => r.data),
  create: (payload) => apiClient.post("/credit-purchases", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/credit-purchases/${slug}`, payload).then((r) => r.data),
  remove: (slug) => apiClient.delete(`/credit-purchases/${slug}`),
};
