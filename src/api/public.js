import { apiClient } from "./client";

export const publicApi = {
  /** Public contact form -> admin inbox. Always answers a generic 202. */
  submitContact: (payload) => apiClient.post("/public/contact", payload).then((r) => r.data),
};
