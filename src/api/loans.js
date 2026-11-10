import { apiClient, sharedGet } from "./client";

export const loansApi = {
  list: () => sharedGet("/loans").then((r) => r.data),
  active: (type) => sharedGet("/loans/active", { params: { type } }).then((r) => r.data),
  byContact: (contactSlug) => sharedGet(`/loans/contact/${contactSlug}`).then((r) => r.data),
  get: (loanCode) => sharedGet(`/loans/${loanCode}`).then((r) => r.data),
};
