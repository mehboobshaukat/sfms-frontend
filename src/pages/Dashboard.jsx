import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import { analyticsApi } from "../api/analytics";
import { categoriesApi } from "../api/categories";
import { apiErrorMessage, backendAssetUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

import { Card, CardHeader, ViewLink } from "../components/ui/Card";
import LogoLoader from "../components/ui/LogoLoader";
import ProgressBar from "../components/ui/ProgressBar";
import GridBackdrop from "../components/ui/GridBackdrop";
import Icon from "../components/ui/Icon";
import { formatCurrency, formatDate, txnDisplayAmount } from "../lib/formatters";
import { DATE_RANGES } from "../lib/constants";
import useCountUp from "../lib/useCountUp";
import "./Dashboard.css";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, ArcElement, Tooltip, Legend, Filler);

const DOUGHNUT_COLORS = ["#1565FF", "#17C8F2", "#10B981", "#F5A524", "#9A74F5", "#EE79A8", "#C7D0DD"];
const ACCOUNT_ICON = { cash: "wallet", digital_wallet: "wallet", bank: "credit" };
const EMPTY_CATEGORIES = ["Food & Dining", "Shopping", "Transport", "Bills & Utilities", "Others"];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function initials(value) {
  if (!value) return "U";
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function displayName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.username || "there";
}

function profileImage(user) {
  const value = user?.profile_image_url || user?.profile_image || user?.avatar_url || user?.avatar || user?.image_url || user?.image || null;
  return backendAssetUrl(value);
}

