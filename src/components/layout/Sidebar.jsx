import React from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { backendAssetUrl } from "../../api/client";
import Icon from "../ui/Icon";
import { isAdminRole, roleLabel } from "../../lib/roles";
import logo from "../../pages/assets/SFMS_logo_transparent.png";
import wordmark from "../../pages/assets/sfms-wordmark-light.png";
import "./AppShell.css";
import Avatar from "../ui/Avatar";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/transactions", label: "Transactions", icon: "transactions" },
  { to: "/accounts", label: "Accounts", icon: "wallet" },
  { to: "/loans", label: "Loans", icon: "loan" },
  { to: "/credit-purchases", label: "Credit Purchases", icon: "credit" },
  { to: "/budgets", label: "Budgets", icon: "budget" },
  { to: "/goals", label: "Goals", icon: "goal" },
  { to: "/analytics", label: "Analytics", icon: "analytics" },
  { to: "/reports", label: "Reports", icon: "reports" },
  { to: "/history", label: "History", icon: "history" },
  { to: "/ai-assistant", label: "AI Assistant", icon: "spark" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

const navItemClass = ({ isActive }) => "sfms-nav" + (isActive ? " is-active" : "");

function initials(value) {
  if (!value) return "U";
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function displayName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.username || "Profile";
}

function profileImage(user) {
  const value = user?.profile_image_url || user?.profile_image || user?.avatar_url || user?.avatar || user?.image_url || user?.image || null;
  return backendAssetUrl(value);
}

export default function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const avatar = profileImage(user);
  const name = displayName(user);

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5">
      <Link to="/dashboard" onClick={onNavigate} aria-label="SFMS dashboard" className="sfms-brand mb-6 flex shrink-0 items-center gap-3 px-2 no-underline">
        <img className="sfms-brand-logo h-11 w-11 object-contain" src={logo} alt="" style={{ filter: "drop-shadow(0 6px 14px rgba(23,200,242,.45))" }} />
        <img className="h-[22px] w-auto" src={wordmark} alt="SFMS" />
      </Link>

      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7e95c4]">Menu</p>
      <nav className="sfms-side-nav -mr-1 min-h-0 flex-1 overflow-y-auto pr-1" aria-label="App navigation">
        <ul className="sfms-nav-list m-0 flex list-none flex-col gap-[3px] p-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navItemClass} onClick={onNavigate}>
                <Icon name={item.icon} size={19} strokeWidth={1.8} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {isAdminRole(user?.role) && (
        <NavLink to="/admin/messages" onClick={onNavigate} className={navItemClass}>
          <Icon name="shield" size={19} strokeWidth={1.8} />
          <span className="truncate">Admin panel</span>
        </NavLink>
      )}

      <NavLink
        to="/profile"
        onClick={onNavigate}
        className={({ isActive }) => `sfms-profile mt-4 shrink-0 overflow-hidden rounded-2xl no-underline ${isActive ? "is-active" : ""}`}
      >
        <div className="flex items-center gap-3 px-3.5 py-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/10 text-sm font-bold text-white">
            <Avatar src={avatar} alt="Profile" fallback={initials(name)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{name}</p>
            <p className="truncate text-[11px] text-[#9fb6e3]">{roleLabel(user?.role)}</p>
          </div>
          <Icon name="chevronRight" size={15} className="shrink-0 text-[#9fb6e3]" />
        </div>
      </NavLink>
    </div>
  );
}
