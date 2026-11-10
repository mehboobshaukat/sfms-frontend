import React, { useEffect, useState } from "react";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";

export const MESSAGE_STATUS = {
  new: { label: "New", tone: "primary" },
  in_progress: { label: "In progress", tone: "gold" },
  resolved: { label: "Resolved", tone: "emerald" },
};

export const USER_STATUS = {
  active: { label: "Active", tone: "emerald" },
  unverified: { label: "Unverified", tone: "gold" },
  blocked: { label: "Blocked", tone: "danger" },
  locked: { label: "Locked", tone: "gold" },
  pending_deletion: { label: "Pending deletion", tone: "neutral" },
};

export function StatusBadge({ map, value }) {
  const entry = map[value] || { label: value, tone: "neutral" };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function useDebounced(value, ms = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Search box with a magnifier icon, used by the admin list filters. */
export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={100}
        className="w-full rounded-xl border border-cardBorder bg-input py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-subtle outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15"
      />
    </label>
  );
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-xl border border-cardBorder bg-input px-3 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
      >
        {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
      </select>
    </label>
  );
}

/** Today -> "14:05", this year -> "5 Nov", older -> "5 Nov 2025". Used in compact lists. */
export function shortDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const opts = d.getFullYear() === now.getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" };
  return d.toLocaleDateString("en-GB", opts);
}

export function fullName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.username || "";
}
