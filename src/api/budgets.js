import { apiClient, sharedGet } from "./client";

export const budgetsApi = {
  list: (params) => sharedGet("/budgets", { params }).then((r) => r.data),
  current: () => sharedGet("/budgets/current").then((r) => r.data),
  create: (payload) => apiClient.post("/budgets", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/budgets/${slug}`, payload).then((r) => r.data),
  remove: (slug, confirm = false) => apiClient.delete(`/budgets/${slug}`, { params: confirm ? { confirm: true } : {} }),
};
