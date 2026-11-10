import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { transactionsApi } from "../../api/transactions";
import { transactionTypesApi } from "../../api/transactionTypes";
import { categoriesApi } from "../../api/categories";
import { accountsApi } from "../../api/accounts";
import { paymentMethodsApi } from "../../api/paymentMethods";
import { prioritiesApi } from "../../api/priorities";
import { contactsApi } from "../../api/contacts";
import { analyticsApi } from "../../api/analytics";
import { apiErrorMessage } from "../../api/client";

import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import Select from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { formatCurrency, formatDate, txnDisplayAmount } from "../../lib/formatters";
import useCountUp from "../../lib/useCountUp";

const emptyFilters = {
  date_from: "",
  date_to: "",
  transaction_type_slug: "",
  category_slug: "",
  account_slug: "",
  payment_method_slug: "",
  priority_slug: "",
  contact_slug: "",
};

const VIEW_KEY = "sfms-transactions-view";

function readView() {
  try { return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "list"; } catch { return "list"; }
}

const pad = (n) => String(n).padStart(2, "0");
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "Today", "Yesterday" or the formatted date, for the day headings in the list view. */
function dayLabel(iso) {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (iso === localISO(now)) return "Today";
  if (iso === localISO(yesterday)) return "Yesterday";
  return formatDate(iso);
}

function Funnel({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16l-6 8v6l-4-2v-4z" />
    </svg>
  );
}

