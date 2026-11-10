import { apiClient, sharedGet } from './client';

export const aiBulkApi = {
  options: () => sharedGet('/ai/bulk/options').then(r => r.data),
  drafts: (page = 1, page_size = 20) => sharedGet('/ai/bulk/drafts', { params: { page, page_size } }).then(r => r.data),

  // Conversational flow: read the notes once, answer questions, then create drafts.
  analyze: (raw_text) => apiClient.post('/ai/bulk/analyze', { raw_text, source: 'bulk_text' }).then(r => r.data),
  session: (slug) => apiClient.get(`/ai/bulk/sessions/${slug}`).then(r => r.data),
  // answers: [{ field, item_ids, value, mode: 'set' | 'skip' | 'each' }]
  answer: (slug, answers) => apiClient.post(`/ai/bulk/sessions/${slug}/answers`, { answers }).then(r => r.data),
  finalize: (slug) => apiClient.post(`/ai/bulk/sessions/${slug}/finalize`).then(r => r.data),
  cancel: (slug) => apiClient.delete(`/ai/bulk/sessions/${slug}`),

  // Legacy one-shot endpoints (kept for compatibility).
  preflight: (raw_text) => apiClient.post('/ai/bulk/preflight', { raw_text }).then(r => r.data),
  parse: (raw_text, answers = {}) => apiClient.post('/ai/bulk/parse', { raw_text, source: 'bulk_text', answers }).then(r => r.data),
};
