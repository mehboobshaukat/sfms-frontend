import React from "react";

const TONES = {
  primary: "bg-primary-soft text-primary border border-primary-border",
  emerald: "bg-emerald-glow text-emerald border border-emerald/20",
  gold: "bg-gold-light text-gold border border-gold/20",
  danger: "bg-danger-soft text-danger border border-danger/20",
  neutral: "bg-hover text-muted border border-cardBorder",
};

export default function Badge({ children, tone = "neutral", className = "" }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${TONES[tone] || TONES.neutral} ${className}`}>{children}</span>;
}
