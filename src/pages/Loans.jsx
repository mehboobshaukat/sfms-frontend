import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { loansApi } from "../api/loans";
import { contactsApi } from "../api/contacts";
import { apiErrorMessage } from "../api/client";

import PageHeader from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ProgressBar from "../components/ui/ProgressBar";
import StatTile from "../components/ui/StatTile";
import { formatCurrency, formatDate } from "../lib/formatters";
import { dueInfo, paidPercent } from "../lib/dueInfo";
import useViewMode, { TABLE_QUERY } from "../lib/useViewMode";

const TABS = [
  { key: "all", label: "All Loans" },
  { key: "received", label: "Borrowed (you owe)" },
  { key: "given", label: "Lent (owed to you)" },
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


const isBorrowed = (loan) => loan.loan_type === "received";

export default function Loans() {
  const [tab, setTab] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, changeView] = useViewMode("sfms-loans-view", { wide: "table", narrow: "list", query: TABLE_QUERY });
  const [loans, setLoans] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // One request for every loan; tabs and filters then work instantly on the client.
  useEffect(() => {
    let active = true;
    setLoading(true);
    loansApi.list()
      .then((data) => { if (active) setLoans(data); })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => { if (active) setLoading(false); });
    contactsApi.list().then((list) => { if (active) setContacts(list); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const contactName = (slug) => (slug ? contacts.find((c) => c.slug === slug)?.name || "—" : "—");


  // Overview figures use every loan, so they stay put while you switch tabs.
  const open = loans.filter((l) => !l.is_completed);
  const youOwe = open.filter(isBorrowed).reduce((sum, l) => sum + (Number(l.remaining_amount) || 0), 0);
  const owedToYou = open.filter((l) => !isBorrowed(l)).reduce((sum, l) => sum + (Number(l.remaining_amount) || 0), 0);
  const overdue = open.filter((l) => dueInfo(l).overdue).length;
  const dueSoon = open.filter((l) => dueInfo(l).soon).length;

  const inTab = (l) => tab === "all" || l.loan_type === tab;
  const tabCounts = { all: loans.length, received: loans.filter((l) => l.loan_type === "received").length, given: loans.filter((l) => l.loan_type === "given").length };
  const statusCounts = {
    all: loans.filter(inTab).length,
    active: loans.filter((l) => inTab(l) && !l.is_completed).length,
    settled: loans.filter((l) => inTab(l) && l.is_completed).length,
  };

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    const list = loans.filter((l) => {
      if (!inTab(l)) return false;
      if (status === "active" && l.is_completed) return false;
      if (status === "settled" && !l.is_completed) return false;
      if (!term) return true;
      return [l.loan_code, contactName(l.contact_slug)].some((v) => String(v || "").toLowerCase().includes(term));
    });
    const sorted = [...list];
    if (sort === "due") sorted.sort((a, b) => (a.due_date ? Date.parse(a.due_date) : Infinity) - (b.due_date ? Date.parse(b.due_date) : Infinity));
    else if (sort === "remaining") sorted.sort((a, b) => (Number(b.remaining_amount) || 0) - (Number(a.remaining_amount) || 0));
    else sorted.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return sorted;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans, tab, status, term, sort, contacts]);

  const columns = [
    { key: "loan_code", header: "Loan Code", render: (r) => <span className="font-medium">{r.loan_code}</span> },
    { key: "contact", header: "Contact", render: (r) => contactName(r.contact_slug) },
    {
      key: "loan_type",
      header: "Type",
      render: (r) => <Badge tone={isBorrowed(r) ? "danger" : "emerald"}>{isBorrowed(r) ? "Borrowed" : "Lent"}</Badge>,
    },
    { key: "principal_amount", header: "Principal", className: "text-right", render: (r) => formatCurrency(r.principal_amount) },
    {
      key: "remaining_amount",
      header: "Remaining",
      className: "w-40",
      render: (r) => {
        const pct = paidPercent(r.principal_amount, r.remaining_amount);
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
    { key: "due_date", header: "Due Date", render: (r) => (r.due_date ? formatDate(r.due_date) : "—") },
    {
      key: "status",
      header: "Status",
      render: (r) => (r.is_completed ? <Badge tone="emerald">Settled</Badge> : <Badge tone="gold">Active</Badge>),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Loans"
        subtitle="Pure cash lending — opened and settled automatically through Loan Received / Given / Repaid / Collected transactions. Items on credit live separately under Credit Purchases."
        actions={
          <Link to="/transactions/new" className="no-underline">
            <Button variant="luxury">+ Record Loan Transaction</Button>
          </Link>
        }
      />

      {/* ---------- overview ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="arrowUp" tone="bg-danger-soft text-danger" label="You owe" amount={youOwe} note="Borrowed, still to repay" ready={!loading || loans.length > 0} />
        <StatTile icon="arrowDownLong" tone="bg-emerald-glow text-emerald" label="Owed to you" amount={owedToYou} note="Lent, still to collect" ready={!loading || loans.length > 0} />
        <StatTile icon="analytics" tone="bg-primary-soft text-primary" label="Net position" amount={owedToYou - youOwe} signed note={owedToYou - youOwe >= 0 ? "In your favour" : "You owe more than you are owed"} ready={!loading || loans.length > 0} />
        <StatTile icon="loan" tone="bg-gold-light text-gold" label="Open loans" amount={open.length} integer note={overdue ? `${overdue} overdue${dueSoon ? ` · ${dueSoon} due this week` : ""}` : dueSoon ? `${dueSoon} due this week` : "None overdue"} ready={!loading || loans.length > 0} />
      </div>

      {/* ---------- toolbar ---------- */}
      <Card className="!p-3.5 sm:!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-[200px]">
            <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by loan code or contact…"
              aria-label="Search loans"
              className="h-11 w-full rounded-xl border border-cardBorder bg-input pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-hover hover:text-ink">×</button>}
          </label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort loans" className="h-11 rounded-xl border border-cardBorder bg-input px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15">
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
          <div className="flex items-center gap-1.5" role="group" aria-label="Status">
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
        {loading && loans.length === 0 ? (
          <Spinner label="Loading loans…" />
        ) : loans.length === 0 ? (
          <EmptyState
            title="No loans here yet"
            description="Record a Loan Received, Loan Given, Loan Repaid, or Loan Collected transaction to see it here."
            action={<Link to="/transactions/new"><Button variant="luxury">Record Loan Transaction</Button></Link>}
          />
        ) : (
          <CardBody className="p-0 pt-2">
            {visible.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">No loans match your search or filters.</div>
            ) : view === "table" ? (
              <Table columns={columns} rows={visible} rowKey="loan_code" />
            ) : (
              <ul className="m-0 list-none divide-y divide-itemBorder border-t border-itemBorder p-0">
                {visible.map((l) => {
                  const borrowed = isBorrowed(l);
                  const pct = paidPercent(l.principal_amount, l.remaining_amount);
                  const due = dueInfo(l);
                  return (
                    <li key={l.loan_code} className="group grid gap-x-5 gap-y-3 px-5 py-4 transition hover:bg-primary-soft/40 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,1fr)] lg:items-center">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${borrowed ? "bg-danger-soft text-danger" : "bg-emerald-glow text-emerald"}`}>
                          <Icon name={borrowed ? "arrowUp" : "arrowDownLong"} size={19} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-ink">{contactName(l.contact_slug)}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                            <Badge tone={borrowed ? "danger" : "emerald"}>{borrowed ? "Borrowed" : "Lent"}</Badge>
                            <span className="font-mono text-nav">{l.loan_code}</span>
                            <span className="text-subtle">•</span>
                            <span>Opened {formatDate(l.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-extrabold text-ink">{formatCurrency(l.remaining_amount)} <span className="font-medium text-muted">left of {formatCurrency(l.principal_amount)}</span></span>
                          <span className="font-bold text-nav">{Math.round(pct)}%</span>
                        </div>
                        <ProgressBar percent={pct} tone={l.is_completed ? "emerald" : due.overdue ? "danger" : "primary"} />
                        <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${due.cls}`}>{due.text}</span>
                      </div>
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
        <span>Loans open and close by themselves. To repay or collect, <Link to="/transactions/new" className="font-bold text-primary hover:underline">record a Loan Repaid or Loan Collected transaction</Link>. Items bought or given on credit are tracked under <Link to="/credit-purchases" className="font-bold text-primary hover:underline">Credit Purchases</Link>.</span>
      </p>
    </div>
  );
}
