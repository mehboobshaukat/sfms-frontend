import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Icon from "../ui/Icon";

export function PrimaryMarketingLink({ className = "", children, inverted = false }) {
  const { isAuthenticated } = useAuth();
  return (
    <Link to={isAuthenticated ? "/dashboard" : "/register"}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold no-underline transition focus-visible:outline-offset-4 ${inverted ? "bg-white text-[#13223a] hover:bg-[#e5eeff]" : "bg-primary text-white shadow-luxury hover:bg-primary-hover"} ${className}`}>
      {children || (isAuthenticated ? "Open your dashboard" : "Get started with SFMS")}
      <Icon name="chevronRight" size={18} />
    </Link>
  );
}

export default function MarketingCTA({ heading = "Make money management feel manageable.", body = "Bring your day-to-day finances into one place, with clarity from the first entry to the big picture." }) {
  return (
    <section className="px-5 pb-20 sm:pb-24" aria-label="Get started with SFMS">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-[#101f36] px-7 py-12 text-center shadow-float sm:px-12 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-36 h-72 w-72 rounded-full bg-[#387bf7]/30 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-12 h-80 w-80 rounded-full bg-[#1bbb9b]/20 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-[#80d5c4]">Your money. One clear picture.</p>
          <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{heading}</h2>
          <p className="mx-auto mb-7 max-w-xl text-base leading-7 text-[#c5d2e6]">{body}</p>
          <PrimaryMarketingLink inverted />
        </div>
      </div>
    </section>
  );
}
