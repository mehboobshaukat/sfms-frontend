import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import PageHeader from "../ui/PageHeader";
import Icon from "../ui/Icon";

const TABS = [
  { to: "/settings/transaction-types", label: "Transaction Types", note: "Income, expense, transfers…", icon: "transactions" },
  { to: "/settings/categories", label: "Categories", note: "What the money is for", icon: "dashboard" },
  { to: "/settings/groups", label: "Groups", note: "Bundle related categories", icon: "reports" },
  { to: "/settings/contacts", label: "Contacts", note: "People you deal with", icon: "profile" },
  { to: "/settings/payment-methods", label: "Payment Methods", note: "Cards, wallets, channels", icon: "credit" },
  { to: "/settings/priorities", label: "Priorities", note: "How essential a spend is", icon: "goal" },
];

export default function SettingsLayout() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage the reusable building blocks used across every transaction: types, categories, groups, contacts, payment methods, and priorities."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        {/* small screens: scrolling pills */}
        <nav aria-label="Settings sections" className="sfms-noscroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold no-underline transition-all ${
                  isActive ? "border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        {/* large screens: side navigation */}
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <nav aria-label="Settings sections" className="sfms-card rounded-2xl border border-cardBorder bg-card p-3 shadow-card">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Building blocks</p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {TABS.map((t) => (
                <li key={t.to}>
                  <NavLink
                    to={t.to}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-all ${
                        isActive ? "bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury" : "text-nav hover:bg-primary-soft/60 hover:text-ink"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${isActive ? "bg-white/20 text-white" : "bg-primary-soft text-primary"}`}>
                          <Icon name={t.icon} size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-bold">{t.label}</span>
                          <span className={`block truncate text-[11px] ${isActive ? "text-white/75" : "text-muted"}`}>{t.note}</span>
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-xl bg-primary-soft/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-nav">System defaults are shared by every user and can't be edited. Add your own custom entries alongside them.</p>
          </nav>
        </aside>

        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
