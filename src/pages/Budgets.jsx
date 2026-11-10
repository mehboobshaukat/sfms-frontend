import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { budgetsApi } from "../api/budgets";
import { categoriesApi } from "../api/categories";
import { apiErrorMessage } from "../api/client";

import PageHeader from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import Modal from "../components/ui/Modal";
import DeleteGuardDialog from "../components/ui/DeleteGuardDialog";
import { useDeleteGuard } from "../hooks/useDeleteGuard";
import { Input } from "../components/ui/Input";
import Select from "../components/ui/Select";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ProgressBar from "../components/ui/ProgressBar";
import StatTile from "../components/ui/StatTile";
import useCountUp from "../lib/useCountUp";
import { formatCurrency, formatDate, todayISODate } from "../lib/formatters";
import { BUDGET_PERIODS } from "../lib/constants";

const emptyForm = { category_slug: "", period: "monthly", amount: "", start_date: todayISODate(), end_date: "" };

const SCOPE_TABS = [
  { key: "all", label: "All Budgets" },
  { key: "current", label: "Current" },
];
const PERIOD_TABS = [{ key: "all", label: "Any period" }, ...BUDGET_PERIODS.map((p) => ({ key: p.value, label: p.label }))];
const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "ok", label: "On track" },
  { key: "near", label: "Near limit" },
  { key: "over", label: "Over" },
];
const SORTS = [
  { key: "usage", label: "Most used" },
  { key: "amount", label: "Largest budget" },
  { key: "name", label: "Category A to Z" },
];

const STATUS_META = {
  ok: { label: "On track", badge: "emerald", text: "text-emerald", tone: "emerald", chip: "bg-emerald-glow text-emerald" },
  near: { label: "Near limit", badge: "gold", text: "text-gold", tone: "gold", chip: "bg-gold-light text-gold" },
  over: { label: "Over budget", badge: "danger", text: "text-danger", tone: "danger", chip: "bg-danger-soft text-danger" },
};

const VIEW_KEY = "sfms-budgets-view";
const readView = () => {
  try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards"; } catch { return "cards"; }
};

/** Usage figures for one budget, worked out here because the server sends only amount and spent. */
function usage(b) {
  const amount = Number(b.amount) || 0;
  const spent = Number(b.spent_amount) || 0;
  const percent = amount > 0 ? (spent / amount) * 100 : 0;
  const status = spent > amount ? "over" : percent >= 80 ? "near" : "ok";
  return { amount, spent, percent, status, left: Math.max(0, amount - spent), overBy: Math.max(0, spent - amount) };
}

function Percent({ value }) {
  return <>{Math.round(useCountUp(value, 800))}%</>;
}

