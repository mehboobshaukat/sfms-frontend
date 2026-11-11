import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { creditPurchasesApi } from "../api/creditPurchases";
import { contactsApi } from "../api/contacts";
import { categoriesApi } from "../api/categories";
import { apiErrorMessage } from "../api/client";

import PageHeader from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import Table from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ProgressBar from "../components/ui/ProgressBar";
import StatTile from "../components/ui/StatTile";
import { dueInfo } from "../lib/dueInfo";
import Icon from "../components/ui/Icon";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { Input } from "../components/ui/Input";
import Select from "../components/ui/Select";
import { formatCurrency, formatDate, todayISODate } from "../lib/formatters";
import { CREDIT_TYPES } from "../lib/constants";
import useViewMode, { TABLE_QUERY } from "../lib/useViewMode";

const TABS = [
  { key: "all", label: "All" },
  { key: "received", label: "I Owe (Received)" },
  { key: "given", label: "Owed To Me (Given)" },
];

const STATUS_CHIPS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "settled", label: "Settled" },
];

const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "due", label: "Due soonest" },
  { key: "remaining", label: "Largest remaining" },
];


const paidPercent = (r) => {
  const total = Number(r.total_amount) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (1 - (Number(r.remaining_amount) || 0) / total) * 100));
};

const emptyForm = { credit_type: "received", contact_slug: "", category_slug: "", item_description: "", total_amount: "", purchase_date: todayISODate(), due_date: "" };

