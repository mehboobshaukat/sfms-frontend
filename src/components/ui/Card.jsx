import React from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";

export function Card({ children, className = "" }) {
  return <div className={`sfms-card bg-card border border-cardBorder rounded-2xl p-5 ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`flex justify-between items-start mb-4 gap-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="font-display text-[1.02rem] font-bold text-ink tracking-[-0.02em] truncate">{title}</h3>
        {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

export function ViewLink({ to, children }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-1 text-primary no-underline text-xs font-bold hover:underline whitespace-nowrap">
      {children}<Icon name="chevronRight" size={13} />
    </Link>
  );
}