export default function Budgets() {
  const [items, setItems] = useState([]);
  const [currentSlugs, setCurrentSlugs] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [scope, setScope] = useState("all");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("usage");
  const [view, setView] = useState(readView);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    setCategories(await categoriesApi.list({ active_only: true }));
    categoriesApi.list().then(setAllCategories).catch(() => {});
  };

  // Loads every budget plus the "current" ones, so the All / Current tabs switch instantly.
  const load = async () => {
    setLoading(true);
    try {
      const [all, current] = await Promise.all([budgetsApi.list(), budgetsApi.current()]);
      setItems(all);
      setCurrentSlugs(new Set(current.map((b) => b.slug)));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteGuard = useDeleteGuard(budgetsApi.remove, load);
  const categoryName = (slug) => allCategories.find((c) => c.slug === slug)?.name || categories.find((c) => c.slug === slug)?.name || "—";

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category_slug: categories[0]?.slug || "" });
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      category_slug: item.category_slug,
      period: item.period,
      amount: String(item.amount),
      start_date: item.start_date,
      end_date: item.end_date || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await budgetsApi.update(editing.slug, { amount: Number(form.amount), end_date: form.end_date || null });
        toast.success("Budget updated.");
      } else {
        await budgetsApi.create({
          category_slug: form.category_slug,
          period: form.period,
          amount: Number(form.amount),
          start_date: form.start_date,
          end_date: form.end_date || null,
        });
        toast.success("Budget created.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeView = (next) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable: choice just won't persist */ }
  };

  // Overview and health describe the budgets that apply right now.
  const live = items.filter((b) => currentSlugs.has(b.slug));
  const liveUsage = live.map(usage);
  const totalBudgeted = liveUsage.reduce((sum, u) => sum + u.amount, 0);
  const totalSpent = liveUsage.reduce((sum, u) => sum + u.spent, 0);
  const totalLeft = liveUsage.reduce((sum, u) => sum + u.left, 0);
  const overallPercent = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const tally = { ok: 0, near: 0, over: 0 };
  liveUsage.forEach((u) => { tally[u.status] += 1; });
  const ringColor = overallPercent > 100 ? "#e5304f" : overallPercent >= 80 ? "#f5a524" : "#1565ff";

  const inScope = (b) => (scope === "all" || currentSlugs.has(b.slug)) && (period === "all" || b.period === period);
  const scopeCounts = { all: items.length, current: live.length };
  const periodCounts = Object.fromEntries(PERIOD_TABS.map((p) => [p.key, items.filter((b) => (scope === "all" || currentSlugs.has(b.slug)) && (p.key === "all" || b.period === p.key)).length]));
  const statusCounts = { all: 0, ok: 0, near: 0, over: 0 };
  items.filter(inScope).forEach((b) => { statusCounts.all += 1; statusCounts[usage(b).status] += 1; });

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = items.filter((b) => {
      if (!inScope(b)) return false;
      if (status !== "all" && usage(b).status !== status) return false;
      if (!term) return true;
      return categoryName(b.category_slug).toLowerCase().includes(term);
    });
    const sorted = [...list];
    if (sort === "amount") sorted.sort((a, b) => usage(b).amount - usage(a).amount);
    else if (sort === "name") sorted.sort((a, b) => categoryName(a.category_slug).localeCompare(categoryName(b.category_slug)));
    else sorted.sort((a, b) => usage(b).percent - usage(a).percent);
    return sorted;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, currentSlugs, scope, period, status, term, sort, allCategories, categories]);

  const actionButtons = (b) => (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>Edit</Button>
      <Button size="sm" variant="danger" onClick={() => deleteGuard.request(b.slug, `budget for "${categoryName(b.category_slug)}"`)}>Delete</Button>
    </div>
  );

  const dates = (b) => `${formatDate(b.start_date)} ${b.end_date ? `— ${formatDate(b.end_date)}` : "(ongoing)"}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Budgets"
        subtitle="Spent amounts update automatically from matching Expense transactions."
        actions={
          <Button variant="luxury" onClick={openCreate} disabled={categories.length === 0}>
            Add Budget
          </Button>
        }
      />

      {loading && items.length === 0 ? (
        <Card><Spinner label="Loading budgets…" /></Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No budgets yet"
            description={categories.length === 0 ? "Create a category first." : "Set a limit for a category to keep your spending in check."}
            action={categories.length > 0 && <Button variant="luxury" onClick={openCreate}>Add Budget</Button>}
          />
        </Card>
      ) : (
        <>
          {/* ---------- overview ---------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon="budget" tone="bg-primary-soft text-primary" label="Total budgeted" amount={totalBudgeted} note={`${live.length} current budget${live.length === 1 ? "" : "s"}`} />
            <StatTile icon="arrowUp" tone="bg-danger-soft text-danger" label="Spent so far" amount={totalSpent} note={`${Math.round(overallPercent)}% of what you planned`} />
            <StatTile icon="savings" tone="bg-emerald-glow text-emerald" label="Still available" amount={totalLeft} note="Left across current budgets" />
            <StatTile icon="info" tone={tally.over ? "bg-danger-soft text-danger" : "bg-gold-light text-gold"} label="Over limit" amount={tally.over} integer note={tally.over || tally.near ? `${tally.near} near the limit` : "Everything is on track"} />
          </div>

          {/* ---------- budget health ---------- */}
          {live.length > 0 && (
            <Card>
              <div className="flex flex-wrap items-center gap-6">
                <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${ringColor} ${Math.min(overallPercent, 100)}%, #e8eef9 0)` }} role="img" aria-label={`${Math.round(overallPercent)} percent of current budgets used`}>
                  <div className="absolute inset-[10px] rounded-full bg-card" />
                  <span className="relative font-display text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink"><Percent value={overallPercent} /></span>
                </div>
                <div className="min-w-[220px] flex-1">
                  <h3 className="font-display text-[1.05rem] font-bold tracking-[-0.02em] text-ink">Budget health</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatCurrency(totalSpent)} spent of {formatCurrency(totalBudgeted)} across your current budgets.
                  </p>
                  <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-primary-soft" role="img" aria-label="Budgets by status">
                    {["ok", "near", "over"].filter((k) => tally[k] > 0).map((k) => (
                      <span key={k} title={`${STATUS_META[k].label}: ${tally[k]}`} style={{ width: `${(tally[k] / live.length) * 100}%`, backgroundColor: k === "ok" ? "#10b981" : k === "near" ? "#f5a524" : "#e5304f", transformOrigin: "left", animation: "sfms-bar-in .9s cubic-bezier(.2,.8,.2,1) backwards" }} className="h-full" />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["ok", "near", "over"].map((k) => (
                      <span key={k} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${STATUS_META[k].chip}`}>
                        {tally[k]} {k === "over" ? "over" : STATUS_META[k].label.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ---------- toolbar ---------- */}
          <Card className="!p-3.5 sm:!p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-[200px] flex-1">
                <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by category…" aria-label="Search budgets" className="h-11 w-full rounded-xl border border-cardBorder bg-input pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15" />
                {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-hover hover:text-ink">×</button>}
              </label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort budgets" className="h-11 rounded-xl border border-cardBorder bg-input px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15">
                {SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <div role="group" aria-label="View" className="inline-flex rounded-xl border border-cardBorder bg-input p-1">
                {[["cards", "Cards"], ["list", "List"]].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => changeView(key)} aria-pressed={view === key} className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${view === key ? "bg-card text-primary shadow-card" : "text-muted hover:text-ink"}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-itemBorder pt-3">
              <div className="sfms-noscroll flex gap-2 overflow-x-auto">
                {SCOPE_TABS.map((t) => (
                  <button key={t.key} type="button" onClick={() => setScope(t.key)} aria-pressed={scope === t.key} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-bold transition-all ${scope === t.key ? "border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary"}`}>
                    {t.label}<span className={`rounded-full px-1.5 text-[10px] ${scope === t.key ? "bg-white/25" : "bg-primary-soft text-primary"}`}>{scopeCounts[t.key]}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Period">
                {PERIOD_TABS.map((p) => (
                  <button key={p.key} type="button" onClick={() => setPeriod(p.key)} aria-pressed={period === p.key} className={`rounded-full px-3 py-1 text-xs font-bold transition ${period === p.key ? "bg-primary-soft text-primary ring-1 ring-primary-border" : "text-muted hover:text-ink"}`}>
                    {p.label} <span className="opacity-70">{periodCounts[p.key]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Status">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-muted">Status</span>
              {STATUS_TABS.map((s) => (
                <button key={s.key} type="button" onClick={() => setStatus(s.key)} aria-pressed={status === s.key} className={`rounded-full px-3 py-1 text-xs font-bold transition ${status === s.key ? "bg-primary-soft text-primary ring-1 ring-primary-border" : "text-muted hover:text-ink"}`}>
                  {s.label} <span className="opacity-70">{statusCounts[s.key]}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* ---------- budgets ---------- */}
          {visible.length === 0 ? (
            <Card><div className="px-5 py-10 text-center text-sm text-muted">No budgets match your search or filters.</div></Card>
          ) : view === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((b) => {
                const u = usage(b);
                const meta = STATUS_META[u.status];
                return (
                  <Card key={b.slug} className={`group ${b.is_active ? "" : "opacity-75"}`}>
                    <CardBody>
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${meta.chip}`}><Icon name="budget" size={22} strokeWidth={1.9} /></span>
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-[1.02rem] font-bold tracking-[-0.02em] text-ink">{categoryName(b.category_slug)}</h3>
                            <p className="mt-0.5 text-xs font-semibold capitalize text-muted">{b.period}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone={meta.badge}>{meta.label}</Badge>
                          {!b.is_active && <Badge tone="neutral">Inactive</Badge>}
                        </div>
                      </div>

                      <div className="mb-1.5 flex items-end justify-between gap-2">
                        <p className="truncate font-display text-[1.5rem] font-extrabold leading-tight tracking-[-0.04em] text-ink">{formatCurrency(u.spent)}</p>
                        <span className="shrink-0 pb-1 text-xs text-muted">of {formatCurrency(u.amount)}</span>
                      </div>
                      <ProgressBar percent={u.percent} tone={meta.tone} />
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className={`font-bold ${meta.text}`}>{Math.round(u.percent)}% used</span>
                        <span className="text-muted">{u.status === "over" ? `Over by ${formatCurrency(u.overBy)}` : `${formatCurrency(u.left)} left`}</span>
                      </div>
                      <p className="mt-3 text-xs text-muted">{dates(b)}</p>
                      <div className="mt-4">{actionButtons(b)}</div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <ul className="m-0 list-none divide-y divide-itemBorder p-0">
                {visible.map((b) => {
                  const u = usage(b);
                  const meta = STATUS_META[u.status];
                  return (
                    <li key={b.slug} className={`group grid gap-x-5 gap-y-3 px-5 py-4 transition hover:bg-primary-soft/40 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,1fr)_auto] lg:items-center ${b.is_active ? "" : "opacity-75"}`}>
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${meta.chip}`}><Icon name="budget" size={19} /></span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-ink">{categoryName(b.category_slug)}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                            <Badge tone={meta.badge}>{meta.label}</Badge>
                            <span className="font-semibold capitalize text-nav">{b.period}</span>
                            <span className="text-subtle">•</span>
                            <span>{dates(b)}</span>
                            {!b.is_active && <Badge tone="neutral">Inactive</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-extrabold text-ink">{formatCurrency(u.spent)} <span className="font-medium text-muted">of {formatCurrency(u.amount)}</span></span>
                          <span className={`font-bold ${meta.text}`}>{Math.round(u.percent)}%</span>
                        </div>
                        <ProgressBar percent={u.percent} tone={meta.tone} />
                        <p className="mt-1.5 text-[11px] text-muted">{u.status === "over" ? `Over by ${formatCurrency(u.overBy)}` : `${formatCurrency(u.left)} left`}</p>
                      </div>
                      <div className="lg:justify-self-end">{actionButtons(b)}</div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Budget" : "Add Budget"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="luxury" onClick={handleSave} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editing && (
            <>
              <Select label="Category" required value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select label="Period" required value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                {BUDGET_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </>
          )}
          <Input label="Amount" type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required disabled={!!editing} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date (optional)" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </form>
      </Modal>

      <DeleteGuardDialog guard={deleteGuard} itemNoun="budget" />
    </div>
  );
}
