// The logged-in user's base currency comes from GET /users/me. Never infer
// currency from browser language/location: these can differ from the account.
let currentCurrency = { code: "PKR", symbol: "Rs" }; // Legacy backend default.

export function configureCurrency(user) {
  const code = user?.currency_code;
  const symbol = user?.currency_symbol;
  currentCurrency = {
    code: typeof code === "string" && /^[A-Z]{3}$/.test(code) ? code : "PKR",
    symbol: typeof symbol === "string" && symbol.trim() ? symbol.trim() : (code || "Rs"),
  };
}

export function getCurrency() {
  return { ...currentCurrency };
}

export function formatCurrency(value, currency = currentCurrency) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "—";
  const code = currency?.code || "PKR";
  const symbol = currency?.symbol || code;
  let decimals = 2;
  try {
    decimals = new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits;
  } catch { /* Unknown currencies default to two decimal places. */ }
  // Keep PKR balances consistent across Node/ICU/browser versions.
  // Some Intl datasets default PKR to 0 fractional digits.
  if (code === "PKR") decimals = 2;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "decimal", minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(Math.abs(number));
  const spacing = /^[A-Za-z]/.test(symbol) ? " " : "";
  return `${number < 0 ? "-" : ""}${symbol}${spacing}${formatted}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}


// Goal Saving / Release rows are virtual reservations (net_amount is 0 because the
// physical account balance does not move). Show the reserved amount instead:
// adding savings -> negative (usable balance goes down), release -> positive.
export function txnDisplayAmount(txn) {
  if (txn?.goal_slug) {
    const amount = Number(txn.amount) || 0;
    return txn.allocation_action === "release" ? amount : -amount;
  }
  return Number(txn?.net_amount) || 0;
}
