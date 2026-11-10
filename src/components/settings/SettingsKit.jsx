import React, { useMemo, useState } from "react";
import { Card, CardBody } from "../ui/Card";
import Table from "../ui/Table";
import Icon from "../ui/Icon";
import Spinner from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import Pagination from "../ui/Pagination";
import useCountUp from "../../lib/useCountUp";

const VIEW_KEY = "sfms-settings-view";
const AVATAR_TONES = [
  "bg-primary-soft text-primary",
  "bg-emerald-glow text-emerald",
  "bg-gold-light text-gold",
  "bg-[#efeaff] text-[#7c55e8]",
  "bg-[#e0f7fd] text-[#0e9bc0]",
  "bg-danger-soft text-danger",
];
const SEARCH_KEYS = ["name", "email", "phone_number", "account_label", "account_name", "nature", "description"];

const readView = () => {
  try { return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "list"; } catch { return "list"; }
};

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

function toneFor(name) {
  let hash = 0;
  for (const ch of String(name || "")) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function Avatar({ name }) {
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-[13px] font-extrabold transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${toneFor(name)}`}>
      {initials(name)}
    </span>
  );
}

/** Top card of every Settings page: what this building block is for, and the main action. */
export function SettingsIntro({ icon, title, description, action }) {
  return (
    <div className="sfms-card mb-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-cardBorder bg-card p-5 shadow-card">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#17c8f2] to-[#1565ff] text-white shadow-luxury">
          <Icon name={icon} size={22} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[1.15rem] font-extrabold tracking-[-0.025em] text-ink">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const shown = useCountUp(value, 700);
  return (
    <div className="sfms-card flex items-center gap-3 rounded-2xl border border-cardBorder bg-card px-4 py-3 shadow-card">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted">{label}</p>
        <p className="font-display text-[1.3rem] font-extrabold leading-tight tracking-[-0.03em] text-ink">{Math.round(shown)}</p>
      </div>
    </div>
  );
}

/**
 * List + toolbar + pagination shared by all Settings pages.
 *  - pass `columns` (table definition) and the list is derived from them, with a List/Table switch
 *  - or pass `renderItem` to draw each row yourself
 * Search and status filters work on the rows loaded on the current page.
 */
export function SettingsPanel({ items, total, page, pageSize, loading, onPageChange, onPageSizeChange, columns, renderItem, emptyTitle, emptyDescription, emptyAction }) {
  const [view, setView] = useState(readView);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const hasOwner = items.some((i) => typeof i.is_default === "boolean");
  const isActive = (i) => i.is_active !== false;
  const counts = {
    all: items.length,
    active: items.filter(isActive).length,
    inactive: items.filter((i) => !isActive(i)).length,
    custom: items.filter((i) => i.is_default === false).length,
    system: items.filter((i) => i.is_default === true).length,
  };

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => items.filter((i) => {
    if (status === "active" && !isActive(i)) return false;
    if (status === "inactive" && isActive(i)) return false;
    if (status === "custom" && i.is_default !== false) return false;
    if (status === "system" && i.is_default !== true) return false;
    if (!term) return true;
    return SEARCH_KEYS.some((k) => String(i[k] || "").toLowerCase().includes(term));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, term, status]);

  const changeView = (next) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable */ }
  };

  const chips = [
    ["all", "All", counts.all],
    ["active", "Active", counts.active],
    ["inactive", "Inactive", counts.inactive],
    ...(hasOwner ? [["custom", "Custom", counts.custom], ["system", "System", counts.system]] : []),
  ];
  const partial = total > items.length;
  const actionsColumn = columns?.find((c) => c.key === "actions");
  const bodyColumns = columns?.filter((c) => c.key !== "actions") || [];
  const titleColumn = bodyColumns[0];
  const detailColumns = bodyColumns.slice(1);

  if (loading && items.length === 0) return <Card><Spinner label="Loading…" /></Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total" value={total} tone="bg-primary" />
        <Stat label="Active" value={counts.active} tone="bg-emerald" />
        <Stat label="Inactive" value={counts.inactive} tone="bg-subtle" />
        <Stat label={hasOwner ? "Custom" : "Shown"} value={hasOwner ? counts.custom : visible.length} tone="bg-gold" />
      </div>

      <Card className="!p-3.5 sm:!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[200px] flex-1">
            <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search this list"
              className="h-11 w-full rounded-xl border border-cardBorder bg-input pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-hover hover:text-ink">×</button>}
          </label>
          {columns && (
            <div role="group" aria-label="View" className="inline-flex rounded-xl border border-cardBorder bg-input p-1">
              {[["list", "List"], ["table", "Table"]].map(([key, label]) => (
                <button key={key} type="button" onClick={() => changeView(key)} aria-pressed={view === key} className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${view === key ? "bg-card text-primary shadow-card" : "text-muted hover:text-ink"}`}>{label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-itemBorder pt-3">
          {chips.map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setStatus(key)} aria-pressed={status === key} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${status === key ? "border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary"}`}>
              {label}<span className={`rounded-full px-1.5 text-[10px] ${status === key ? "bg-white/25" : "bg-primary-soft text-primary"}`}>{count}</span>
            </button>
          ))}
          {partial && <span className="ml-auto text-[11px] text-muted">Filters and counts cover the {items.length} rows on this page.</span>}
        </div>
      </Card>

      <Card>
        {items.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        ) : (
          <CardBody className={`p-0 pt-2 transition-opacity duration-200 ${loading ? "pointer-events-none opacity-60" : ""}`}>
            {visible.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">Nothing on this page matches your search or filter.</div>
            ) : columns && view === "table" ? (
              <Table columns={columns} rows={visible} />
            ) : (
              <ul className="m-0 list-none divide-y divide-itemBorder border-t border-itemBorder p-0">
                {visible.map((item) => (
                  <li key={item.slug || item.id} className="group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-primary-soft/40">
                    <Avatar name={item.name} />
                    {renderItem ? (
                      <div className="min-w-0 flex-1">{renderItem(item)}</div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-ink">{titleColumn?.render ? titleColumn.render(item) : item.name}</div>
                          {detailColumns.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap items-end gap-x-5 gap-y-2">
                              {detailColumns.map((c) => (
                                <div key={c.key}>
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-subtle">{c.header}</p>
                                  <div className="mt-0.5 text-[13px] text-ink">{c.render ? c.render(item) : item[c.key]}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {actionsColumn && <div className="shrink-0">{actionsColumn.render(item)}</div>}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        )}
        <div className="px-5 pb-3">
          {!loading && (
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
          )}
        </div>
      </Card>
    </div>
  );
}
