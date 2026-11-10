import React from "react";
import Spinner from "./Spinner";

const VARIANTS = {
  luxury: "bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white border border-transparent shadow-luxury hover:-translate-y-px hover:brightness-110",
  primary: "bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white border border-transparent shadow-luxury hover:-translate-y-px hover:brightness-110",
  secondary: "bg-btnSec text-ink border border-cardBorder hover:bg-hover hover:border-primary-border",
  danger: "bg-gradient-to-br from-[#f0476a] to-[#d12c4d] text-white border border-transparent hover:brightness-105",
  dangerGhost: "bg-transparent text-danger border border-danger/35 hover:bg-danger-soft",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-hover",
};

const SOFT_DANGER = "bg-danger-soft text-danger border border-danger/25 hover:bg-danger hover:text-white hover:border-transparent";

const SIZES = {
  sm: "px-3.5 py-2 text-xs",
  md: "px-[18px] py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  className = "",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold cursor-pointer transition-all duration-200 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${variant === "danger" && size === "sm" ? SOFT_DANGER : VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="xs" />}
      {children}
    </button>
  );
}
