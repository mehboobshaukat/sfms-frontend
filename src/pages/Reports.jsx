import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { analyticsApi } from "../api/analytics";
import { categoriesApi } from "../api/categories";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

import PageHeader from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import ProgressBar from "../components/ui/ProgressBar";
import StatTile from "../components/ui/StatTile";
import Icon from "../components/ui/Icon";
import { Input } from "../components/ui/Input";
import { formatCurrency, formatDate, getCurrency } from "../lib/formatters";
import { buildReportModel, downloadReport, EXPORT_FORMATS } from "../lib/reportExport";

const pad = (n) => String(n).padStart(2, "0");
/** Local calendar date as YYYY-MM-DD (toISOString would shift the day for users ahead of UTC). */
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function presetRange(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "last-month": return { from: localISO(new Date(y, m - 1, 1)), to: localISO(new Date(y, m, 0)) };
    case "last-30": return { from: localISO(new Date(y, m, now.getDate() - 29)), to: localISO(now) };
    case "year": return { from: localISO(new Date(y, 0, 1)), to: localISO(now) };
    default: return { from: localISO(new Date(y, m, 1)), to: localISO(now) };
  }
}

const PRESETS = [
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-30", label: "Last 30 days" },
  { key: "year", label: "This year" },
];

const FORMAT_META = {
  pdf: { chip: "PDF", tone: "bg-danger-soft text-danger", note: "Best for sharing and printing" },
  xlsx: { chip: "XLSX", tone: "bg-emerald-glow text-emerald", note: "Excel sheets with real numbers" },
  csv: { chip: "CSV", tone: "bg-primary-soft text-primary", note: "Plain data for any spreadsheet app" },
};