export default function CreditPurchases() {
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, changeView] = useViewMode("sfms-credit-view", { wide: "table", narrow: "list", query: TABLE_QUERY });
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ item_description: "", category_slug: "", due_date: "" });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, t] = await Promise.all([creditPurchasesApi.list({}), creditPurchasesApi.outstandingTotals()]);
      setItems(list);
      setTotals(t);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    contactsApi.list({ active_only: true }).then(setContacts).catch(() => {});
    contactsApi.list().then(setAllContacts).catch(() => {});
    categoriesApi.list({ active_only: true }).then(setCategories).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await creditPurchasesApi.create({
        ...form,
        category_slug: form.category_slug || null,
        due_date: form.due_date || null,
        total_amount: Number(form.total_amount),
      });
      toast.success("Credit purchase recorded.");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({ item_description: item.item_description, category_slug: item.category_slug || "", due_date: item.due_date || "" });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await creditPurchasesApi.update(editTarget.slug, {
        item_description: editForm.item_description,
        category_slug: editForm.category_slug || null,
        due_date: editForm.due_date || null,
      });
      toast.success("Credit purchase updated.");
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await creditPurchasesApi.remove(deleteTarget.slug);
      toast.success("Credit purchase deleted.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't delete — it may already have payments recorded against it."));
    } finally {
      setDeleting(false);
    }
  };

  const contactName = (slug) => allContacts.find((c) => c.slug === slug)?.name || contacts.find((c) => c.slug === slug)?.name || "—";
  const categoryName = (slug) => categories.find((c) => c.slug === slug)?.name || "";


  // Counts and overview figures come from the full list, so they stay stable while you switch tabs.
  const inDirection = (r) => tab === "all" || r.credit_type === tab;
  const tabCounts = {
    all: items.length,
    received: items.filter((r) => r.credit_type === "received").length,
    given: items.filter((r) => r.credit_type === "given").length,
  };
  const statusCounts = {
    all: items.filter(inDirection).length,
    active: items.filter((r) => inDirection(r) && !r.is_completed).length,
    settled: items.filter((r) => inDirection(r) && r.is_completed).length,
  };
  const openItems = items.filter((r) => !r.is_completed);
  const overdueCount = openItems.filter((r) => dueInfo(r).overdue).length;
  const dueSoonCount = openItems.filter((r) => dueInfo(r).soon).length;
  const pendingOwed = Number(totals?.pending_owed_total) || 0;
  const pendingReceivable = Number(totals?.pending_receivable_total) || 0;

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = items.filter((r) => {
      if (tab !== "all" && r.credit_type !== tab) return false;
      if (status === "active" && r.is_completed) return false;
      if (status === "settled" && !r.is_completed) return false;
      if (!term) return true;
      return [r.item_description, contactName(r.contact_slug), categoryName(r.category_slug)].some((v) => String(v || "").toLowerCase().includes(term));
    });
    const sorted = [...list];
    if (sort === "due") {
      sorted.sort((a, b) => (a.due_date ? Date.parse(a.due_date) : Infinity) - (b.due_date ? Date.parse(b.due_date) : Infinity));
    } else if (sort === "remaining") {
      sorted.sort((a, b) => (Number(b.remaining_amount) || 0) - (Number(a.remaining_amount) || 0));
    } else {
      sorted.sort((a, b) => String(b.purchase_date || "").localeCompare(String(a.purchase_date || "")));
    }
    return sorted;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, tab, status, term, sort, allContacts, contacts, categories]);

  const actionButtons = (r) => (
    <div className="sfms-actions justify-end">
      <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
        Edit
      </Button>
      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(r)}>
        Delete
      </Button>
    </div>
  );

  const columns = [
    { key: "item_description", header: "Item", render: (r) => <span className="truncate block max-w-[220px] font-medium text-ink">{r.item_description}</span> },
    { key: "contact", header: "Contact", render: (r) => contactName(r.contact_slug) },
    {
      key: "credit_type",
      header: "Direction",
      render: (r) => <Badge tone={r.credit_type === "received" ? "danger" : "emerald"}>{r.credit_type === "received" ? "I owe" : "Owed to me"}</Badge>,
    },
    { key: "total_amount", header: "Total", className: "text-right", render: (r) => formatCurrency(r.total_amount) },
    {
      key: "remaining_amount",
      header: "Remaining",
      className: "w-40",
      render: (r) => {
        const pct = paidPercent(r);
        return (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">{formatCurrency(r.remaining_amount)} left</span>
              <span className="text-muted">{Math.round(pct)}%</span>
            </div>
            <ProgressBar percent={pct} tone={r.is_completed ? "emerald" : "gold"} />
          </div>
        );
      },
    },
    { key: "due_date", header: "Due", render: (r) => (r.due_date ? formatDate(r.due_date) : "—") },
    { key: "status", header: "Status", render: (r) => (r.is_completed ? <Badge tone="emerald">Settled</Badge> : <Badge tone="gold">Active</Badge>) },
    { key: "actions", header: "", className: "text-right", render: actionButtons },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Credit Purchases"
        subtitle="Items received or given on credit — kept separate from cash loans. Settle them via an Item Payment Made/Received transaction."
        actions={
          <>
            <Link to="/transactions/new" className="no-underline">
              <Button variant="secondary">Record Item Payment</Button>
            </Link>
            <Button variant="luxury" onClick={openCreate}>+ Record Credit Purchase</Button>
          </>
        }
      />

      {/* ---------- overview ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="arrowUp" tone="bg-danger-soft text-danger" label="You owe" amount={pendingOwed} note="Received on credit, outstanding" ready={Boolean(totals)} />
        <StatTile icon="arrowDownLong" tone="bg-emerald-glow text-emerald" label="Owed to you" amount={pendingReceivable} note="Given on credit, outstanding" ready={Boolean(totals)} />
        <StatTile icon="analytics" tone="bg-primary-soft text-primary" label="Net position" amount={pendingReceivable - pendingOwed} signed note={pendingReceivable - pendingOwed >= 0 ? "In your favour" : "You owe more than you are owed"} ready={Boolean(totals)} />
        <StatTile icon="credit" tone="bg-gold-light text-gold" label="Open items" amount={openItems.length} integer note={overdueCount ? `${overdueCount} overdue${dueSoonCount ? ` · ${dueSoonCount} due this week` : ""}` : dueSoonCount ? `${dueSoonCount} due this week` : "None overdue"} ready={!loading || items.length > 0} />
      </div>

      {/* ---------- toolbar ---------- */}
      <Card className="!p-3.5 sm:!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-[200px]">
            <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item, contact or category…"
              aria-label="Search credit purchases"
              className="h-11 w-full rounded-xl border border-cardBorder bg-input pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-hover hover:text-ink">×</button>}
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by" className="h-11 rounded-xl border border-cardBorder bg-input px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15">
            {SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <div role="group" aria-label="View" className="inline-flex rounded-xl border border-cardBorder bg-input p-1">
            {[["list", "List"], ["table", "Table"]].map(([key, label]) => (
              <button key={key} type="button" onClick={() => changeView(key)} aria-pressed={view === key} className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${view === key ? "bg-card text-primary shadow-card" : "text-muted hover:text-ink"}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-itemBorder pt-3">
          <div className="sfms-noscroll flex gap-2 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-bold transition-all ${
                  tab === t.key ? "border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-[10px] ${tab === t.key ? "bg-white/25" : "bg-primary-soft text-primary"}`}>{tabCounts[t.key]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status">
            {STATUS_CHIPS.map((c) => (
              <button key={c.key} type="button" onClick={() => setStatus(c.key)} aria-pressed={status === c.key} className={`rounded-full px-3 py-1 text-xs font-bold transition ${status === c.key ? "bg-primary-soft text-primary ring-1 ring-primary-border" : "text-muted hover:text-ink"}`}>
                {c.label} <span className="opacity-70">{statusCounts[c.key]}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ---------- results ---------- */}
      <Card>
        {loading && items.length === 0 ? (
          <Spinner label="Loading credit purchases…" />
        ) : items.length === 0 ? (
          <EmptyState title="No credit purchases yet" description="Record an item you received or gave on credit." action={<Button variant="luxury" onClick={openCreate}>Record Credit Purchase</Button>} />
        ) : (
          <CardBody className={`p-0 pt-2 transition-opacity duration-200 ${loading ? "pointer-events-none opacity-60" : ""}`}>
            {visible.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">No credit purchases match your search or filters.</div>
            ) : view === "table" ? (
              <Table columns={columns} rows={visible} />
            ) : (
              <ul className="m-0 list-none divide-y divide-itemBorder border-t border-itemBorder p-0">
                {visible.map((r) => {
                  const owe = r.credit_type === "received";
                  const pct = paidPercent(r);
                  const due = dueInfo(r);
                  const category = categoryName(r.category_slug);
                  return (
                    <li key={r.slug} className="group grid gap-x-5 gap-y-3 px-5 py-4 transition hover:bg-primary-soft/40 lg:grid-cols-[minmax(0,1.5fr)_minmax(220px,1fr)_auto] lg:items-center">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${owe ? "bg-danger-soft text-danger" : "bg-emerald-glow text-emerald"}`}>
                          <Icon name={owe ? "arrowUp" : "arrowDownLong"} size={19} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-ink">{r.item_description}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                            <Badge tone={owe ? "danger" : "emerald"}>{owe ? "I owe" : "Owed to me"}</Badge>
                            <span className="font-semibold text-nav">{contactName(r.contact_slug)}</span>
                            {category && <><span className="text-subtle">•</span><span>{category}</span></>}
                            <span className="text-subtle">•</span>
                            <span>{formatDate(r.purchase_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-extrabold text-ink">{formatCurrency(r.remaining_amount)} <span className="font-medium text-muted">left of {formatCurrency(r.total_amount)}</span></span>
                          <span className="font-bold text-nav">{Math.round(pct)}%</span>
                        </div>
                        <ProgressBar percent={pct} tone={r.is_completed ? "emerald" : due.overdue ? "danger" : "primary"} />
                        <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${due.cls}`}>{due.text}</span>
                      </div>

                      <div className="lg:justify-self-end">{actionButtons(r)}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        )}
      </Card>

      <p className="flex items-start gap-2 rounded-xl bg-primary-soft/60 px-4 py-3 text-xs leading-relaxed text-nav">
        <Icon name="info" size={16} className="mt-0.5 shrink-0 text-primary" />
        <span>To pay off or collect on a credit purchase, <Link to="/transactions/new" className="font-bold text-primary hover:underline">record an Item Payment transaction</Link> and select it there.</span>
      </p>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Credit Purchase"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="luxury" onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Direction" required value={form.credit_type} onChange={(e) => setForm({ ...form, credit_type: e.target.value })}>
            {CREDIT_TYPES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
          <Select label="Contact" required value={form.contact_slug} onChange={(e) => setForm({ ...form, contact_slug: e.target.value })}>
            <option value="">Select…</option>
            {contacts.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </Select>
          <Select label="Category (optional)" value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </Select>
          <Input label="Item Description" required value={form.item_description} onChange={(e) => setForm({ ...form, item_description: e.target.value })} />
          <Input label="Total Amount" type="number" min="0.01" step="0.01" required value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Purchase Date" type="date" required value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            <Input label="Due Date (optional)" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Credit Purchase"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="luxury" onClick={handleEditSave} loading={editSaving}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleEditSave} className="space-y-4">
          <p className="text-xs text-muted">
            Direction, contact, and total amount can't be changed once created — delete and
            re-record instead if one of those was wrong.
          </p>
          <Input label="Item Description" required value={editForm.item_description} onChange={(e) => setEditForm({ ...editForm, item_description: e.target.value })} />
          <Select label="Category (optional)" value={editForm.category_slug} onChange={(e) => setEditForm({ ...editForm, category_slug: e.target.value })}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </Select>
          <Input label="Due Date (optional)" type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this credit purchase?"
        description={`Permanently delete "${deleteTarget?.item_description}"? Blocked if any payment transactions are already recorded against it.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
