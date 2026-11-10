import { apiClient, sharedGet } from "./client";

// User-facing activity history — doubles as the recycle bin (filter by
// entityType and look at action:"delete" entries) and "undo my last
// change". Entries auto-expire 30 days after creation.
export const historyApi = {
  listPaged: (params) => sharedGet("/history/paged", { params }).then((r) => r.data),
  list: (entityType) => sharedGet("/history", { params: entityType ? { entity_type: entityType } : {} }).then((r) => r.data),
  undo: (slug) => apiClient.post(`/history/${slug}/undo`).then((r) => r.data),
  remove: (slug) => apiClient.delete(`/history/${slug}`),
};
