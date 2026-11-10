import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { goalsApi } from "../api/goals";
import { prioritiesApi } from "../api/priorities";
import { accountsApi } from "../api/accounts";
import { paymentMethodsApi } from "../api/paymentMethods";
import { apiErrorMessage } from "../api/client";

import PageHeader from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import DeleteGuardDialog from "../components/ui/DeleteGuardDialog";
import { useDeleteGuard } from "../hooks/useDeleteGuard";
import { Input } from "../components/ui/Input";
import Select from "../components/ui/Select";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ProgressBar from "../components/ui/ProgressBar";
import StatTile from "../components/ui/StatTile";
import Icon from "../components/ui/Icon";
import useCountUp from "../lib/useCountUp";
import { daysUntil } from "../lib/dueInfo";
import { formatCurrency, formatDate, todayISODate } from "../lib/formatters";

const emptyForm = { name: "", target_amount: "", start_date: todayISODate(), target_date: "", priority_slug: "" };

const STATUS_TABS = [{ key: "active", label: "Active" }, { key: "completed", label: "Completed" }, { key: "all", label: "All" }];
const SORTS = [
  { key: "progress", label: "Closest to done" },
  { key: "deadline", label: "Deadline soonest" },
  { key: "target", label: "Largest target" },
  { key: "newest", label: "Newest first" },
];
const VIEW_KEY = "sfms-goals-view";
const readView = () => {
  try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards"; } catch { return "cards"; }
};

function Percent({ value }) {
  return <>{Math.round(useCountUp(value, 800))}%</>;
}

