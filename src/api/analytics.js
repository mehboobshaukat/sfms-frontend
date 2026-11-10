import { sharedGet } from "./client";

// range: "today" | "week" | "month" | "year" | "lifetime" | "custom"
// (pass date_from/date_to together for "custom" — the backend detects it
// automatically once both are present, range itself doesn't need to say "custom")
export const analyticsApi = {
  // One authenticated request for every dashboard widget. No completed-response cache.
  dashboard: (params) => sharedGet("/analytics/dashboard", { params }).then((r) => r.data),
  summary: (params) => sharedGet("/analytics/summary", { params }).then((r) => r.data),
  transactions: (params) => sharedGet("/analytics/transactions", { params }).then((r) => r.data),
  loans: () => sharedGet("/analytics/loans").then((r) => r.data),
  budgets: () => sharedGet("/analytics/budgets").then((r) => r.data),
  goals: () => sharedGet("/analytics/goals").then((r) => r.data),
  report: (params) => sharedGet("/analytics/report", { params }).then((r) => r.data),
};
