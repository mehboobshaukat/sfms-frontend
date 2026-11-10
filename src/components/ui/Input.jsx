import React from "react";

const base = "w-full rounded-xl border bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-subtle outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15";

export function Input({ label, hint, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-sm font-semibold text-ink mb-1.5">
          {label} {props.required && <span className="text-danger">*</span>}
        </span>
      )}
      <input className={`${base} ${error ? "border-danger" : "border-cardBorder"} ${className}`} {...props} />
      {hint && !error && <span className="block text-xs text-muted mt-1.5">{hint}</span>}
      {error && <span className="block text-xs text-danger mt-1.5">{error}</span>}
    </label>
  );
}

export function TextArea({ label, hint, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-sm font-semibold text-ink mb-1.5">
          {label} {props.required && <span className="text-danger">*</span>}
        </span>
      )}
      <textarea className={`${base} min-h-[110px] resize-y ${error ? "border-danger" : "border-cardBorder"} ${className}`} {...props} />
      {hint && !error && <span className="block text-xs text-muted mt-1.5">{hint}</span>}
      {error && <span className="block text-xs text-danger mt-1.5">{error}</span>}
    </label>
  );
}