export default function Goals() {
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState({});
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("progress");
  const [view, setView] = useState(readView);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [savingsTarget, setSavingsTarget] = useState(null);
  const [savingsAmount, setSavingsAmount] = useState("");
  const [addingSavings, setAddingSavings] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [methods, setMethods] = useState([]);
  const [releaseMode, setReleaseMode] = useState(false);
  const [requestKey, setRequestKey] = useState("");
  const [savingFields, setSavingFields] = useState({account_slug:"", payment_method_slug:"", description:"", txn_date:todayISODate(),txn_time:new Date().toTimeString().slice(0,5),remarks:""});
  const openSavings = (goal, release = false) => {
    setSavingsTarget(goal); setReleaseMode(release); setSavingsAmount(""); setRequestKey(crypto.randomUUID());
    setSavingFields({account_slug:"",payment_method_slug:"",description:release?`Release savings from ${goal.name}`:`Savings for ${goal.name}`,txn_date:todayISODate(),txn_time:new Date().toTimeString().slice(0,5),remarks:""});
  };

  const load = async () => {
    setLoading(true);
    try {
      const [g, p, prio, accts, pm] = await Promise.all([goalsApi.list(), goalsApi.progress(), prioritiesApi.list(), accountsApi.list(), paymentMethodsApi.list()]);
      setAccounts(Array.isArray(accts) ? accts.filter(a => !a.is_system && a.is_active !== false) : []);
      setMethods(Array.isArray(pm) ? pm : []);
      setItems(g);
      setPriorities(prio);
      const progMap = {};
      p.forEach((row) => (progMap[row.slug] = row));
      setProgress(progMap);
      goalsApi.savingsSummary().then(setSummary).catch(() => {});
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const priorityName = (slug) => priorities.find((p) => p.slug === slug)?.name;
  const deleteGuard = useDeleteGuard(goalsApi.remove, load);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      target_amount: String(item.target_amount),
      start_date: item.start_date,
      target_date: item.target_date || "",
      priority_slug: item.priority_slug || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        target_amount: Number(form.target_amount),
        target_date: form.target_date || null,
        priority_slug: form.priority_slug || null,
      };
      if (editing) {
        await goalsApi.update(editing.slug, payload);
        toast.success("Goal updated.");
      } else {
        await goalsApi.create({ ...payload, start_date: form.start_date });
        toast.success("Goal created.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddSavings = async (e) => {
    e.preventDefault();
    setAddingSavings(true);
    try {
      const payload = {...savingFields, amount: Number(savingsAmount), txn_time: savingFields.txn_time + (savingFields.txn_time.length === 5 ? ":00" : ""), request_key: requestKey};
      if (releaseMode) await goalsApi.releaseSavings(savingsTarget.slug, payload);
      else await goalsApi.addSavings(savingsTarget.slug, payload);
      toast.success(releaseMode ? "Savings released." : "Savings added.");
      setSavingsTarget(null);
      setSavingsAmount("");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setAddingSavings(false);
    }
  };

  // If every goal is already completed, start on "All" instead of an empty "Active" list.
  const autoStatus = useRef(false);
  useEffect(() => {
    if (autoStatus.current || items.length === 0) return;
    autoStatus.current = true;
    if (!items.some((g) => !g.is_completed)) setStatus("all");
  }, [items]);

  const changeView = (next) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable: choice just won't persist */ }
  };

  /** Figures for one goal: progress, what is left, and how the deadline looks. */
  const info = (g) => {
    const prog = progress[g.slug];
    const target = Number(g.target_amount) || 0;
    const saved = Number(g.saved_amount) || 0;
    const percent = Math.min(100, Math.max(0, prog?.progress_percent ?? (target > 0 ? (saved / target) * 100 : 0)));
    const left = Math.max(0, target - saved);
    const days = g.is_completed ? null : prog?.days_remaining ?? daysUntil(g.target_date);
    let deadline;
    if (g.is_completed) deadline = { text: "Completed", cls: "bg-emerald-glow text-emerald" };
    else if (days == null) deadline = { text: "No target date", cls: "bg-hover text-muted" };
    else if (days < 0) deadline = { text: "Target date passed", cls: "bg-danger-soft text-danger", late: true };
    else if (days === 0) deadline = { text: "Due today", cls: "bg-gold-light text-gold", soon: true };
    else deadline = { text: `${days} day${days === 1 ? "" : "s"} left`, cls: days <= 30 ? "bg-gold-light text-gold" : "bg-primary-soft text-primary", soon: days <= 30 };
    const perMonth = !g.is_completed && days != null && days > 0 && left > 0 ? left / (days / 30.4375) : null;
    return { target, saved, percent, left, days, deadline, perMonth };
  };

  const active = items.filter((g) => !g.is_completed);
  const done = items.filter((g) => g.is_completed);
  const totalSaved = items.reduce((sum, g) => sum + (Number(g.saved_amount) || 0), 0);
  const activeTarget = active.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0);
  const activeSaved = active.reduce((sum, g) => sum + (Number(g.saved_amount) || 0), 0);
  const stillToSave = Math.max(0, activeTarget - activeSaved);
  const overallPercent = activeTarget > 0 ? (activeSaved / activeTarget) * 100 : 0;
  const ranked = [...active].sort((a, b) => info(b).percent - info(a).percent);
  const closest = ranked[0];
  const nextDeadline = [...active].filter((g) => info(g).days != null && info(g).days >= 0).sort((a, b) => info(a).days - info(b).days)[0];
  const dueSoon = active.filter((g) => info(g).deadline.soon).length;

  const statusCounts = { active: active.length, completed: done.length, all: items.length };
  const priorityOptions = priorities.filter((p) => items.some((g) => g.priority_slug === p.slug));

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = items.filter((g) => {
      if (status === "active" && g.is_completed) return false;
      if (status === "completed" && !g.is_completed) return false;
      if (priority !== "all" && g.priority_slug !== priority) return false;
      return !term || String(g.name || "").toLowerCase().includes(term);
    });
    const sorted = [...list];
    if (sort === "deadline") sorted.sort((a, b) => (info(a).days ?? Infinity) - (info(b).days ?? Infinity));
    else if (sort === "target") sorted.sort((a, b) => info(b).target - info(a).target);
    else if (sort === "newest") sorted.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    else sorted.sort((a, b) => info(b).percent - info(a).percent);
    return sorted;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, progress, status, priority, term, sort]);

  const actionButtons = (g) => (
    <div className="flex flex-wrap gap-2">
      {!g.is_completed && <Button size="sm" variant="luxury" onClick={() => openSavings(g)}>Add Savings</Button>}
      {Number(g.saved_amount) > 0 && <Button size="sm" variant="secondary" onClick={() => openSavings(g, true)}>Release Savings</Button>}
      <Button size="sm" variant="secondary" onClick={() => openEdit(g)}>Edit</Button>
      <Button size="sm" variant="danger" onClick={() => deleteGuard.request(g.slug, `goal "${g.name}"`)}>Delete</Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Goals" subtitle="Set a target, add savings as you go, track your progress." actions={<Button variant="luxury" onClick={openCreate}>Add Goal</Button>} />

      {loading && items.length === 0 ? (
        <Card><Spinner label="Loading goals…" /></Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="No goals yet" description="Give your savings a destination: a car, a trip, an emergency fund." action={<Button variant="luxury" onClick={openCreate}>Add Goal</Button>} />
        </Card>
      ) : (
        <>
          {/* ---------- overview ---------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon="savings" tone="bg-emerald-glow text-emerald" label="Total saved" amount={totalSaved} note="Set aside for your goals" />
            <StatTile icon="goal" tone="bg-primary-soft text-primary" label="Still to save" amount={stillToSave} note={`Across ${active.length} active goal${active.length === 1 ? "" : "s"}`} />
            <StatTile icon="analytics" tone="bg-gold-light text-gold" label="Active goals" amount={active.length} integer note={done.length ? `${done.length} completed${dueSoon ? ` · ${dueSoon} due within 30 days` : ""}` : dueSoon ? `${dueSoon} due within 30 days` : "In progress"} />
            <StatTile icon="wallet" tone="bg-[#e0f7fd] text-[#0e9bc0]" label="Usable balance" amount={Number(summary?.usable_balance) || 0} note="Left after goal savings" ready={Boolean(summary)} />
          </div>

          {/* ---------- overall progress ---------- */}
          {active.length > 0 && (
            <Card>
              <div className="flex flex-wrap items-center gap-6">
                <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 ${Math.min(overallPercent, 100)}%, #e8eef9 0)` }} role="img" aria-label={`${Math.round(overallPercent)} percent of your active goals saved`}>
                  <div className="absolute inset-[10px] rounded-full bg-card" />
                  <span className="relative font-display text-[1.45rem] font-extrabold tracking-[-0.03em] text-ink"><Percent value={overallPercent} /></span>
                </div>
                <div className="min-w-[220px] flex-1">
                  <h3 className="font-display text-[1.05rem] font-bold tracking-[-0.02em] text-ink">Overall progress</h3>
                  <p className="mt-0.5 text-sm text-muted">{formatCurrency(activeSaved)} saved of {formatCurrency(activeTarget)} across your active goals.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {closest && (
                      <div className="rounded-xl bg-emerald-glow px-3.5 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Closest to done</p>
                        <p className="mt-0.5 truncate text-sm font-extrabold text-ink">{closest.name}</p>
                        <p className="text-xs text-emerald">{Math.round(info(closest).percent)}% saved</p>
                      </div>
                    )}
                    {nextDeadline ? (
                      <div className="rounded-xl bg-gold-light px-3.5 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Next deadline</p>
                        <p className="mt-0.5 truncate text-sm font-extrabold text-ink">{nextDeadline.name}</p>
                        <p className="text-xs text-gold">{info(nextDeadline).deadline.text}</p>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-primary-soft/60 px-3.5 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Next deadline</p>
                        <p className="mt-0.5 text-sm font-semibold text-nav">None of your goals has an upcoming target date.</p>
                      </div>
                    )}
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
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search goals by name…" aria-label="Search goals" className="h-11 w-full rounded-xl border border-cardBorder bg-input pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15" />
                {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-hover hover:text-ink">×</button>}
              </label>
              {priorityOptions.length > 0 && (
                <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority" className="h-11 rounded-xl border border-cardBorder bg-input px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15">
                  <option value="all">Any priority</option>
                  {priorityOptions.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                </select>
              )}
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort goals" className="h-11 rounded-xl border border-cardBorder bg-input px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15">
                {SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <div role="group" aria-label="View" className="inline-flex rounded-xl border border-cardBorder bg-input p-1">
                {[["cards", "Cards"], ["list", "List"]].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => changeView(key)} aria-pressed={view === key} className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${view === key ? "bg-card text-primary shadow-card" : "text-muted hover:text-ink"}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-itemBorder pt-3" role="group" aria-label="Status">
              {STATUS_TABS.map((t) => (
                <button key={t.key} type="button" onClick={() => setStatus(t.key)} aria-pressed={status === t.key} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-bold transition-all ${status === t.key ? "border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary"}`}>
                  {t.label}<span className={`rounded-full px-1.5 text-[10px] ${status === t.key ? "bg-white/25" : "bg-primary-soft text-primary"}`}>{statusCounts[t.key]}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* ---------- goals ---------- */}
          {visible.length === 0 ? (
            <Card><div className="px-5 py-10 text-center text-sm text-muted">No goals match your search or filters.</div></Card>
          ) : view === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((g) => {
                const i = info(g);
                const priorityLabel = priorityName(g.priority_slug);
                return (
                  <Card key={g.slug} className="group">
                    <CardBody>
                      <div className="flex items-start gap-4">
                        <div className="relative grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${g.is_completed ? "#10b981" : "#1565ff"} ${i.percent}%, #e8eef9 0)` }} role="img" aria-label={`${Math.round(i.percent)} percent saved`}>
                          <div className="absolute inset-[7px] rounded-full bg-card" />
                          <span className="relative font-display text-[0.95rem] font-extrabold tracking-[-0.03em] text-ink">{Math.round(i.percent)}%</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="truncate font-display text-[1.02rem] font-bold tracking-[-0.02em] text-ink">{g.name}</h3>
                            {g.is_completed ? <Badge tone="emerald">Completed</Badge> : priorityLabel ? <Badge tone="gold">{priorityLabel}</Badge> : null}
                          </div>
                          <p className="mt-1 font-display text-[1.3rem] font-extrabold leading-tight tracking-[-0.04em] text-ink">{formatCurrency(i.saved)}</p>
                          <p className="text-xs text-muted">of {formatCurrency(i.target)}</p>
                        </div>
                      </div>
                      <div className="mt-4"><ProgressBar percent={i.percent} tone={g.is_completed ? "emerald" : "primary"} /></div>
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-muted">{g.is_completed ? (g.completed_at ? `Completed ${formatDate(g.completed_at)}` : "Goal reached") : `${formatCurrency(i.left)} to go`}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${i.deadline.cls}`}>{i.deadline.text}</span>
                      </div>
                      {i.perMonth != null && <p className="mt-2 rounded-lg bg-primary-soft/50 px-3 py-1.5 text-[11.5px] text-nav">Save about <b className="text-ink">{formatCurrency(i.perMonth)}</b> a month to reach it on time.</p>}
                      <div className="mt-4">{actionButtons(g)}</div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <ul className="m-0 list-none divide-y divide-itemBorder p-0">
                {visible.map((g) => {
                  const i = info(g);
                  const priorityLabel = priorityName(g.priority_slug);
                  return (
                    <li key={g.slug} className="group grid gap-x-5 gap-y-3 px-5 py-4 transition hover:bg-primary-soft/40 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,1fr)_auto] lg:items-center">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${g.is_completed ? "bg-emerald-glow text-emerald" : "bg-primary-soft text-primary"}`}><Icon name="goal" size={19} /></span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-ink">{g.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                            {g.is_completed ? <Badge tone="emerald">Completed</Badge> : priorityLabel ? <Badge tone="gold">{priorityLabel}</Badge> : null}
                            <span className={`rounded-full px-2.5 py-0.5 font-bold ${i.deadline.cls}`}>{i.deadline.text}</span>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-extrabold text-ink">{formatCurrency(i.saved)} <span className="font-medium text-muted">of {formatCurrency(i.target)}</span></span>
                          <span className="font-bold text-nav">{Math.round(i.percent)}%</span>
                        </div>
                        <ProgressBar percent={i.percent} tone={g.is_completed ? "emerald" : "primary"} />
                        {!g.is_completed && <p className="mt-1.5 text-[11px] text-muted">{formatCurrency(i.left)} to go</p>}
                      </div>
                      <div className="lg:justify-self-end">{actionButtons(g)}</div>
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
        title={editing ? "Edit Goal" : "Add Goal"}
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
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Target Amount" type="number" step="0.01" required value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required disabled={!!editing} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="Target Date (optional)" type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
          </div>
          <Select label="Priority (optional)" value={form.priority_slug} onChange={(e) => setForm({ ...form, priority_slug: e.target.value })}>
            <option value="">None</option>
            {priorities.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      <Modal
        open={!!savingsTarget}
        onClose={() => setSavingsTarget(null)}
        title={`${releaseMode ? "Release" : "Add"} savings ${releaseMode ? "from" : "to"} "${savingsTarget?.name}"`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSavingsTarget(null)}>
              Cancel
            </Button>
            <Button variant="luxury" onClick={handleAddSavings} loading={addingSavings}>
              {releaseMode ? "Release" : "Add"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddSavings} className="space-y-3">
          <Input label="Amount" type="number" step="0.01" min="0.01" required value={savingsAmount} onChange={(e) => setSavingsAmount(e.target.value)} />
          <label className="block text-xs text-muted">From account
            <select required className="w-full rounded-lg border border-cardBorder bg-card p-2 text-ink" value={savingFields.account_slug} onChange={e=>setSavingFields(s=>({...s,account_slug:e.target.value,payment_method_slug:""}))}>
              <option value="">Select account</option>{accounts.map(a=><option key={a.slug} value={a.slug}>{a.name}</option>)}
            </select>
          </label>
          <label className="block text-xs text-muted">Payment method
            <select required className="w-full rounded-lg border border-cardBorder bg-card p-2 text-ink" value={savingFields.payment_method_slug} onChange={e=>setSavingFields(s=>({...s,payment_method_slug:e.target.value}))}>
              <option value="">Select payment method</option>{methods.filter(m=>!savingFields.account_slug || m.account_slug===savingFields.account_slug).map(m=><option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select>
          </label>
          <Input label="Description" required value={savingFields.description} onChange={e=>setSavingFields(s=>({...s,description:e.target.value}))} />
          <Input label="Date" type="date" required value={savingFields.txn_date} onChange={e=>setSavingFields(s=>({...s,txn_date:e.target.value}))} />
          <Input label="Time" type="time" required value={savingFields.txn_time} onChange={e=>setSavingFields(s=>({...s,txn_time:e.target.value}))} />
          <Input label="Remarks (optional)" value={savingFields.remarks} onChange={e=>setSavingFields(s=>({...s,remarks:e.target.value}))} />
        </form>
      </Modal>

      <DeleteGuardDialog guard={deleteGuard} itemNoun="goal" />
    </div>
  );
}
