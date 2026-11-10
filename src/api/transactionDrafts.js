import { apiClient, sharedGet } from "./client";

// AI voice / bulk-entry staging area. Foundation only for now — see
// pages/AiEntry.jsx, which shows a "coming soon" state; these calls are
// wired and ready for when that feature ships.
export const transactionDraftsApi = {
  list: (statusFilter = "pending_review") => sharedGet("/transaction-drafts", { params: { status_filter: statusFilter } }).then((r) => r.data),
  create: (payload) => apiClient.post("/transaction-drafts", payload).then((r) => r.data),
  get: (slug) => sharedGet(`/transaction-drafts/${slug}`).then((r) => r.data),
  updateFields: (slug, parsed_fields) => apiClient.patch(`/transaction-drafts/${slug}`, { parsed_fields }).then((r) => r.data),
  confirm: (slug) => apiClient.post(`/transaction-drafts/${slug}/confirm`).then((r) => r.data),
  reject: (slug) => apiClient.post(`/transaction-drafts/${slug}/reject`),
  // Server-side atomic bulk operations. One request, all-or-nothing posting.
  confirmSelected: (draft_slugs) => apiClient.post('/transaction-drafts/bulk/confirm', { draft_slugs }).then((r) => r.data),
  rejectSelected: (draft_slugs) => apiClient.post('/transaction-drafts/bulk/reject', { draft_slugs }).then((r) => r.data),
};