function Stat({ icon, tone, label, amount, integer = false, note, signed = false, ready = true }) {
  const shown = useCountUp(amount);
  return (
    <Card className="group !p-4 flex items-center">
      <div className="flex w-full items-center gap-3.5">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${tone}`}>
          <Icon name={icon} size={22} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-nav">{label}</p>
          <p className="truncate font-display text-[1.45rem] font-extrabold leading-tight tracking-[-0.03em] text-ink">
            {!ready ? "—" : integer ? Math.round(shown).toLocaleString() : `${signed && shown > 0 ? "+" : ""}${formatCurrency(shown)}`}
          </p>
          {note && <p className="truncate text-[11px] text-muted">{note}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function TransactionsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [activeFilters, setActiveFilters] = useState(emptyFilters);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [view, setView] = useState(readView);
  const [overview, setOverview] = useState(null);

  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Rows carry labels for most fields; categories and contacts are fetched quietly in the background
  // as a fallback so those columns are never blank. Everything else loads when Filters is opened.
  useEffect(() => {
    let active = true;
    Promise.allSettled([categoriesApi.list(), contactsApi.list()]).then(([c, ct]) => {
      if (!active) return;
      if (c.status === "fulfilled" && Array.isArray(c.value)) setCategories((prev) => (prev.length ? prev : c.value));
      if (ct.status === "fulfilled" && Array.isArray(ct.value)) setContacts((prev) => (prev.length ? prev : ct.value));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!showFilters || filtersLoaded) return;
    let active = true;
    setFiltersLoading(true);
    Promise.all([
      transactionTypesApi.list(),
      categoriesApi.list(),
      accountsApi.list({ include_system: true }),
      paymentMethodsApi.list(),
      prioritiesApi.list(),
      contactsApi.list(),
    ]).then(([t, c, a, pm, p, ct]) => {
      if (!active) return;
      setTypes(t);
      setCategories(c);
      setAccounts(a);
      setPaymentMethods(pm);
      setPriorities(p);
      setContacts(ct);
      setFiltersLoaded(true);
    }).catch((err) => { if (active) toast.error(apiErrorMessage(err)); })
      .finally(() => { if (active) setFiltersLoading(false); });
    return () => { active = false; };
  }, [showFilters, filtersLoaded]);

  // The overview follows the date filter when both dates are set, otherwise it shows this month.
  const customPeriod = Boolean(activeFilters.date_from && activeFilters.date_to);
  useEffect(() => {
    let active = true;
    const params = customPeriod ? { date_from: activeFilters.date_from, date_to: activeFilters.date_to } : { range: "month" };
    analyticsApi.summary(params)
      .then((data) => { if (active) setOverview(data); })
      .catch(() => { if (active) setOverview(null); });
    return () => { active = false; };
  }, [customPeriod, activeFilters.date_from, activeFilters.date_to]);

  const typeName = (slug) => types.find((t) => t.slug === slug)?.name || "—";
  const categoryName = (slug) => categories.find((c) => c.slug === slug)?.name || "—";
  const accountName = (slug) => accounts.find((a) => a.slug === slug)?.name || "—";
  const paymentName = (slug) => paymentMethods.find((p) => p.slug === slug)?.name || "—";
  const priorityName = (slug) => priorities.find((p) => p.slug === slug)?.name || "—";
  const contactName = (slug) => contacts.find((c) => c.slug === slug)?.name || null;

  const typeOf = (r) => r.transaction_type_label || typeName(r.transaction_type_slug);
  const categoryOf = (r) => r.category_label || categoryName(r.category_slug);
  const contactOf = (r) => r.contact_label || contactName(r.contact_slug) || "—";
  const priorityOf = (r) => r.priority_label || priorityName(r.priority_slug);
  const routeOf = (r) => `${r.from_account_label || accountName(r.from_account_slug)} → ${r.to_account_label || accountName(r.to_account_slug)}`;

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);
  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  const load = async (targetPage = page, useFilters = activeFilters) => {
    setLoading(true);
    try {
      let data;
      const applied = Object.fromEntries(Object.entries(useFilters).filter(([, v]) => v));
      if (Object.keys(applied).length > 0) {
        data = await transactionsApi.filter({ ...applied, page: targetPage, page_size: pageSize });
      } else {
        data = await transactionsApi.list({ page: targetPage, page_size: pageSize });
      }
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, activeFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  const applyFilters = () => {
    setActiveFilters(filters);
    load(1, filters);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    load(1, emptyFilters);
  };

  const removeFilter = (key) => {
    const next = { ...activeFilters, [key]: "" };
    setFilters(next);
    setActiveFilters(next);
    load(1, next);
  };

  const changeView = (next) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage unavailable: the choice just won't persist */ }
  };

  const FILTER_CHIPS = {
    date_from: ["From", (v) => formatDate(v)],
    date_to: ["To", (v) => formatDate(v)],
    transaction_type_slug: ["Type", typeName],
    category_slug: ["Category", categoryName],
    account_slug: ["Account", accountName],
    payment_method_slug: ["Payment", paymentName],
    priority_slug: ["Priority", priorityName],
    contact_slug: ["Contact", (v) => contactName(v) || "—"],
  };

  // Search covers the rows already loaded on this page.
  const term = search.trim().toLowerCase();
  const visibleRows = useMemo(() => {
    if (!term) return rows;
    return rows.filter((r) => [r.description, r.transaction_code, r.transaction_type_label, r.category_label, r.contact_label, r.from_account_label, r.to_account_label, r.priority_label]
      .some((value) => String(value || "").toLowerCase().includes(term)));
  }, [rows, term]);

  const groups = useMemo(() => {
    const map = new Map();
    visibleRows.forEach((r) => {
      if (!map.has(r.txn_date)) map.set(r.txn_date, []);
      map.get(r.txn_date).push(r);
    });
    return [...map.entries()].map(([date, items]) => ({ date, items, net: items.reduce((sum, r) => sum + (Number(r.net_amount) || 0), 0) }));
  }, [visibleRows]);

  const inflow = Number(overview?.total_inflow) || 0;
  const outflow = Number(overview?.total_outflow) || 0;
  const periodLabel = customPeriod ? "Selected period" : "This month";

  const columns = [
    { key: "txn_date", header: "Date", render: (r) => formatDate(r.txn_date) },
    { key: "type", header: "Type", render: (r) => <Badge tone="neutral">{typeOf(r)}</Badge> },
    { key: "category", header: "Category", render: (r) => categoryOf(r) },
    { key: "description", header: "Description", render: (r) => <span className="truncate block max-w-[220px] font-medium text-ink">{r.description}</span> },
    { key: "account", header: "Account", render: (r) => <span className="text-xs text-muted">{routeOf(r)}</span> },
    { key: "contact", header: "Contact", render: (r) => contactOf(r) },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-bold",
      render: (r) => { const v = txnDisplayAmount(r); return <span className={v > 0 ? "text-emerald" : v < 0 ? "text-danger" : "text-ink"}>{formatCurrency(v)}</span>; },
    },
    { key: "priority", header: "Priority", render: (r) => <Badge tone="gold">{priorityOf(r)}</Badge> },
  ];

  const rowTone = (amount) => (amount > 0 ? "bg-emerald-glow text-emerald" : amount < 0 ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        subtitle="All recorded income, expenses, transfers, loan, and credit-purchase activity."
        actions={
          <>
            <Link to="/ai-assistant" className="no-underline">
              <Button variant="secondary"><Icon name="spark" size={16} /> Use AI Assistant</Button>
            </Link>
            <Link to="/transactions/new" className="no-underline">
              <Button variant="luxury">+ Add Transaction</Button>
            </Link>
          </>
        }
      />

      {/* ---------- overview ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="arrowDownLong" tone="bg-emerald-glow text-emerald" label="Money in" amount={inflow} note={periodLabel} ready={Boolean(overview)} />
        <Stat icon="arrowUp" tone="bg-danger-soft text-danger" label="Money out" amount={outflow} note={periodLabel} ready={Boolean(overview)} />
        <Stat icon="analytics" tone="bg-primary-soft text-primary" label="Net flow" amount={inflow - outflow} signed note={periodLabel} ready={Boolean(overview)} />
        <Stat icon="transactions" tone="bg-gold-light text-gold" label={hasActiveFilters ? "Matching transactions" : "All transactions"} amount={total} integer note={hasActiveFilters ? "With your filters" : "Recorded so far"} ready={!(loading && rows.length === 0)} />
      </div>

      {/* ---------- toolbar ---------- */}
      <Card className="!p-3.5 sm:!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1">
            <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this page by description, code, type, contact…"
              aria-label="Search transactions on this page"
              className="h-11 w-full rounded-xl border border-cardBorder bg-input pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-hover hover:text-ink">×</button>
            )}
          </label>

          <Button variant={showFilters ? "luxury" : "secondary"} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <Funnel /> Filters
            {activeCount > 0 && <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/90 px-1.5 text-[11px] font-extrabold text-primary ring-1 ring-primary/20">{activeCount}</span>}
          </Button>

          <div role="group" aria-label="View" className="inline-flex rounded-xl border border-cardBorder bg-input p-1">
            {[["list", "List"], ["table", "Table"]].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => changeView(key)}
                aria-pressed={view === key}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${view === key ? "bg-card text-primary shadow-card" : "text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-itemBorder pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Active filters</span>
            {Object.entries(activeFilters).filter(([, v]) => v).map(([key, value]) => {
              const [label, show] = FILTER_CHIPS[key];
              return (
                <span key={key} className="inline-flex items-center gap-1.5 rounded-full border border-primary-border bg-primary-soft py-1 pl-3 pr-1.5 text-xs font-semibold text-primary">
                  {label}: {show(value)}
                  <button type="button" onClick={() => removeFilter(key)} aria-label={`Remove ${label} filter`} className="flex h-5 w-5 items-center justify-center rounded-full text-base leading-none hover:bg-primary hover:text-white">×</button>
                </span>
              );
            })}
            <button type="button" onClick={clearFilters} className="text-xs font-bold text-danger hover:underline">Clear all</button>
          </div>
        )}
      </Card>

      {showFilters && filtersLoading && <div className="py-2"><Spinner size="sm" label="Loading filter options…" /></div>}
      {showFilters && !filtersLoading && filtersLoaded && (
        <Card>
          <CardBody className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="From" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
            <Input label="To" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
            <Select label="Type" value={filters.transaction_type_slug} onChange={(e) => setFilters({ ...filters, transaction_type_slug: e.target.value })}>
              <option value="">Any</option>
              {types.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </Select>
            <Select label="Category" value={filters.category_slug} onChange={(e) => setFilters({ ...filters, category_slug: e.target.value })}>
              <option value="">Any</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </Select>
            <Select label="Account" value={filters.account_slug} onChange={(e) => setFilters({ ...filters, account_slug: e.target.value })}>
              <option value="">Any</option>
              {accounts.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </Select>
            <Select label="Payment Method" value={filters.payment_method_slug} onChange={(e) => setFilters({ ...filters, payment_method_slug: e.target.value })}>
              <option value="">Any</option>
              {paymentMethods.map((pm) => (
                <option key={pm.slug} value={pm.slug}>{pm.name}</option>
              ))}
            </Select>
            <Select label="Priority" value={filters.priority_slug} onChange={(e) => setFilters({ ...filters, priority_slug: e.target.value })}>
              <option value="">Any</option>
              {priorities.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </Select>
            <Select label="Contact" value={filters.contact_slug} onChange={(e) => setFilters({ ...filters, contact_slug: e.target.value })}>
              <option value="">Any</option>
              {contacts.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </Select>
            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" onClick={clearFilters}>Reset</Button>
              <Button variant="luxury" onClick={applyFilters}>Apply Filters</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ---------- results ---------- */}
      <Card>
        {loading && rows.length === 0 ? (
          <Spinner label="Loading transactions…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description={hasActiveFilters ? "Try adjusting your filters." : "Record your first transaction to get started."}
            action={
              <Link to="/transactions/new">
                <Button variant="luxury">Add Transaction</Button>
              </Link>
            }
          />
        ) : (
          <CardBody className={`p-0 pt-2 transition-opacity duration-200 ${loading ? "pointer-events-none opacity-60" : ""}`}>
            {term && (
              <div className="mx-5 mb-3 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary-soft/60 px-3.5 py-2 text-xs text-nav">
                <span>Showing <b className="text-ink">{visibleRows.length}</b> of {rows.length} rows on this page for “{search.trim()}”.</span>
                <button type="button" onClick={() => setSearch("")} className="font-bold text-primary hover:underline">Clear search</button>
              </div>
            )}

            {visibleRows.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">No rows on this page match “{search.trim()}”. Try another page or clear the search.</div>
            ) : view === "table" ? (
              <Table columns={columns} rows={visibleRows} rowKey="transaction_code" onRowClick={(r) => navigate(`/transactions/${r.transaction_code}`)} />
            ) : (
              <div>
                {groups.map((group) => (
                  <section key={group.date} aria-label={dayLabel(group.date)}>
                    <div className="flex items-center justify-between gap-3 border-y border-itemBorder bg-primary-soft/50 px-5 py-2">
                      <h3 className="font-display text-[12px] font-extrabold uppercase tracking-[0.08em] text-nav">{dayLabel(group.date)}</h3>
                      <span className={`text-[12px] font-bold ${group.net > 0 ? "text-emerald" : group.net < 0 ? "text-danger" : "text-muted"}`}>{group.net > 0 ? "+" : ""}{formatCurrency(group.net)}</span>
                    </div>
                    <ul className="m-0 list-none divide-y divide-itemBorder p-0">
                      {group.items.map((r) => {
                        const amount = txnDisplayAmount(r);
                        const contact = contactOf(r);
                        return (
                          <li key={r.transaction_code}>
                            <Link to={`/transactions/${r.transaction_code}`} className="group flex items-center gap-3.5 px-5 py-3.5 no-underline transition hover:bg-primary-soft/40">
                              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${rowTone(amount)}`}>
                                <Icon name={amount > 0 ? "arrowDownLong" : amount < 0 ? "arrowUp" : "transactions"} size={19} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-bold text-ink transition group-hover:text-primary">{r.description}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                                  <Badge tone="neutral">{typeOf(r)}</Badge>
                                  {categoryOf(r) !== "—" && <span>{categoryOf(r)}</span>}
                                  <span className="text-subtle">•</span>
                                  <span>{routeOf(r)}</span>
                                  {contact !== "—" && <><span className="text-subtle">•</span><span>{contact}</span></>}
                                </div>
                              </div>
                              <span className="hidden shrink-0 md:inline-block"><Badge tone="gold">{priorityOf(r)}</Badge></span>
                              <span className={`shrink-0 text-right text-[14px] font-extrabold ${amount > 0 ? "text-emerald" : amount < 0 ? "text-danger" : "text-ink"}`}>
                                {amount > 0 ? "+" : ""}{formatCurrency(amount)}
                                <span className="block text-[10.5px] font-medium text-subtle">{r.transaction_code}</span>
                              </span>
                              <Icon name="chevronRight" size={16} className="hidden shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            <div className="px-5 pb-2 pt-3">
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={(p) => load(p)} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
