import React from "react";

export default function Select({ label, hint, error, children, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-sm font-semibold text-ink mb-1.5">
          {label} {props.required && <span className="text-danger">*</span>}
        </span>
      )}
      <select
        className={`w-full rounded-xl border bg-input px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15 ${
          error ? "border-danger" : "border-cardBorder"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <span className="block text-xs text-muted mt-1.5">{hint}</span>}
      {error && <span className="block text-xs text-danger mt-1.5">{error}</span>}
    </label>
  );
}
