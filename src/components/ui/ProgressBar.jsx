import React from "react";

export default function ProgressBar({ percent, tone = "emerald", className = "" }) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const barTone = tone === "danger" ? "bg-gradient-to-r from-[#e5304f] to-[#ff7a90]" : tone === "gold" ? "bg-gradient-to-r from-[#f5a524] to-[#fbc65c]" : tone === "primary" ? "bg-gradient-to-r from-[#17c8f2] to-[#1565ff]" : "bg-gradient-to-r from-[#0e9f6e] to-[#34d399]";
  return (
    <div className={`w-full h-2.5 rounded-full bg-primary-soft border border-itemBorder overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${barTone}`} style={{ width: `${clamped}%` }} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} />
    </div>
  );
}
