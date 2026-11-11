import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { historyApi } from "../api/history";
import { apiErrorMessage } from "../api/client";

import PageHeader from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import Spinner from "../components/ui/Spinner";
import Pagination from "../components/ui/Pagination";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { formatDate } from "../lib/formatters";
import useCountUp from "../lib/useCountUp";

const ENTITY_TYPES = [
  { value: "", label: "All types" },
  { value: "transaction", label: "Transactions" },
  { value: "category", label: "Categories" },
  { value: "group", label: "Groups" },
  { value: "contact", label: "Contacts" },
  { value: "transaction_type", label: "Transaction Types" },
  { value: "priority", label: "Priorities" },
  { value: "account", label: "Accounts" },
  { value: "payment_method", label: "Payment Methods" },
  { value: "budget", label: "Budgets" },
  { value: "goal", label: "Goals" },
  { value: "credit_purchase", label: "Credit Purchases" },
];

const ACTION_TONE = { create: "emerald", update: "gold", delete: "danger" };
const ACTION_STYLE = {
  create: { chip: "bg-emerald-glow text-emerald", label: "Created" },
  update: { chip: "bg-gold-light text-gold", label: "Updated" },
  delete: { chip: "bg-danger-soft text-danger", label: "Deleted" },
};
const RETENTION_DAYS = 30;
const DAY_MS = 86400000;

const ICON_PATH = {
  create: "M12 5v14M5 12h14",
  update: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  delete: "M5 7h14M10 11v6M14 11v6M7 7l1 12h8l1-12M9 7V4h6v3",
};

function ActionIcon({ action, size = 19 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATH[action] || ICON_PATH.update} />
    </svg>
  );
}

