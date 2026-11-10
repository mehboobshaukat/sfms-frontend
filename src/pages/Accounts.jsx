import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { accountsApi } from "../api/accounts";
import { apiErrorMessage } from "../api/client";
import { Card, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DeleteGuardDialog from "../components/ui/DeleteGuardDialog";
import { useDeleteGuard } from "../hooks/useDeleteGuard";
import { Input } from "../components/ui/Input";
import Select from "../components/ui/Select";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import PageHeader from "../components/ui/PageHeader";
import { formatCurrency } from "../lib/formatters";
import { ACCOUNT_TYPES } from "../lib/constants";
import Icon from "../components/ui/Icon";
import StatTile from "../components/ui/StatTile";
import ProgressBar from "../components/ui/ProgressBar";
import useCountUp from "../lib/useCountUp";

const emptyForm = { name: "", account_type: "cash", account_number: "", bank_name: "", branch: "", current_balance: "0" };

const TYPE_META = {
  cash: { icon: "wallet", label: "Cash", tone: "bg-emerald-glow text-emerald" },
  bank: { icon: "credit", label: "Bank", tone: "bg-primary-soft text-primary" },
  digital_wallet: { icon: "spark", label: "Digital wallet", tone: "bg-[#e0f7fd] text-[#0e9bc0]" },
};
const TYPE_TABS = [{ key: "all", label: "All" }, { key: "cash", label: "Cash" }, { key: "bank", label: "Bank" }, { key: "digital_wallet", label: "Digital wallet" }];
const STATUS_TABS = [{ key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "inactive", label: "Inactive" }];
const SORTS = [{ key: "default", label: "Default order" }, { key: "balance", label: "Highest balance" }, { key: "name", label: "Name A to Z" }];
const SEGMENT_COLORS = ["#1565ff", "#17c8f2", "#10b981", "#f5a524", "#9a74f5", "#ee79a8"];
const VIEW_KEY = "sfms-accounts-view";
const readView = () => {
  try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards"; } catch { return "cards"; }
};

/** Balance that counts up to its value. */
function Balance({ value }) {
  return <>{formatCurrency(useCountUp(value))}</>;
}

export default function Accounts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activateTarget, setActivateTarget] = useState(null);
  const [activating, setActivating] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("default");
  const [view, setView] = useState(readView);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await accountsApi.list());
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deleteGuard = useDeleteGuard(accountsApi.remove, load);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      account_type: item.account_type,
      account_number: item.account_number || "",
      bank_name: item.bank_name || "",
      branch: item.branch || "",
      current_balance: String(item.current_balance),
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const { account_type, current_balance, ...editable } = form;
        await accountsApi.update(editing.slug, editable);
        toast.success("Account updated.");
      } else {
        await accountsApi.create({ ...form, current_balance: Number(form.current_balance || 0) });
        toast.success("Account created.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await accountsApi.update(deleteTarget.slug, {is_active: false});
      toast.success("Account deactivated.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await accountsApi.update(activateTarget.slug, {is_active: true});
      toast.success("Account activated successfully.");
      setActivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setActivating(false);
    }
  };

  const changeView = (next) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable: choice just won't persist */ }
  };

  const active = items.filter((a) => a.is_active);
  const totalBalance = active.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);
  const byType = (type) => active.filter((a) => a.account_type === type);
  const sumOf = (list) => list.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);
  const positiveTotal = active.reduce((sum, a) => sum + Math.max(Number(a.current_balance) || 0, 0), 0);
  const shareOf = (a) => (positiveTotal > 0 ? (Math.max(Number(a.current_balance) || 0, 0) / positiveTotal) * 100 : 0);
  const colorOf = (a) => SEGMENT_COLORS[Math.max(0, items.indexOf(a)) % SEGMENT_COLORS.length];

  const typeCounts = {
    all: items.length,
    cash: items.filter((a) => a.account_type === "cash").length,
    bank: items.filter((a) => a.account_type === "bank").length,
    digital_wallet: items.filter((a) => a.account_type === "digital_wallet").length,
  };
  const statusCounts = { all: items.length, active: active.length, inactive: items.length - active.length };

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = items.filter((a) => {
      if (typeFilter !== "all" && a.account_type !== typeFilter) return false;
      if (statusFilter === "active" && !a.is_active) return false;
      if (statusFilter === "inactive" && a.is_active) return false;
      if (!term) return true;
      return [a.name, a.bank_name, a.branch, a.account_number, a.account_type].some((v) => String(v || "").toLowerCase().includes(term));
    });
    const sorted = [...list];
    if (sort === "balance") sorted.sort((a, b) => (Number(b.current_balance) || 0) - (Number(a.current_balance) || 0));
    else if (sort === "name") sorted.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return sorted;
  }, [items, typeFilter, statusFilter, term, sort]);

  const actionButtons = (a) => (
    <div className="flex flex-wrap gap-2">
      {a.is_active && <Button size="sm" variant="secondary" onClick={() => openEdit(a)}>Edit</Button>}
      {!a.is_default && !a.is_system && a.is_active && <Button size="sm" variant="dangerGhost" onClick={() => setDeleteTarget(a)}>Deactivate</Button>}
      {!a.is_active && !a.is_default && !a.is_system && <Button size="sm" variant="luxury" onClick={() => setActivateTarget(a)}>Activate</Button>}
      {!a.is_default && !a.is_system && <Button size="sm" variant="danger" onClick={() => deleteGuard.request(a.slug, `account "${a.name}"`)}>Delete</Button>}
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounts"
        subtitle="Cash, digital wallets, and bank accounts you record transactions against."
        actions={<Button variant="luxury" onClick={openCreate}>+ Add Account</Button>}
      />

      {loading && items.length === 0 ? (
        <Card><Spinner label="Loading accounts…" /></Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState title="No accounts yet" description="Add the cash, wallets and bank accounts you use." action={<Button variant="luxury" onClick={openCreate}>Add Account</Button>} />
        </Card>
      ) : (
        <>
          {/* ---------- overview ---------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon="wallet" tone="bg-primary-soft text-primary" label="Total balance" amount={totalBalance} note={`${active.length} active account${active.length === 1 ? "" : "s"}`} />
            <StatTile icon="wallet" tone="bg-emerald-glow text-emerald" label="Cash" amount={sumOf(byType("cash"))} note={`${byType("cash").length} account${byType("cash").length === 1 ? "" : "s"}`} />
            <StatTile icon="credit" tone="bg-gold-light text-gold" label="Bank" amount={sumOf(byType("bank"))} note={`${byType("bank").length} account${byType("bank").length === 1 ? "" : "s"}`} />
            <StatTile icon="spark" tone="bg-[#e0f7fd] text-[#0e9bc0]" label="Digital wallets" amount={sumOf(byType("digital_wallet"))} note={`${byType("digital_wallet").length} account${byType("digital_wallet").length === 1 ? "" : "s"}`} />
          </div>

          {/* ---------- where the money sits ---------- */}
          <Card>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="font-display text-[1.02rem] font-bold tracking-[-0.02em] text-ink">Where your money sits</h3>
                <p className="text-xs text-muted">Share of your total across active accounts</p>
              </div>
              <span className="text-xs font-semibold text-nav">Total <b className="font-display text-[1.05rem] text-ink">{formatCurrency(totalBalance)}</b></span>
            </div>
            {positiveTotal <= 0 ? (
              <p className="rounded-xl bg-primary-soft/50 px-4 py-6 text-center text-sm text-muted">No positive balances to show yet.</p>
            ) : (
              <>
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-primary-soft" role="img" aria-label="Share of balance per account">
                  {active.filter((a) => shareOf(a) > 0).sort((a, b) => shareOf(b) - shareOf(a)).map((a) => (
                    <span key={a.slug} title={`${a.name}: ${shareOf(a).toFixed(1)}%`} style={{ width: `${shareOf(a)}%`, backgroundColor: colorOf(a), transformOrigin: "left", animation: "sfms-bar-in .9s cubic-bezier(.2,.8,.2,1) backwards" }} className="h-full" />
                  ))}
                </div>
                <ul className="m-0 mt-4 grid list-none gap-x-6 gap-y-2.5 p-0 sm:grid-cols-2 xl:grid-cols-3">
                  {active.filter((a) => shareOf(a) > 0).sort((a, b) => shareOf(b) - shareOf(a)).map((a) => (
                    <li key={a.slug} className="flex items-center gap-2.5 text-[13px]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorOf(a) }} />
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{a.name}</span>
                      <span className="shrink-0 font-bold text-ink">{shareOf(a).toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {/* ---------- toolbar ---------- */}
          <Card className="!p-3.5 sm:!p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-[200px] flex-1">
                <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, bank or account number…" aria-label="Search accounts" className="h-11 w-full rounded-xl border border-cardBorder bg-input pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15" />
                {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-hover hover:text-ink">×</button>}
              </label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort accounts" className="h-11 rounded-xl border border-cardBorder bg-input px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15">
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
                {TYPE_TABS.map((t) => (
                  <button key={t.key} type="button" onClick={() => setTypeFilter(t.key)} aria-pressed={typeFilter === t.key} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-bold transition-all ${typeFilter === t.key ? "border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary"}`}>
                    {t.label}<span className={`rounded-full px-1.5 text-[10px] ${typeFilter === t.key ? "bg-white/25" : "bg-primary-soft text-primary"}`}>{typeCounts[t.key]}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5" role="group" aria-label="Status">
                {STATUS_TABS.map((c) => (
                  <button key={c.key} type="button" onClick={() => setStatusFilter(c.key)} aria-pressed={statusFilter === c.key} className={`rounded-full px-3 py-1 text-xs font-bold transition ${statusFilter === c.key ? "bg-primary-soft text-primary ring-1 ring-primary-border" : "text-muted hover:text-ink"}`}>
                    {c.label} <span className="opacity-70">{statusCounts[c.key]}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* ---------- accounts ---------- */}
          {visible.length === 0 ? (
            <Card><div className="px-5 py-10 text-center text-sm text-muted">No accounts match your search or filters.</div></Card>
          ) : view === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((a) => {
                const meta = TYPE_META[a.account_type] || TYPE_META.cash;
                const balance = Number(a.current_balance) || 0;
                return (
                  <Card key={a.slug} className={`group ${a.is_active ? "" : "opacity-75"}`}>
                    <CardBody>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${meta.tone}`}><Icon name={meta.icon} size={22} strokeWidth={1.9} /></span>
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-[1.02rem] font-bold tracking-[-0.02em] text-ink">{a.name}</h3>
                            <p className="mt-0.5 text-xs font-semibold text-muted">{meta.label}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {a.is_default && <Badge tone="emerald">Default</Badge>}
                          {!a.is_active && <Badge tone="danger">Inactive</Badge>}
                        </div>
                      </div>
                      <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-muted">Balance</p>
                      <p className={`truncate font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.04em] ${balance < 0 ? "text-danger" : "text-ink"}`}><Balance value={balance} /></p>
                      {a.is_active && (
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-[11px] text-muted"><span>Share of your total</span><span className="font-bold text-nav">{shareOf(a).toFixed(1)}%</span></div>
                          <ProgressBar percent={shareOf(a)} tone="primary" />
                        </div>
                      )}
                      {(a.bank_name || a.account_number) && (
                        <dl className="m-0 mt-4 space-y-1 rounded-xl bg-primary-soft/50 px-3.5 py-2.5 text-xs">
                          {a.bank_name && <div className="flex justify-between gap-3"><dt className="text-muted">Bank</dt><dd className="m-0 truncate font-semibold text-ink">{a.bank_name}{a.branch ? ` · ${a.branch}` : ""}</dd></div>}
                          {a.account_number && <div className="flex justify-between gap-3"><dt className="text-muted">Account #</dt><dd className="m-0 truncate font-mono font-semibold text-ink">{a.account_number}</dd></div>}
                        </dl>
                      )}
                      <div className="mt-4">{actionButtons(a)}</div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <ul className="m-0 list-none divide-y divide-itemBorder p-0">
                {visible.map((a) => {
                  const meta = TYPE_META[a.account_type] || TYPE_META.cash;
                  const balance = Number(a.current_balance) || 0;
                  return (
                    <li key={a.slug} className={`group flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 py-3.5 transition hover:bg-primary-soft/40 ${a.is_active ? "" : "opacity-75"}`}>
                      <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${meta.tone}`}><Icon name={meta.icon} size={19} /></span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-ink">{a.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                            <span className="font-semibold text-nav">{meta.label}</span>
                            {a.bank_name && <><span className="text-subtle">•</span><span>{a.bank_name}{a.branch ? ` · ${a.branch}` : ""}</span></>}
                            {a.account_number && <><span className="text-subtle">•</span><span className="font-mono">#{a.account_number}</span></>}
                            {a.is_default && <Badge tone="emerald">Default</Badge>}
                            {!a.is_active && <Badge tone="danger">Inactive</Badge>}
                          </div>
                        </div>
                      </div>
                      <span className={`shrink-0 text-[15px] font-extrabold ${balance < 0 ? "text-danger" : "text-ink"}`}>{formatCurrency(a.current_balance)}</span>
                      <div className="shrink-0">{actionButtons(a)}</div>
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
        title={editing ? "Edit Account" : "Add Account"}
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
          {!editing && (
            <Select
              label="Account Type"
              required
              value={form.account_type}
              onChange={(e) => setForm({ ...form, account_type: e.target.value })}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
          {form.account_type === "bank" && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Bank Name" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
              <Input label="Branch" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
            </div>
          )}
          {form.account_type !== "cash" && (
            <Input
              label="Account Number (optional)"
              value={form.account_number}
              onChange={(e) => setForm({ ...form, account_number: e.target.value })}
            />
          )}
          {!editing && (
            <Input
              label="Opening Balance"
              type="number"
              step="0.01"
              value={form.current_balance}
              onChange={(e) => setForm({ ...form, current_balance: e.target.value })}
            />
          )}
        </form>
      </Modal>

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Deactivate account?"
        description={`"${deleteTarget?.name}" will be marked inactive. Its transaction history is preserved.`}
        confirmLabel="Deactivate"
      />

      {/* Activate Confirmation Dialog */}
      <ConfirmDialog
        open={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivate}
        loading={activating}
        title="Activate account?"
        description={`"${activateTarget?.name}" will be reactivated and available for use again.`}
        confirmLabel="Activate"
      />

      <DeleteGuardDialog guard={deleteGuard} itemNoun="account" />
    </div>
  );
}