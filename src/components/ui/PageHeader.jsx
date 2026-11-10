import React from "react";

const EYEBROWS = {
  Transactions: "Money in and out", "Add Transaction": "New entry", Accounts: "Where your money is", Loans: "Lending and borrowing",
  "Credit Purchases": "Items on credit", Budgets: "Spending limits", Goals: "Savings targets", Analytics: "Insights",
  Reports: "Take it with you", History: "Audit trail and undo", Settings: "Building blocks", "Profile & Settings": "Your account",
};

/** Page title block used by every internal page. `eyebrow` is an optional small label above the title. */
export default function PageHeader({ title, subtitle, actions, eyebrow }) {
  const label = eyebrow ?? (typeof title === "string" ? EYEBROWS[title] : undefined);
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {label && <span className="mb-2 inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{label}</span>}
        <h2 className="font-display text-[1.65rem] sm:text-[2rem] font-extrabold leading-tight tracking-[-0.035em] text-ink">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{subtitle}</p>}
        <span aria-hidden="true" className="mt-3 block h-1 w-14 rounded-full bg-gradient-to-r from-[#1565ff] to-[#17c8f2]" />
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