function DownloadMenu({ onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button variant="luxury" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>
        Download
        <Icon name="arrowDown" size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && (
        <div role="menu" aria-label="Download format" className="absolute right-0 z-30 mt-2 w-[19rem] rounded-2xl border border-cardBorder bg-card p-2 shadow-float" style={{ animation: "sfms-pop-in .2s cubic-bezier(.2,.8,.2,1)" }}>
          <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Choose a format</p>
          {Object.entries(EXPORT_FORMATS).map(([key, spec]) => (
            <button key={key} type="button" role="menuitem" onClick={() => { setOpen(false); onPick(key); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-primary-soft/60 focus-visible:bg-primary-soft/60">
              <span className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${FORMAT_META[key].tone}`}>{FORMAT_META[key].chip}</span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-bold text-ink">{spec.label}</span>
                <span className="block text-[11.5px] text-muted">{FORMAT_META[key].note}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const barTone = (percent) => (percent > 100 ? "danger" : percent >= 80 ? "gold" : "primary");

export default function Reports() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState(() => presetRange("month").from);
  const [dateTo, setDateTo] = useState(() => presetRange("month").to);
  const [preset, setPreset] = useState("month");
  const [report, setReport] = useState(null);
  const [reportMeta, setReportMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {});
  }, []);

  const categoryName = (slug) => categories.find((c) => c.slug === slug)?.name || "Budget";

  const run = async (from, to) => {
    if (from > to) {
      toast.error("The From date must be on or before the To date.");
      return;
    }
    setLoading(true);
    try {
      const data = await analyticsApi.report({ date_from: from, date_to: to });
      setReport(data);
      setReportMeta({ from, to, at: new Date() });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Show this month's report straight away so the page is never empty.
  useEffect(() => {
    run(dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = (e) => {
    e?.preventDefault();
    setPreset("");
    run(dateFrom, dateTo);
  };

  const applyPreset = (key) => {
    const { from, to } = presetRange(key);
    setDateFrom(from);
    setDateTo(to);
    setPreset(key);
    run(from, to);
  };

  const handleDownload = (format) => {
    if (!report || !reportMeta) return;
    try {
      const model = buildReportModel({
        report,
        dateFrom: reportMeta.from,
        dateTo: reportMeta.to,
        currencyCode: report.summary?.currency_code || getCurrency()?.code || "PKR",
        categoryName,
        userName: [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "",
        generatedAt: reportMeta.at,
      });
      downloadReport(model, format);
      toast.success(`${EXPORT_FORMATS[format].label} downloaded.`);
    } catch {
      toast.error("Could not create the file. Please try again.");
    }
  };

  const summary = report?.summary || {};
  const inflow = Number(summary.total_inflow) || 0;
  const net = summary.net_savings != null ? Number(summary.net_savings) : inflow - (Number(summary.total_outflow) || 0);
  const categoryRows = report?.transactions?.category_breakdown || [];
  const categoryTotal = categoryRows.reduce((sum, c) => sum + (Number(c.total) || 0), 0);
  // "given" loans are money you lent (owed to you); "received" loans are money you borrowed (you owe).
  const owedToYou = Number(report?.loans?.pending_given_total) || 0;
  const youOwe = Number(report?.loans?.pending_received_total) || 0;
  const budgets = report?.budgets || [];
  const goals = report?.goals || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Generate a combined financial report for any date range, then download it as a PDF, Excel workbook or CSV."
        actions={report && !loading ? (
          <div className="sfms-no-print flex flex-wrap items-center gap-2.5">
            <Button variant="secondary" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" /></svg>
              Print
            </Button>
            <DownloadMenu onPick={handleDownload} />
          </div>
        ) : null}
      />

      {/* ---------- range ---------- */}
      <Card className="sfms-no-print">
        <CardBody>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-muted">Quick ranges</span>
            {PRESETS.map((p) => (
              <button key={p.key} type="button" onClick={() => applyPreset(p.key)} aria-pressed={preset === p.key} disabled={loading} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-60 ${preset === p.key ? "border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <form onSubmit={generate} className="flex flex-col items-end gap-4 sm:flex-row">
            <Input label="From" type="date" required value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPreset(""); }} className="max-w-xs" />
            <Input label="To" type="date" required value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPreset(""); }} className="max-w-xs" />
            <Button type="submit" variant="luxury" loading={loading}>Generate Report</Button>
          </form>
        </CardBody>
      </Card>

      {loading && !report && <Card><Spinner label="Generating your report…" /></Card>}

      {!loading && !report && <EmptyState title="No report generated yet" description="Pick a date range and generate one above." />}

      {report && (
        <div className={`space-y-5 transition-opacity duration-200 ${loading ? "pointer-events-none opacity-60" : ""}`} id="report-content" aria-busy={loading}>
          <div className="sfms-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cardBorder bg-card px-5 py-4 shadow-card">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#17c8f2] to-[#1565ff] text-white shadow-luxury"><Icon name="reports" size={20} /></span>
              <div>
                <h3 className="font-display text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink">{formatDate(reportMeta?.from)} — {formatDate(reportMeta?.to)}</h3>
                <p className="text-xs text-muted">Generated {reportMeta?.at.toLocaleString()}</p>
              </div>
            </div>
            <span className="sfms-no-print rounded-full bg-emerald-glow px-3 py-1 text-xs font-bold text-emerald">Report ready</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon="arrowDownLong" tone="bg-emerald-glow text-emerald" label="Income" amount={inflow} note="Money in" />
            <StatTile icon="arrowUp" tone="bg-danger-soft text-danger" label="Expenses" amount={Number(summary.total_outflow) || 0} note="Money out" />
            <StatTile icon="savings" tone="bg-primary-soft text-primary" label="Net savings" amount={net} signed note={inflow > 0 ? `${((net / inflow) * 100).toFixed(1)}% of income kept` : "No income in this range"} />
            <StatTile icon="goal" tone="bg-gold-light text-gold" label="Active goals" amount={Number(summary.active_goals) || 0} integer note="In progress" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader title="Category Breakdown" subtitle="Where your money went" />
              {categoryRows.length === 0 ? (
                <EmptyState title="No transactions in this range" />
              ) : (
                <ul className="m-0 list-none space-y-3.5 p-0">
                  {categoryRows.map((c) => {
                    const share = categoryTotal > 0 ? ((Number(c.total) || 0) / categoryTotal) * 100 : 0;
                    return (
                      <li key={c.category}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-semibold text-ink">{c.category}</span>
                          <span className="shrink-0 text-ink"><b>{formatCurrency(c.total)}</b> <span className="text-xs text-muted">· {share.toFixed(1)}%</span></span>
                        </div>
                        <ProgressBar percent={share} tone="primary" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Loans" subtitle="Pure cash lending only" />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald/20 bg-emerald-glow p-3.5"><p className="text-[11px] font-semibold text-muted">Owed to you</p><p className="mt-1 truncate font-display text-[1.15rem] font-extrabold text-emerald">{formatCurrency(owedToYou)}</p></div>
                <div className="rounded-2xl border border-danger/20 bg-danger-soft p-3.5"><p className="text-[11px] font-semibold text-muted">You owe</p><p className="mt-1 truncate font-display text-[1.15rem] font-extrabold text-danger">{formatCurrency(youOwe)}</p></div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary-soft/60 px-3.5 py-3 text-xs">
                <span className="font-semibold text-nav">Net loan position</span>
                <span className={`font-extrabold ${owedToYou - youOwe >= 0 ? "text-emerald" : "text-danger"}`}>{formatCurrency(owedToYou - youOwe)}</span>
              </div>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader title="Budgets" subtitle={budgets.length ? `${budgets.length} active` : "Spending limits"} />
              {budgets.length === 0 ? (
                <EmptyState title="No active budgets" />
              ) : (
                <ul className="m-0 list-none space-y-4 p-0">
                  {budgets.map((b) => {
                    const used = Number(b.percent_used) || 0;
                    return (
                      <li key={b.slug}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-semibold text-ink">{categoryName(b.category_slug)} <span className="text-xs font-medium capitalize text-muted">· {b.period}</span></span>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${used > 100 ? "bg-danger-soft text-danger" : used >= 80 ? "bg-gold-light text-gold" : "bg-emerald-glow text-emerald"}`}>{Math.round(used)}%</span>
                        </div>
                        <ProgressBar percent={used} tone={barTone(used)} />
                        <p className="mt-1.5 text-xs text-muted">{formatCurrency(b.spent_amount)} spent of {formatCurrency(b.amount)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Goals" subtitle={goals.length ? `${goals.length} total` : "Savings targets"} />
              {goals.length === 0 ? (
                <EmptyState title="No goals" />
              ) : (
                <ul className="m-0 list-none space-y-4 p-0">
                  {goals.map((g) => {
                    const progress = Number(g.progress_percent) || 0;
                    return (
                      <li key={g.slug}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate font-semibold text-ink">{g.name}</span>
                          <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-extrabold text-primary">{Math.round(progress)}%</span>
                        </div>
                        <ProgressBar percent={progress} tone="emerald" />
                        {g.target_amount != null && <p className="mt-1.5 text-xs text-muted">{formatCurrency(g.saved_amount)} saved of {formatCurrency(g.target_amount)}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <p className="sfms-no-print flex items-start gap-2 rounded-xl bg-primary-soft/60 px-4 py-3 text-xs leading-relaxed text-nav">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>Use <b>Download</b> to save this report as a PDF, an Excel workbook or a CSV file, or <b>Print</b> to print it. Excel and CSV keep amounts as real numbers so you can sort and total them.</span>
          </p>
        </div>
      )}
    </div>
  );
}
