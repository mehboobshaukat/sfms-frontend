import { apiClient, sharedGet } from "./client";

export const goalsApi = {
  list: () => sharedGet("/goals").then((r) => r.data),
  progress: () => sharedGet("/goals/progress").then((r) => r.data),
  create: (payload) => apiClient.post("/goals", payload).then((r) => r.data),
  update: (slug, payload) => apiClient.put(`/goals/${slug}`, payload).then((r) => r.data),
  addSavings: (slug, payload) => apiClient.post(`/goals/${slug}/add-savings`, payload).then((r) => r.data),
  releaseSavings: (slug, payload) => apiClient.post(`/goals/${slug}/release-savings`, payload).then((r) => r.data),
  savingsSummary: () => sharedGet("/goals/savings-summary").then((r) => r.data),
  remove: (slug, confirm = false) => apiClient.delete(`/goals/${slug}`, { params: confirm ? { confirm: true } : {} }),
};
