import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  ArcElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from "chart.js";

import { analyticsApi } from "../api/analytics";
import { creditPurchasesApi } from "../api/creditPurchases";
import { contactsApi } from "../api/contacts";
import { categoriesApi } from "../api/categories";
import { apiErrorMessage } from "../api/client";

import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ProgressBar from "../components/ui/ProgressBar";
import StatTile from "../components/ui/StatTile";
import Icon from "../components/ui/Icon";
import { Input } from "../components/ui/Input";
import { formatCurrency, formatDate } from "../lib/formatters";
import { DATE_RANGES } from "../lib/constants";

ChartJS.register(LineElement, PointElement, ArcElement, LinearScale, CategoryScale, Tooltip, Filler);

const pad = (n) => String(n).padStart(2, "0");
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const compact = (n) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
const PALETTE = ["#1565FF", "#17C8F2", "#10B981", "#F5A524", "#9A74F5", "#EE79A8", "#C7D0DD"];
const textColor = "#5D6F90";
const gridColor = "#E4EDFB";

/** Number of calendar days in an ISO range, both ends included. */
function daysBetween(from, to) {
  const a = new Date(`${String(from).slice(0, 10)}T00:00:00`);
  const b = new Date(`${String(to).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function Section({ data, failed, onRetry, children, emptyTitle, isEmpty }) {
  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="text-sm text-muted">This section could not be loaded.</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  if (data === null || data === undefined) return <Spinner size="sm" label="Loading…" />;
  if (isEmpty) return <EmptyState title={emptyTitle} />;
  return children;
}

export default function Analytics() {
  const [range, setRange] = useState("month");
  const [customFrom, setCustomFrom] = useState(() => localISO(new Date()));
  const [customTo, setCustomTo] = useState(() => localISO(new Date()));

  const [summary, setSummary] = useState(null);
  const [txnAnalytics, setTxnAnalytics] = useState(null);
  const [loanAnalytics, setLoanAnalytics] = useState(null);
  const [creditTotals, setCreditTotals] = useState(null);
  const [budgetAnalytics, setBudgetAnalytics] = useState(null);
  const [goalAnalytics, setGoalAnalytics] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [failed, setFailed] = useState({});
  const [loading, setLoading] = useState(true);
  const requestSequence = useRef(0);

  const contactName = (slug) => contacts.find((c) => c.slug === slug)?.name || "Unknown contact";
  const categoryName = (slug) => categories.find((c) => c.slug === slug)?.name || "Unknown category";

  const load = () => {
    if (range === "custom" && customFrom > customTo) {
      toast.error("The From date must be on or before the To date.");
      return;
    }
    const sequence = ++requestSequence.current;
    setLoading(true);
    setFailed({});
    const params = range === "custom" ? { range: "custom", date_from: customFrom, date_to: customTo } : { range };
    const isCurrent = () => sequence === requestSequence.current;
    const request = (key, promise, setter) => promise.then((data) => {
      if (isCurrent()) setter(data);
    }).catch((err) => {
      if (isCurrent()) {
        console.warn("Analytics request failed:", apiErrorMessage(err));
        setFailed((prev) => ({ ...prev, [key]: true }));
      }
    });

    // Unblock summary cards immediately, not after all the other endpoints.
    analyticsApi.summary(params)
      .then((data) => { if (isCurrent()) setSummary(data); })
      .catch((err) => { if (isCurrent()) toast.error(apiErrorMessage(err)); })
      .finally(() => { if (isCurrent()) setLoading(false); });

    request("txn", analyticsApi.transactions(params), setTxnAnalytics);
    request("loans", analyticsApi.loans(), setLoanAnalytics);
    request("credit", creditPurchasesApi.outstandingTotals(), setCreditTotals);
    request("budgets", analyticsApi.budgets(), setBudgetAnalytics);
    request("goals", analyticsApi.goals(), setGoalAnalytics);
    request("contacts", contactsApi.list(), setContacts);
    request("categories", categoriesApi.list(), setCategories);
  };

  useEffect(() => {
    load();
    return () => { requestSequence.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const daily = txnAnalytics?.daily_trend || [];
  const breakdown = txnAnalytics?.category_breakdown || [];
  const inflow = Number(summary?.total_inflow) || 0;
  const outflow = Number(summary?.total_outflow) || 0;
  const net = summary?.net_savings != null ? Number(summary.net_savings) : inflow - outflow;
  const breakdownTotal = breakdown.reduce((sum, c) => sum + (Number(c.total) || 0), 0);
  const days = summary?.period ? daysBetween(summary.period.from, summary.period.to) : null;
  const biggestDay = daily.reduce((best, d) => ((Number(d.outflow) || 0) > (Number(best?.outflow) || 0) ? d : best), null);
  const topCategory = breakdown[0];

  const insights = [
    { icon: "savings", tone: net >= 0 ? "bg-emerald-glow text-emerald" : "bg-danger-soft text-danger", label: "Savings rate", value: inflow > 0 ? `${((net / inflow) * 100).toFixed(1)}%` : "—", note: inflow > 0 ? (net >= 0 ? "of your inflow was kept" : "Outflow is above inflow") : "No inflow in this period" },
    { icon: "analytics", tone: "bg-primary-soft text-primary", label: "Top spending", value: topCategory ? topCategory.category : "—", note: topCategory && breakdownTotal > 0 ? `${((Number(topCategory.total) / breakdownTotal) * 100).toFixed(0)}% of tracked spending` : "No category data yet" },
    { icon: "calendar", tone: "bg-gold-light text-gold", label: "Average per day", value: days ? formatCurrency(outflow / days) : "—", note: days ? `Outflow over ${days} day${days === 1 ? "" : "s"}` : "Waiting for the period" },
    { icon: "arrowUp", tone: "bg-danger-soft text-danger", label: "Biggest spending day", value: biggestDay && Number(biggestDay.outflow) > 0 ? formatCurrency(biggestDay.outflow) : "—", note: biggestDay && Number(biggestDay.outflow) > 0 ? formatDate(biggestDay.date) : "No spending in this period" },
  ];

  const trendData = {
    labels: daily.map((d) => formatDate(d.date)),
    datasets: [
      { label: "Inflow", data: daily.map((d) => d.inflow), borderColor: "#10B981", backgroundColor: "rgba(16,185,129,.12)", fill: true, tension: 0.4, pointRadius: daily.length > 40 ? 0 : 3, pointBackgroundColor: "#10B981", borderWidth: 2 },
      { label: "Outflow", data: daily.map((d) => d.outflow), borderColor: "#E5304F", backgroundColor: "rgba(229,48,79,.08)", fill: true, tension: 0.4, pointRadius: daily.length > 40 ? 0 : 3, pointBackgroundColor: "#E5304F", borderWidth: 2 },
    ],
  };
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } },
    },
    scales: {
      x: { ticks: { color: textColor, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false }, border: { display: false } },
      y: { beginAtZero: true, ticks: { color: textColor, callback: (v) => compact(v) }, grid: { color: gridColor }, border: { display: false } },
    },
  };

  const donutData = {
    labels: breakdown.map((c) => c.category),
    datasets: [{ data: breakdown.map((c) => c.total), backgroundColor: breakdown.map((_, i) => PALETTE[i % PALETTE.length]), borderColor: "#fff", borderWidth: 3, hoverOffset: 4 }],
  };
  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}` } } },
  };

  // "received" loans are money you borrowed (you owe it); "given" loans are money you lent (owed to you).
  const youOweLoans = Number(loanAnalytics?.pending_received_total) || 0;
  const owedToYouLoans = Number(loanAnalytics?.pending_given_total) || 0;
  const loanContacts = (loanAnalytics?.active_by_contact || []).filter((c) => (Number(c.received) || 0) > 0 || (Number(c.given) || 0) > 0);
  const creditOwe = Number(creditTotals?.pending_owed_total) || 0;
  const creditReceivable = Number(creditTotals?.pending_receivable_total) || 0;

  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.label;

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" subtitle="Deep dive into transactions, loans, credit purchases, budgets, and goals." />

      {/* ---------- range ---------- */}
      <Card className="!p-3.5 sm:!p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="sfms-noscroll flex gap-2 overflow-x-auto" role="group" aria-label="Date range">
            {DATE_RANGES.map((r) => (
              <button key={r.value} type="button" onClick={() => setRange(r.value)} aria-pressed={range === r.value} className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-bold transition-all ${range === r.value ? "border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary"}`}>
                {r.label}
              </button>
            ))}
          </div>
          {summary?.period && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-cardBorder bg-card/70 px-3 py-1.5 text-xs font-semibold text-nav">
              <Icon name="calendar" size={15} className="text-primary" />
              {formatDate(summary.period.from)} — {formatDate(summary.period.to)}
            </span>
          )}
        </div>
        {range === "custom" && (
          <div className="mt-3 flex flex-col items-end gap-3 border-t border-itemBorder pt-3 sm:flex-row">
            <Input label="From" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="max-w-xs" />
            <Input label="To" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="max-w-xs" />
            <Button variant="luxury" onClick={load} loading={loading}>Apply</Button>
          </div>
        )}
      </Card>

      {loading && !summary ? (
        <Card><Spinner label="Crunching your numbers…" /></Card>
      ) : (
        <div className={`space-y-5 transition-opacity duration-200 ${loading ? "pointer-events-none opacity-60" : ""}`}>
          {/* ---------- KPIs ---------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon="arrowDownLong" tone="bg-emerald-glow text-emerald" label="Total Inflow" amount={inflow} note={rangeLabel} />
            <StatTile icon="arrowUp" tone="bg-danger-soft text-danger" label="Total Outflow" amount={outflow} note={rangeLabel} />
            <StatTile icon="savings" tone="bg-primary-soft text-primary" label="Net Savings" amount={net} signed note={inflow > 0 ? `${((net / inflow) * 100).toFixed(1)}% of inflow` : "No inflow in this period"} />
            <StatTile icon="budget" tone={(summary?.budgets_over_limit ?? 0) > 0 ? "bg-danger-soft text-danger" : "bg-gold-light text-gold"} label="Budgets Over Limit" amount={Number(summary?.budgets_over_limit) || 0} integer note={(summary?.budgets_over_limit ?? 0) > 0 ? "Review your budgets" : "All within limits"} />
          </div>

          {/* ---------- insights ---------- */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {insights.map((item) => (
              <div key={item.label} className="flex items-center gap-3.5 rounded-2xl border border-cardBorder bg-card p-4 shadow-card">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><Icon name={item.icon} size={20} /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{item.label}</p>
                  <p className="truncate font-display text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink">{item.value}</p>
                  <p className="truncate text-[11px] text-muted">{item.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ---------- trends ---------- */}
          <Card>
            <CardHeader
              title="Transaction Trends"
              subtitle="Inflow vs outflow over the selected period"
              action={
                <span className="hidden items-center gap-3 text-[11px] font-semibold text-nav sm:flex">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald" />Inflow</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" />Outflow</span>
                </span>
              }
            />
            <Section data={txnAnalytics} failed={failed.txn} onRetry={load} isEmpty={daily.length === 0} emptyTitle="No data for this period">
              <div className="relative h-[280px]"><Line data={trendData} options={trendOptions} /></div>
            </Section>
          </Card>

          {/* ---------- categories ---------- */}
          <Card>
            <CardHeader title="Category Breakdown" subtitle="Where your spending went" />
            <Section data={txnAnalytics} failed={failed.txn} onRetry={load} isEmpty={breakdown.length === 0} emptyTitle="No category data">
              <div className="grid items-center gap-6 lg:grid-cols-[260px_1fr]">
                <div className="relative mx-auto h-[220px] w-[220px]">
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-semibold text-muted">Tracked total</span>
                    <span className="max-w-[130px] truncate font-display text-[1.1rem] font-extrabold tracking-[-0.03em] text-ink">{formatCurrency(breakdownTotal)}</span>
                  </div>
                </div>
                <ul className="m-0 list-none space-y-3.5 p-0">
                  {breakdown.map((c, i) => {
                    const share = breakdownTotal > 0 ? ((Number(c.total) || 0) / breakdownTotal) * 100 : 0;
                    return (
                      <li key={c.category}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} /><span className="truncate font-semibold text-ink">{c.category}</span></span>
                          <span className="shrink-0 text-ink"><b>{formatCurrency(c.total)}</b> <span className="text-xs text-muted">· {share.toFixed(1)}%</span></span>
                        </div>
                        <ProgressBar percent={share} tone="primary" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Section>
          </Card>

          {/* ---------- loans + credit purchases ---------- */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Loan Analytics" subtitle="Pure cash lending only" />
              <Section data={loanAnalytics} failed={failed.loans} onRetry={load}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald/20 bg-emerald-glow p-3.5"><p className="text-[11px] font-semibold text-muted">Owed to you</p><p className="mt-1 truncate font-display text-[1.15rem] font-extrabold text-emerald">{formatCurrency(owedToYouLoans)}</p></div>
                  <div className="rounded-2xl border border-danger/20 bg-danger-soft p-3.5"><p className="text-[11px] font-semibold text-muted">You owe</p><p className="mt-1 truncate font-display text-[1.15rem] font-extrabold text-danger">{formatCurrency(youOweLoans)}</p></div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary-soft/60 px-3.5 py-3 text-xs">
                  <span className="font-semibold text-nav">Net loan position</span>
                  <span className={`font-extrabold ${owedToYouLoans - youOweLoans >= 0 ? "text-emerald" : "text-danger"}`}>{formatCurrency(owedToYouLoans - youOweLoans)}</span>
                </div>
                {loanContacts.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-primary-border bg-primary-soft/40 px-4 py-6 text-center text-sm text-muted">No active loans.</p>
                ) : (
                  <ul className="m-0 mt-4 list-none p-0">
                    {loanContacts.map((c) => (
                      <li key={c.contact_slug} className="flex flex-wrap items-center justify-between gap-2 border-b border-itemBorder py-2.5 text-sm last:border-0">
                        <span className="font-semibold text-ink">{contactName(c.contact_slug)}</span>
                        <span className="flex flex-wrap gap-1.5">
                          {Number(c.given) > 0 && <span className="rounded-full bg-emerald-glow px-2.5 py-0.5 text-xs font-bold text-emerald">Owes you {formatCurrency(c.given)}</span>}
                          {Number(c.received) > 0 && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-bold text-danger">You owe {formatCurrency(c.received)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </Card>

            <Card>
              <CardHeader title="Credit Purchase Analytics" subtitle="Items on credit — separate from loans" action={<Link to="/credit-purchases" className="text-xs font-bold text-primary no-underline hover:underline">View all →</Link>} />
              <Section data={creditTotals} failed={failed.credit} onRetry={load}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-danger/20 bg-danger-soft p-3.5"><p className="text-[11px] font-semibold text-muted">You owe</p><p className="mt-1 truncate font-display text-[1.15rem] font-extrabold text-danger">{formatCurrency(creditOwe)}</p></div>
                  <div className="rounded-2xl border border-emerald/20 bg-emerald-glow p-3.5"><p className="text-[11px] font-semibold text-muted">Owed to you</p><p className="mt-1 truncate font-display text-[1.15rem] font-extrabold text-emerald">{formatCurrency(creditReceivable)}</p></div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary-soft/60 px-3.5 py-3 text-xs">
                  <span className="font-semibold text-nav">Net credit position</span>
                  <span className={`font-extrabold ${creditReceivable - creditOwe >= 0 ? "text-emerald" : "text-danger"}`}>{formatCurrency(creditReceivable - creditOwe)}</span>
                </div>
              </Section>
            </Card>
          </div>

          {/* ---------- budgets ---------- */}
          <Card>
            <CardHeader title="Budget Analytics" subtitle={budgetAnalytics?.length ? `${budgetAnalytics.length} active` : "Spending limits"} action={<Link to="/budgets" className="text-xs font-bold text-primary no-underline hover:underline">View budgets →</Link>} />
            <Section data={budgetAnalytics} failed={failed.budgets} onRetry={load} isEmpty={(budgetAnalytics || []).length === 0} emptyTitle="No active budgets">
              <ul className="m-0 grid list-none gap-x-8 gap-y-5 p-0 lg:grid-cols-2">
                {(budgetAnalytics || []).map((b) => {
                  const used = Number(b.percent_used) || 0;
                  return (
                    <li key={b.slug}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-semibold text-ink">{categoryName(b.category_slug)}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${used > 100 ? "bg-danger-soft text-danger" : used >= 80 ? "bg-gold-light text-gold" : "bg-emerald-glow text-emerald"}`}>{Math.round(used)}%</span>
                      </div>
                      <ProgressBar percent={used} tone={used > 100 ? "danger" : used >= 80 ? "gold" : "emerald"} />
                      {b.amount != null && <p className="mt-1.5 text-xs text-muted">{formatCurrency(b.spent_amount)} spent of {formatCurrency(b.amount)}</p>}
                    </li>
                  );
                })}
              </ul>
            </Section>
          </Card>

          {/* ---------- goals ---------- */}
          <Card>
            <CardHeader title="Goal Analytics" subtitle={goalAnalytics?.length ? `${goalAnalytics.length} goal${goalAnalytics.length === 1 ? "" : "s"}` : "Savings targets"} action={<Link to="/goals" className="text-xs font-bold text-primary no-underline hover:underline">View goals →</Link>} />
            <Section data={goalAnalytics} failed={failed.goals} onRetry={load} isEmpty={(goalAnalytics || []).length === 0} emptyTitle="No goals to analyze">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(goalAnalytics || []).map((g) => {
                  const pct = Math.min(100, Math.max(0, Number(g.progress_percent) || 0));
                  return (
                    <div key={g.slug} className="rounded-2xl border border-itemBorder p-4 transition hover:border-primary-border hover:bg-hover/40">
                      <div className="flex items-center gap-3.5">
                        <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${g.is_completed ? "#10b981" : "#1565ff"} ${pct}%, #e8eef9 0)` }} role="img" aria-label={`${Math.round(pct)} percent`}>
                          <div className="absolute inset-[6px] rounded-full bg-card" />
                          <span className="relative font-display text-[0.8rem] font-extrabold text-ink">{Math.round(pct)}%</span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">{g.name}</p>
                          <p className="text-xs text-muted">{g.is_completed ? "Completed" : g.days_remaining != null ? (g.days_remaining < 0 ? "Target date passed" : `${g.days_remaining} day${g.days_remaining === 1 ? "" : "s"} left`) : "No target date"}</p>
                          {g.target_amount != null && <p className="mt-0.5 truncate text-[11px] text-muted">{formatCurrency(g.saved_amount)} of {formatCurrency(g.target_amount)}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </Card>
        </div>
      )}
    </div>
  );
}
