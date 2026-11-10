import { formatDate } from "./formatters";

/** Whole days from today until `iso` (negative when it is in the past). Dates are read as local calendar days. */
export function daysUntil(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

/** Label and colour classes for a due date. `item` needs `is_completed` and `due_date`. */
export function dueInfo(item) {
  if (item.is_completed) return { text: "Settled", cls: "bg-emerald-glow text-emerald" };
  const days = daysUntil(item.due_date);
  if (days === null) return { text: "No due date", cls: "bg-hover text-muted" };
  if (days < 0) return { text: `Overdue by ${-days} day${days === -1 ? "" : "s"}`, cls: "bg-danger-soft text-danger", overdue: true };
  if (days === 0) return { text: "Due today", cls: "bg-gold-light text-gold", soon: true };
  if (days <= 7) return { text: `Due in ${days} day${days === 1 ? "" : "s"}`, cls: "bg-gold-light text-gold", soon: true };
  return { text: `Due ${formatDate(item.due_date)}`, cls: "bg-primary-soft text-primary" };
}

/** How much of `total` has been paid off, as 0-100. */
export function paidPercent(total, remaining) {
  const t = Number(total) || 0;
  if (t <= 0) return 0;
  return Math.min(100, Math.max(0, (1 - (Number(remaining) || 0) / t) * 100));
}
