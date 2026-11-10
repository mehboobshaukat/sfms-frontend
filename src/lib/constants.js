// Backend redesign: account requirement is now NATURE-based (inflow ->
// to_account only, outflow -> from_account only, transfer -> both) —
// read straight off the selected TransactionType's `nature` field
// returned by the API. No more hardcoded name lists on the frontend.

// These stay name-based because loan/credit-purchase SETTLEMENT is about
// which specific system default type was picked, not its nature (both
// "Loan Repaid" and "Expense" are nature=outflow, but only one settles a loan).
export const LOAN_TYPES = ["loan received", "loan given", "loan repaid", "loan collected"];
export const NEW_LOAN_TYPES = ["loan received", "loan given"];
export const SETTLEMENT_LOAN_TYPES = ["loan repaid", "loan collected"];
export const CREDIT_PURCHASE_SETTLEMENT_TYPES = ["item payment made", "item payment received"];

export const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "digital_wallet", label: "Digital Wallet" },
  { value: "bank", label: "Bank" },
];

export const BUDGET_PERIODS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "lifetime", label: "Lifetime" },
  { value: "custom", label: "Custom" },
];

export const CHARGES_BORNE_BY_OPTIONS = [
  { value: "from_account", label: "From account (sender pays extra on top)" },
  { value: "to_account", label: "To account (fee deducted from what arrives)" },
];

export const CREDIT_TYPES = [
  { value: "received", label: "Received — I got the item, I owe money" },
  { value: "given", label: "Given — I handed it over, I'm owed money" },
];