function normalizePercent(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function Money({ value }) {
  return <>{formatCurrency(useCountUp(value))}</>;
}

const TONES = {
  primary: "bg-primary-soft text-primary",
  emerald: "bg-emerald-glow text-emerald",
  gold: "bg-gold-light text-gold",
  danger: "bg-danger-soft text-danger",
};
const barTone = (percent) => (percent >= 100 ? "danger" : percent >= 80 ? "gold" : "primary");

function MetricCard({ icon, iconClass, label, amount = 0, integer = false, valueClass = "text-ink", change = 0, changeClass = "text-primary bg-primary-soft" }) {
  const shown = useCountUp(amount);
  return (
    <Card className="group !p-4 xl:!p-[18px] min-h-[126px] flex items-center">
      <div className="flex w-full items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${iconClass}`}>
          <Icon name={icon} size={22} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-nav">{label}</p>
          <p className={`mt-1 font-display text-[1.7rem] leading-none font-extrabold tracking-[-0.04em] ${valueClass}`}>{integer ? Math.round(shown) : formatCurrency(shown)}</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            <span className={`rounded-md px-2 py-1 font-semibold ${changeClass}`}>{change > 0 ? "+" : ""}{Math.round(change)}%</span>
            <span>vs last month</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyBlock({ icon, text, to, cta }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary-border bg-primary-soft/40 px-4 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#17c8f2] to-[#1565ff] text-white shadow-luxury"><Icon name={icon} size={20} /></span>
      <p className="text-xs text-muted">{text}</p>
      <Link to={to} className="text-xs font-bold text-primary no-underline hover:underline">{cta} →</Link>
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: "/transactions/new", icon: "plus", title: "Add transaction", note: "Record income or spending" },
  { to: "/ai-assistant", icon: "spark", title: "AI Assistant", note: "Write it in plain words" },
  { to: "/budgets", icon: "budget", title: "Budgets", note: "Set spending limits" },
  { to: "/goals", icon: "goal", title: "Goals", note: "Track what you save" },
  { to: "/reports", icon: "reports", title: "Reports", note: "Export any date range" },
];

function DashboardHeader({ user }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const avatar = profileImage(user);
  const name = displayName(user);

  const doSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    navigate(`/transactions?search=${encodeURIComponent(value)}`);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
      toast.success("Signed out successfully.");
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <span className="mb-2 inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{greeting()}</span>
        <h1 className="font-display text-[1.9rem] sm:text-[2.3rem] font-extrabold leading-tight tracking-[-0.04em] text-ink">{name}</h1>
        <p className="mt-1 text-[13px] text-muted">Here&apos;s your financial overview for this month.</p>
        <span aria-hidden="true" className="mt-3 block h-1 w-14 rounded-full bg-gradient-to-r from-[#1565ff] to-[#17c8f2]" />
      </div>

      <div className="flex flex-wrap items-center justify-start gap-2.5 lg:justify-end">
        <form onSubmit={doSearch} className="relative w-full sm:w-[360px] xl:w-[440px]">
          <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-2xl border border-cardBorder bg-card pl-11 pr-4 text-sm text-ink shadow-card outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            placeholder="Search transactions, accounts, goals..."
            aria-label="Search"
          />
        </form>

        {/* <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-cardBorder bg-card text-nav shadow-card hover:bg-hover hover:text-ink" aria-label="Notifications" title="Notifications">
          <Icon name="bell" size={19} />
          <span className="absolute right-[7px] top-[6px] h-2.5 w-2.5 rounded-full border-2 border-card bg-danger" />
        </button> */}

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-full border border-transparent bg-transparent pl-1 pr-1.5 text-nav hover:bg-hover"
            aria-expanded={menuOpen}
          >
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-primary-border bg-primary-soft text-xs font-bold text-primary">
              {avatar ? <img src={avatar} alt="Profile" className="h-full w-full object-cover" /> : initials(name)}
            </span>
            <Icon name="arrowDown" size={14} />
          </button>

          {menuOpen && (
            <div className="sfms-float absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-cardBorder bg-card p-1.5">
              <div className="border-b border-itemBorder px-3 py-2.5">
                <p className="truncate text-xs font-semibold text-ink">{name}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted">{user?.email || "Account"}</p>
              </div>
              <Link to="/" title="Home" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-nav no-underline hover:bg-hover hover:text-ink">
                <Icon name="home" size={17} />
                <span className="hidden lg:inline">Home</span>
              </Link>
              <Link to="/profile" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-nav no-underline hover:bg-hover hover:text-ink" onClick={() => setMenuOpen(false)}>
                <Icon name="profile" size={16} /> Profile
              </Link>
              <button onClick={handleLogout} disabled={loggingOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50">
                <Icon name="logout" size={16} /> {loggingOut ? "Signing out…" : "Log out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState("month");
  // Snapshot is committed atomically: charts and totals always share the same range.
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");

    analyticsApi.dashboard({ range, recent_limit: 5 })
      .then((data) => {
        if (!active) return;
        // Fail visibly if a deployment still returns an incompatible payload.
        if (!data?.summary || !data?.trends || !Array.isArray(data.accounts)
          || !Array.isArray(data.budgets) || !Array.isArray(data.goals)
          || !Array.isArray(data.recent_transactions?.items)
          || !data.loans || !data.credit_totals || !data.savings_summary) {
          throw new Error("Dashboard response is incomplete. Check that the latest backend is running.");
        }
        setSnapshot({ range, data });
      })
      .catch((err) => {
        if (active) setLoadError(err?.response || err?.code === "ERR_NETWORK" ? apiErrorMessage(err) : (err?.message || "Unable to load dashboard."));
      })
      .finally(() => { if (active) setLoading(false); });

    // Ignore outdated responses if the user changes the date range quickly.
    return () => { active = false; };
  }, [range, retryKey]);

  // Budgets arrive with a category slug only; resolve readable names once, without blocking the dashboard.
  const [categoryNames, setCategoryNames] = useState({});
  useEffect(() => {
    let active = true;
    categoriesApi.list({ active_only: true })
      .then((list) => { if (active && Array.isArray(list)) setCategoryNames(Object.fromEntries(list.map((c) => [c.slug, c.name]))); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const current = snapshot?.range === range ? snapshot.data : null;
  const summary = current?.summary ?? null;
  const trends = current?.trends ?? null;
  const recent = current?.recent_transactions?.items ?? [];
  const accounts = current?.accounts ?? [];
  const loanStats = current?.loans ?? null;
  const creditTotals = current?.credit_totals ?? null;
  const budgets = current?.budgets ?? [];
  const goals = current?.goals ?? [];
  const savingsSummary = current?.savings_summary ?? null;

  const netWorth = useMemo(() => accounts.reduce((sum, a) => sum + Number(a.current_balance || 0), 0), [accounts]);
  const overBudgets = budgets.filter((b) => Number(b.percent_used) >= 100);
  const activeGoalsCount = goals.filter((g) => !g.is_completed).length;

  const textColor = "#5D6F90";
  const inkColor = "#0B1D45";
  const gridColor = "#E4EDFB";
  const cardColor = "#FFFFFF";
  const dailyTrend = trends?.daily_trend || [];
  const categoryBreakdown = trends?.category_breakdown || [];

  const fallbackLabels = ["1", "5", "10", "15", "20", "25", "30"];
  const chartLabels = dailyTrend.length ? dailyTrend.map((d) => formatDate(d.date)) : fallbackLabels;
  const inflowSeries = dailyTrend.length ? dailyTrend.map((d) => Number(d.inflow || 0)) : fallbackLabels.map(() => 0);
  const outflowSeries = dailyTrend.length ? dailyTrend.map((d) => Number(d.outflow || 0)) : fallbackLabels.map(() => 0);

  const lineData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Inflow",
        data: inflowSeries,
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.08)",
        pointBackgroundColor: "#10B981",
        pointBorderColor: cardColor,
        pointBorderWidth: 1.5,
        pointRadius: dailyTrend.length ? 2.8 : 2,
        borderWidth: 2,
        fill: true,
        tension: 0.36,
      },
      {
        label: "Outflow",
        data: outflowSeries,
        borderColor: "#E5304F",
        backgroundColor: "transparent",
        pointBackgroundColor: "#E5304F",
        pointBorderColor: cardColor,
        pointBorderWidth: 1.5,
        pointRadius: dailyTrend.length ? 2.8 : 2,
        borderWidth: 2,
        tension: 0.36,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: { color: textColor, usePointStyle: true, pointStyle: "circle", boxWidth: 7, boxHeight: 7, padding: 18, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: cardColor, titleColor: inkColor, bodyColor: textColor, borderColor: gridColor, borderWidth: 1,
        callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}` },
      },
    },
    scales: {
      x: { ticks: { color: textColor, maxTicksLimit: 7, font: { size: 10 } }, grid: { display: false }, border: { color: gridColor } },
      y: { beginAtZero: true, ticks: { color: textColor, maxTicksLimit: 5, font: { size: 10 }, callback: (value) => formatCurrency(value) }, grid: { color: gridColor }, border: { display: false } },
    },
  };

  const heroHasData = dailyTrend.length > 1;
  const heroLabels = heroHasData ? dailyTrend.map((d) => d.date) : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  const heroValues = heroHasData
    ? dailyTrend.reduce((acc, d, i) => {
        const previous = i ? acc[i - 1] : 0;
        acc.push(previous + Number(d.inflow || 0) - Number(d.outflow || 0));
        return acc;
      }, [])
    : [13, 20, 16, 34, 23, 41, 31, 48, 59];

  const heroLineData = {
    labels: heroLabels,
    datasets: [{
      data: heroValues,
      borderColor: "#6FE3FF",
      backgroundColor: "rgba(111,227,255,.16)",
      borderWidth: 2.2,
      pointRadius: 0,
      fill: true,
      tension: 0.42,
    }],
  };

  const heroLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: heroHasData, callbacks: { label: (context) => formatCurrency(context.parsed.y) } } },
    scales: {
      x: { display: true, grid: { display: false }, border: { display: false }, ticks: { color: "#9FB6E3", autoSkip: true, maxTicksLimit: 9, font: { size: 9 } } },
      y: { display: false },
    },
  };

  const categoryTotal = categoryBreakdown.reduce((sum, c) => sum + Number(c.total || 0), 0);
  const categoryRows = categoryBreakdown.length
    ? categoryBreakdown.slice(0, 5).map((c, i) => ({
        name: c.category || "Other",
        value: Number(c.total || 0),
        percent: categoryTotal > 0 ? (Number(c.total || 0) / categoryTotal) * 100 : 0,
        color: DOUGHNUT_COLORS[i % DOUGHNUT_COLORS.length],
      }))
    : EMPTY_CATEGORIES.map((name, i) => ({ name, value: 0, percent: 0, color: DOUGHNUT_COLORS[i] }));

  const categoryData = {
    labels: categoryRows.map((c) => c.name),
    datasets: [{ data: categoryRows.map((c) => c.value), backgroundColor: categoryRows.map((c) => c.color), borderColor: cardColor, borderWidth: 3 }],
  };
  const categoryOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: cardColor, titleColor: inkColor, bodyColor: textColor, borderColor: gridColor, borderWidth: 1, callbacks: { label: (context) => `${context.label}: ${formatCurrency(context.parsed)}` } } },
    cutout: "68%",
  };

  if (!current) {
    return (
      <div className="space-y-5">
        <DashboardHeader user={user} />
        {loading ? (
          <LogoLoader label="Loading your financial overview…" />
        ) : (
          <div className="rounded-2xl border border-cardBorder bg-card p-8 text-center shadow-card" role="alert">
            <p className="text-sm font-semibold text-ink">Dashboard could not load</p>
            <p className="mt-2 text-xs text-muted">{loadError || "Please try again."}</p>
            <button className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white" onClick={() => setRetryKey((n) => n + 1)}>Try again</button>
          </div>
        )}
      </div>
    );
  }

  const inflowChange = normalizePercent(summary?.inflow_change_percent ?? summary?.total_inflow_change_percent);
  const outflowChange = normalizePercent(summary?.outflow_change_percent ?? summary?.total_outflow_change_percent);
  const savingsChange = normalizePercent(summary?.savings_change_percent ?? summary?.net_savings_change_percent);
  const goalsChange = normalizePercent(summary?.goals_change_percent);
  const heroChange = normalizePercent(summary?.net_worth_change_percent ?? summary?.balance_change_percent);

  const inflowTotal = Number(summary?.total_inflow) || 0;
  const outflowTotal = Number(summary?.total_outflow) || 0;
  const netFlow = inflowTotal - outflowTotal;
  const savingsRate = inflowTotal > 0 ? Math.round((netFlow / inflowTotal) * 100) : null;
  const usableBalance = Number(savingsSummary?.usable_balance ?? netWorth) || 0;

  const sortedBudgets = [...budgets].sort((a, b) => Number(b.percent_used) - Number(a.percent_used));
  const budgetSpent = budgets.reduce((sum, b) => sum + (Number(b.spent_amount) || 0), 0);
  const budgetTotal = budgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const budgetPercent = budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0;
  const ringClass = budgetPercent >= 100 ? "bad" : budgetPercent >= 80 ? "warn" : "";
  const nameOf = (slug) => categoryNames[slug] || "Budget";

  const openGoals = goals.filter((g) => !g.is_completed).sort((a, b) => (Number(b.progress_percent) || 0) - (Number(a.progress_percent) || 0));
  const doneGoals = goals.length - openGoals.length;
  const daysLabel = (d) => (d == null ? "No deadline" : d < 0 ? "Past target date" : d === 0 ? "Due today" : `${d} day${d === 1 ? "" : "s"} left`);

  const accountsTotal = accounts.reduce((sum, a) => sum + Math.max(Number(a.current_balance) || 0, 0), 0);
  const topCategory = categoryBreakdown.length ? categoryRows[0] : null;

  const insights = [
    topCategory
      ? { icon: "analytics", tone: "primary", label: "Top spending", value: topCategory.name, note: `${Math.round(topCategory.percent)}% of your expenses` }
      : { icon: "analytics", tone: "primary", label: "Top spending", value: "Nothing yet", note: "Record expenses to see where money goes" },
    savingsRate === null
      ? { icon: "savings", tone: "gold", label: "Savings rate", value: "—", note: "Needs some inflow in this period" }
      : { icon: "savings", tone: savingsRate >= 0 ? "emerald" : "danger", label: "Savings rate", value: `${savingsRate}%`, note: savingsRate >= 0 ? "of your inflow was kept" : "Outflow is above inflow" },
    overBudgets.length
      ? { icon: "budget", tone: "danger", label: "Budget alert", value: `${overBudgets.length} over limit`, note: "Review your spending limits" }
      : openGoals.length
        ? { icon: "goal", tone: "emerald", label: "Closest goal", value: openGoals[0].name, note: `${Math.round(Number(openGoals[0].progress_percent) || 0)}% saved so far` }
        : { icon: "goal", tone: "emerald", label: "Budgets and goals", value: "On track", note: "Nothing needs your attention" },
  ];

  return (
    <div className="sfms-dash space-y-4 xl:space-y-[18px]">
      <DashboardHeader user={user} />
      {loading && <div className="text-xs text-muted" role="status">Refreshing dashboard…</div>}
      {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger"><span>{loadError}</span><button type="button" className="font-semibold underline" onClick={() => setRetryKey((n) => n + 1)}>Retry</button></div>}
      <p className="sr-only">Amounts displayed in {summary?.currency_code || user?.currency_code || "PKR"}.</p>

      {/* ---------- hero ---------- */}
      <section className="sfms-hero rounded-3xl">
        <GridBackdrop tone={0.8} />
        <div className="sfms-hero-in grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(300px,1fr)_minmax(320px,1.05fr)] lg:items-stretch">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9fb6e3]">
              Usable balance across accounts <Icon name="info" size={14} />
            </div>
            <p className="mt-2 break-words font-display text-[2rem] min-[400px]:text-[2.5rem] sm:text-[3rem] font-extrabold leading-none tracking-[-0.05em]"><Money value={usableBalance} /></p>
            <p className="mt-2.5 text-[12px] text-[#b9cbee]">Total financial funds {formatCurrency(savingsSummary?.total_financial_funds ?? netWorth)} · Goal savings {formatCurrency(savingsSummary?.goal_savings)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-[#b9cbee]">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-bold ${heroChange >= 0 ? "bg-emerald/20 text-[#7ff0c4]" : "bg-danger/25 text-[#ffb3c0]"}`}>{heroChange >= 0 ? "↑ +" : "↓ "}{Math.round(heroChange)}%</span>
              <span>from last month</span>
              <span className="text-[#6c85b8]">•</span>
              <span>{accounts.length} account{accounts.length === 1 ? "" : "s"}</span>
              <Link to="/accounts" className="font-semibold text-[#7ee3ff] no-underline hover:underline">Manage assets</Link>
            </div>
            <div className="mt-auto grid grid-cols-1 gap-3 pt-5 min-[440px]:grid-cols-3">
              <div className="sfms-hero-stat"><p className="text-[11px] text-[#9fb6e3]">Inflow</p><p className="mt-1 truncate text-[15px] font-extrabold text-[#7ff0c4]"><Money value={inflowTotal} /></p></div>
              <div className="sfms-hero-stat"><p className="text-[11px] text-[#9fb6e3]">Outflow</p><p className="mt-1 truncate text-[15px] font-extrabold text-[#ffb3c0]"><Money value={outflowTotal} /></p></div>
              <div className="sfms-hero-stat"><p className="text-[11px] text-[#9fb6e3]">Net flow</p><p className={`mt-1 truncate text-[15px] font-extrabold ${netFlow >= 0 ? "text-white" : "text-[#ffb3c0]"}`}>{netFlow > 0 ? "+" : ""}<Money value={netFlow} /></p></div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-start gap-2.5 lg:justify-end">
              <label className="relative w-full sm:w-[168px]">
                <Icon name="calendar" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b9cbee]" />
                <select value={range} onChange={(e) => setRange(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-white/20 bg-white/10 pl-9 pr-9 text-[13px] font-semibold text-white outline-none backdrop-blur transition focus:border-[#17c8f2] [&>option]:text-[#0b1d45]" aria-label="Date range">
                  {DATE_RANGES.filter((r) => r.value !== "custom").map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <Icon name="arrowDown" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#b9cbee]" />
              </label>
              <Link to="/transactions/new" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-[13px] font-extrabold text-[#0a47d6] no-underline shadow-[0_12px_28px_rgba(2,8,28,0.35)] transition hover:-translate-y-0.5 sm:w-auto">
                <Icon name="plus" size={17} /> Add Transaction
              </Link>
            </div>
            <div className="relative min-h-[150px] flex-1">
              <Line data={heroLineData} options={heroLineOptions} />
              {!heroHasData && <span className="absolute left-1/2 top-[42%] -translate-x-1/2 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium text-[#d6e4ff] backdrop-blur">No cash-flow data yet</span>}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- quick actions ---------- */}
      <nav aria-label="Quick actions" className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 min-[380px]:max-md:[&>*:last-child:nth-child(odd)]:col-span-2">
        {QUICK_ACTIONS.map((q) => (
          <Link key={q.to} to={q.to} className="group flex items-center gap-3 rounded-2xl border border-cardBorder bg-card p-3.5 no-underline shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-primary-border hover:shadow-float">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#17c8f2] to-[#1565ff] text-white shadow-luxury transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"><Icon name={q.icon} size={19} /></span>
            <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-ink">{q.title}</span><span className="block truncate text-[11px] text-muted">{q.note}</span></span>
          </Link>
        ))}
      </nav>

      {/* ---------- KPI cards ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon="arrowDownLong" iconClass="bg-emerald-glow text-emerald" label="Total Inflow" amount={inflowTotal} change={inflowChange} changeClass="text-emerald bg-emerald-glow" />
        <MetricCard icon="arrowUp" iconClass="bg-danger-soft text-danger" label="Total Outflow" amount={outflowTotal} change={outflowChange} changeClass="text-danger bg-danger-soft" />
        <Link to="/goals" className="block rounded-2xl no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><MetricCard icon="savings" iconClass="bg-gold-light text-gold" label="Goal Savings" amount={Number(savingsSummary?.goal_savings) || 0} change={savingsChange} changeClass="text-gold bg-gold-light" /></Link>
        <Link to="/goals" className="block rounded-2xl no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><MetricCard icon="goal" iconClass="bg-primary-soft text-primary" label="Active Goals" amount={activeGoalsCount} integer change={goalsChange} /></Link>
      </div>

      {/* ---------- insights ---------- */}
      <div className="grid gap-3 md:grid-cols-3">
        {insights.map((item) => (
          <div key={item.label} className="flex items-center gap-3.5 rounded-2xl border border-cardBorder bg-card p-4 shadow-card">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[item.tone]}`}><Icon name={item.icon} size={20} /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{item.label}</p>
              <p className="truncate font-display text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink">{item.value}</p>
              <p className="truncate text-[11px] text-muted">{item.note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- charts ---------- */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="min-h-[300px]">
          <CardHeader title="Cash Flow" subtitle="Inflow and outflow across the selected period" action={<span className="rounded-lg border border-cardBorder bg-card px-3 py-1.5 text-[11px] font-medium text-nav">Daily</span>} />
          <div className="relative h-[230px]">
            <Line data={lineData} options={lineOptions} />
            {!dailyTrend.length && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-card/90 px-3 py-1.5 text-[10px] font-medium text-muted shadow-card">No transaction data yet</span></div>}
          </div>
        </Card>

        <Card className="min-h-[300px]">
          <CardHeader title="Spending by Category" subtitle="Expense distribution" action={<span className="rounded-lg border border-cardBorder bg-card px-3 py-1.5 text-[11px] font-medium text-nav">{(DATE_RANGES.find((r) => r.value === range) || {}).label || "This period"}</span>} />
          <div className="grid h-[230px] grid-cols-[140px_1fr] items-center gap-3">
            <div className="relative mx-auto h-[130px] w-[130px]">
              {categoryBreakdown.length ? <Doughnut data={categoryData} options={categoryOptions} /> : <div className="sfms-category-ring relative h-full w-full rounded-full opacity-80" />}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium text-nav">{categoryBreakdown.length ? "" : "No data"}</div>
            </div>
            <div className="space-y-3">
              {categoryRows.map((row) => (
                <div key={row.name} className="flex items-center gap-2 text-[11px]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                  <span className="min-w-0 flex-1 truncate text-nav">{row.name}</span>
                  <span className="shrink-0 font-bold text-ink">{Math.round(row.percent)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ---------- budgets / goals / loans ---------- */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="min-h-[320px]">
          <CardHeader title="Budget Health" subtitle={budgets.length ? `${budgets.length} active budget${budgets.length === 1 ? "" : "s"}` : "Spending limits"} action={<ViewLink to="/budgets">View budgets</ViewLink>} />
          {budgets.length === 0 ? (
            <EmptyBlock icon="budget" text="No active budgets yet. Set a limit to keep spending in check." to="/budgets" cta="Create a budget" />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className={`sfms-ring ${ringClass}`} style={{ "--p": Math.min(budgetPercent, 100) }}><b>{budgetPercent}%</b></div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted">Spent of total budgeted</p>
                  <p className="truncate font-display text-[1.05rem] font-extrabold tracking-[-0.02em] text-ink">{formatCurrency(budgetSpent)} <span className="text-[12px] font-semibold text-muted">of {formatCurrency(budgetTotal)}</span></p>
                  <p className={`mt-1 text-[11px] font-bold ${overBudgets.length ? "text-danger" : "text-emerald"}`}>{overBudgets.length ? `${overBudgets.length} over limit` : "All on track"}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-3.5">
                {sortedBudgets.slice(0, 4).map((b) => {
                  const pct = Math.round(Number(b.percent_used) || 0);
                  return (
                    <li key={b.slug}>
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px]">
                        <span className="min-w-0 truncate font-semibold text-ink">{nameOf(b.category_slug)} <span className="font-medium capitalize text-muted">· {b.period}</span></span>
                        <span className={`shrink-0 font-bold ${pct >= 100 ? "text-danger" : pct >= 80 ? "text-gold" : "text-nav"}`}>{pct}%</span>
                      </div>
                      <ProgressBar percent={pct} tone={barTone(pct)} />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader title="Savings Goals" subtitle={openGoals.length ? `${openGoals.length} in progress${doneGoals ? ` · ${doneGoals} completed` : ""}` : "Targets"} action={<ViewLink to="/goals">View goals</ViewLink>} />
          {openGoals.length === 0 ? (
            <EmptyBlock icon="goal" text={doneGoals ? "All your goals are completed. Time for a new one?" : "No goals yet. Give your savings a destination."} to="/goals" cta={doneGoals ? "Set a new goal" : "Create a goal"} />
          ) : (
            <ul className="space-y-4">
              {openGoals.slice(0, 3).map((g) => {
                const pct = Math.round(Number(g.progress_percent) || 0);
                return (
                  <li key={g.slug} className="rounded-xl border border-itemBorder p-3.5 transition hover:border-primary-border hover:bg-hover/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[13px] font-bold text-ink">{g.name}</p>
                      <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-extrabold text-primary">{pct}%</span>
                    </div>
                    <div className="mt-2.5"><ProgressBar percent={pct} tone="emerald" /></div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
                      <span className="truncate">{formatCurrency(g.saved_amount)} of {formatCurrency(g.target_amount)}</span>
                      <span className="shrink-0 font-semibold">{daysLabel(g.days_remaining)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="min-h-[320px] lg:col-span-2 xl:col-span-1">
          <CardHeader title="Loans & Credit" subtitle="Who owes whom" action={<ViewLink to="/loans">View loans</ViewLink>} />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald/20 bg-emerald-glow p-3.5"><p className="text-[11px] font-semibold text-muted">Owed to you</p><p className="mt-1 truncate font-display text-[1.1rem] font-extrabold text-emerald">{formatCurrency(loanStats?.pending_given_total)}</p></div>
            <div className="rounded-2xl border border-danger/20 bg-danger-soft p-3.5"><p className="text-[11px] font-semibold text-muted">You owe</p><p className="mt-1 truncate font-display text-[1.1rem] font-extrabold text-danger">{formatCurrency(loanStats?.pending_received_total)}</p></div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary-soft/60 px-3.5 py-3 text-xs">
            <span className="font-semibold text-nav">Net loan position</span>
            <span className={`font-extrabold ${(Number(loanStats?.pending_given_total) || 0) - (Number(loanStats?.pending_received_total) || 0) >= 0 ? "text-emerald" : "text-danger"}`}>{formatCurrency((Number(loanStats?.pending_given_total) || 0) - (Number(loanStats?.pending_received_total) || 0))}</span>
          </div>
          <Link to="/credit-purchases" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-itemBorder px-3.5 py-3 text-xs no-underline transition hover:border-primary-border hover:bg-hover/60">
            <span className="flex items-center gap-2 font-semibold text-nav"><Icon name="credit" size={16} /> Credit purchases pending</span>
            <span className="font-extrabold text-gold">{formatCurrency((Number(creditTotals?.pending_owed_total) || 0) + (Number(creditTotals?.pending_receivable_total) || 0))}</span>
          </Link>
        </Card>
      </div>

      {/* ---------- accounts / recent ---------- */}
      <div className="grid gap-4 xl:grid-cols-[1fr_1.7fr]">
        <Card className="min-h-[300px]">
          <CardHeader title="Accounts" subtitle={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`} action={<ViewLink to="/accounts">View all</ViewLink>} />
          {accounts.length === 0 ? (
            <EmptyBlock icon="wallet" text="No accounts yet." to="/accounts" cta="Add an account" />
          ) : (
            <div className="space-y-4">
              {accounts.slice(0, 4).map((a, index) => {
                const balance = Number(a.current_balance) || 0;
                const share = accountsTotal > 0 ? (Math.max(balance, 0) / accountsTotal) * 100 : 0;
                return (
                  <div key={a.slug || a.id || index}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${index % 2 === 0 ? "bg-primary-soft text-primary" : "bg-emerald-glow text-emerald"}`}><Icon name={ACCOUNT_ICON[a.account_type] || "wallet"} size={18} /></div>
                        <div className="min-w-0"><h4 className="truncate text-[13px] font-bold text-ink">{a.name}</h4><p className="mt-0.5 text-[11px] capitalize text-muted">{String(a.account_type || "account").replace("_", " ")}</p></div>
                      </div>
                      <span className="shrink-0 text-[13px] font-extrabold text-ink">{formatCurrency(a.current_balance)}</span>
                    </div>
                    <div className="mt-2"><ProgressBar percent={share} tone="primary" className="!h-1.5" /></div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="min-h-[300px] !p-0 overflow-hidden">
          <div className="p-5 pb-3"><CardHeader title="Recent Transactions" subtitle="Your latest activity" action={<ViewLink to="/transactions">View all</ViewLink>} className="!mb-0" /></div>
          {recent.length === 0 ? (
            <div className="px-5 pb-6"><EmptyBlock icon="transactions" text="No transactions yet." to="/transactions/new" cta="Add your first transaction" /></div>
          ) : (
            <div className="divide-y divide-itemBorder border-t border-itemBorder">
              {recent.slice(0, 5).map((t) => {
                const amount = txnDisplayAmount(t);
                const raw = t.category_name || t.category?.name || t.category || t.transaction_type_name || "Others";
                const category = typeof raw === "string" ? raw : "Others";
                return (
                  <Link key={t.transaction_code} to={`/transactions/${t.transaction_code}`} className="group flex items-center gap-3 px-5 py-3 no-underline transition hover:bg-primary-soft/40">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${amount > 0 ? "bg-emerald-glow text-emerald" : amount < 0 ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"}`}><Icon name={amount > 0 ? "arrowDownLong" : amount < 0 ? "arrowUp" : "transactions"} size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink transition group-hover:text-primary">{t.description}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">{formatDate(t.txn_date)} · {t.transaction_code}</p>
                    </div>
                    <span className="hidden shrink-0 rounded-full bg-hover px-2.5 py-1 text-[10px] font-semibold text-nav sm:inline-block">{category}</span>
                    <span className={`shrink-0 text-[13px] font-extrabold ${amount > 0 ? "text-emerald" : amount < 0 ? "text-danger" : "text-ink"}`}>{amount > 0 ? "+" : ""}{formatCurrency(amount)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