const pad = (n) => String(n).padStart(2, "0");
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function dayLabel(iso) {
  const now = new Date();
  if (iso === localISO(now)) return "Today";
  if (iso === localISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return "Yesterday";
  return formatDate(iso);
}

function timeOf(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Days until the 30-day retention window closes for an entry. */
function daysKept(value) {
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) return null;
  return Math.max(0, RETENTION_DAYS - Math.floor((Date.now() - created) / DAY_MS));
}

function Stat({ icon, tone, label, value, note }) {
  const shown = useCountUp(value, 700);
  return (
    <Card className="group !p-4 flex items-center">
      <div className="flex w-full items-center gap-3.5">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${tone}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-nav">{label}</p>
          <p className="font-display text-[1.45rem] font-extrabold leading-tight tracking-[-0.03em] text-ink">{Math.round(shown).toLocaleString()}</p>
          {note && <p className="truncate text-[11px] text-muted">{note}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function History() {
  const [entityType, setEntityType] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [undoTarget, setUndoTarget] = useState(null);
  const [undoing, setUndoing] = useState(false);
  const [clearTarget, setClearTarget] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const result = await historyApi.listPaged({ entity_type: entityType || undefined, page, page_size: pageSize });
      setItems(result.items);
      setTotal(result.total);
      if (page > Math.max(1, Math.ceil(result.total / pageSize))) setPage(Math.max(1, Math.ceil(result.total / pageSize)));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, page, pageSize]);

  const handleUndo = async () => {
    setUndoing(true);
    try {
      await historyApi.undo(undoTarget.slug);
      toast.success("Undone.");
      setUndoTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't undo this — it may depend on something that changed since."));
    } finally {
      setUndoing(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await historyApi.remove(clearTarget.slug);
      toast.success("Removed from history.");
      setClearTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setClearing(false);
    }
  };

  const counts = {
    all: items.length,
    create: items.filter((h) => h.action === "create").length,
    update: items.filter((h) => h.action === "update").length,
    delete: items.filter((h) => h.action === "delete").length,
  };
  const partial = total > items.length;
  const scope = partial ? "On this page" : "In this view";

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => items.filter((h) => {
    if (action !== "all" && h.action !== action) return false;
    if (!term) return true;
    return [h.entity_label, h.entity_type, h.performed_by, h.action].some((v) => String(v || "").toLowerCase().includes(term));
  }), [items, action, term]);

  const groups = useMemo(() => {
    const map = new Map();
    visible.forEach((h) => {
      const d = new Date(h.created_at);
      const key = Number.isNaN(d.getTime()) ? "unknown" : localISO(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(h);
    });
    return [...map.entries()].map(([date, entries]) => ({ date, entries }));
  }, [visible]);

  const typeLabel = ENTITY_TYPES.find((t) => t.value === entityType)?.label;

  return (
    <div className="space-y-5">
      <PageHeader
        title="History"
        subtitle="Changes are kept for 30 days. You can undo supported actions, subject to safety checks; older deletions without snapshots may not be restorable."
      />

      {/* ---------- overview ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Icon name="history" size={22} strokeWidth={1.9} />} tone="bg-primary-soft text-primary" label="Entries" value={total} note={entityType ? typeLabel : "Last 30 days"} />
        <Stat icon={<ActionIcon action="create" size={22} />} tone="bg-emerald-glow text-emerald" label="Created" value={counts.create} note={scope} />
        <Stat icon={<ActionIcon action="update" size={22} />} tone="bg-gold-light text-gold" label="Updated" value={counts.update} note={scope} />
        <Stat icon={<ActionIcon action="delete" size={22} />} tone="bg-danger-soft text-danger" label="Deleted" value={counts.delete} note={scope} />
      </div>

      {/* ---------- toolbar ---------- */}
      <Card className="!p-3.5 sm:!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-[200px]">
            <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this page by name, type or person…"
              aria-label="Search history on this page"
              className="h-11 w-full rounded-xl border border-cardBorder bg-input pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-hover hover:text-ink">×</button>}
          </label>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Action">
            {[["all", "All"], ["create", "Created"], ["update", "Updated"], ["delete", "Deleted"]].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setAction(key)} aria-pressed={action === key} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${action === key ? "border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary"}`}>
                {label}<span className={`rounded-full px-1.5 text-[10px] ${action === key ? "bg-white/25" : "bg-primary-soft text-primary"}`}>{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 border-t border-itemBorder pt-3">
          <div className="sfms-noscroll flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Item type">
            {ENTITY_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => { setPage(1); setEntityType(t.value); }} aria-pressed={entityType === t.value} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${entityType === t.value ? "bg-primary-soft text-primary ring-1 ring-primary-border" : "text-muted hover:bg-hover hover:text-ink"}`}>
                {t.label}
              </button>
            ))}
          </div>
          {partial && <p className="mt-2 text-[11px] text-muted">Search, the action filter and the counts cover the {items.length} entries on this page.</p>}
        </div>
      </Card>

      {/* ---------- timeline ---------- */}
      <Card>
        {loading && items.length === 0 ? (
          <Spinner label="Loading history…" />
        ) : items.length === 0 ? (
          <EmptyState title="Nothing here yet" description="Changes you make across the app will show up here, kept for 30 days." />
        ) : (
          <CardBody className={`p-0 pt-2 transition-opacity duration-200 ${loading ? "pointer-events-none opacity-60" : ""}`}>
            {visible.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">No entries on this page match your search or filter.</div>
            ) : (
              groups.map((group) => (
                <section key={group.date} aria-label={group.date === "unknown" ? "Earlier" : dayLabel(group.date)}>
                  <div className="flex items-center justify-between gap-3 border-y border-itemBorder bg-primary-soft/50 px-4 py-2 sm:px-5">
                    <h3 className="font-display text-[12px] font-extrabold uppercase tracking-[0.08em] text-nav">{group.date === "unknown" ? "Earlier" : dayLabel(group.date)}</h3>
                    <span className="text-[11px] font-bold text-muted">{group.entries.length} {group.entries.length === 1 ? "change" : "changes"}</span>
                  </div>
                  <ul className="m-0 list-none divide-y divide-itemBorder p-0">
                    {group.entries.map((h) => {
                      const style = ACTION_STYLE[h.action] || ACTION_STYLE.update;
                      const kept = daysKept(h.created_at);
                      return (
                        <li key={h.slug} className={`group flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5 transition hover:bg-primary-soft/40 ${h.is_undone ? "opacity-70" : ""}`}>
                          <div className="flex min-w-0 flex-1 basis-[14rem] items-center gap-3.5">
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${style.chip}`}>
                              <ActionIcon action={h.action} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-bold text-ink">{h.entity_label}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                                <Badge tone={ACTION_TONE[h.action] || "neutral"}>{style.label}</Badge>
                                <span className="font-semibold capitalize text-nav">{String(h.entity_type || "").replace(/_/g, " ")}</span>
                                <span className="text-subtle">•</span>
                                <span>{timeOf(h.created_at)}</span>
                                <span className="text-subtle">•</span>
                                <span>by {h.performed_by}</span>
                                {h.is_undone && <Badge tone="neutral">Undone</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="flex w-full items-center gap-3 sm:w-auto sm:shrink-0">
                            {kept !== null && !h.is_undone && (
                              <span className={`hidden text-[11px] font-semibold md:inline ${kept <= 3 ? "text-gold" : "text-muted"}`} title="Entries are kept for 30 days">
                                {kept === 0 ? "Expires today" : `${kept} day${kept === 1 ? "" : "s"} left`}
                              </span>
                            )}
                            <div className="sfms-actions flex-1 sm:flex-none">
                              {!h.is_undone && (
                                <Button size="sm" variant="secondary" onClick={() => setUndoTarget(h)}>Undo</Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setClearTarget(h)}>Clear</Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </CardBody>
        )}
        <div className="px-5 pb-3">
          {!loading && <Pagination page={page} pageSize={pageSize} total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />}
        </div>
      </Card>

      <ConfirmDialog
        open={!!undoTarget}
        onClose={() => setUndoTarget(null)}
        onConfirm={handleUndo}
        loading={undoing}
        tone="neutral"
        title="Undo this change?"
        description={
          undoTarget?.action === "create"
            ? "This will delete the item that was created."
            : undoTarget?.action === "delete"
            ? "This will restore the item from before it was deleted."
            : "This will revert the fields back to what they were before this change."
        }
        confirmLabel="Undo"
      />

      <ConfirmDialog
        open={!!clearTarget}
        onClose={() => setClearTarget(null)}
        onConfirm={handleClear}
        loading={clearing}
        title="Clear this history entry?"
        description="This only removes it from your history — it does not touch the item itself. You won't be able to undo this specific change afterwards."
        confirmLabel="Clear"
      />
    </div>
  );
}
