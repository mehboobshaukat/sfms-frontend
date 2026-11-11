import React from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { backendAssetUrl } from "../../api/client";
import { roleLabel } from "../../lib/roles";
import Icon from "../ui/Icon";
import logo from "../../pages/assets/SFMS_logo_transparent.png";
import wordmark from "../../pages/assets/sfms-wordmark-light.png";
import "./AppShell.css";
import Avatar from "../ui/Avatar";

const navItemClass = ({ isActive }) => "sfms-nav" + (isActive ? " is-active" : "");

function initials(value) {
  if (!value) return "A";
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
}

export default function AdminSidebar({ me, unread = 0, onNavigate }) {
  const { user } = useAuth();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.username || "Admin";
  const avatar = backendAssetUrl(user?.profile_image_url);

  const items = [
    { to: "/admin/messages", label: "Messages", icon: "mail", badge: unread },
    { to: "/admin/users", label: "Users", icon: "users" },
    ...(me?.capabilities?.manage_admins ? [{ to: "/admin/admins", label: "Admins", icon: "shield" }] : []),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5">
      <Link to="/admin/messages" onClick={onNavigate} aria-label="SFMS admin" className="sfms-brand mb-6 flex shrink-0 items-center gap-3 px-2 no-underline">
        <img className="sfms-brand-logo h-11 w-11 object-contain" src={logo} alt="" style={{ filter: "drop-shadow(0 6px 14px rgba(23,200,242,.45))" }} />
        <div className="min-w-0">
          <img className="h-[22px] w-auto" src={wordmark} alt="SFMS" />
          <span className="mt-1 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#cfe0ff]">Admin</span>
        </div>
      </Link>

      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7e95c4]">Manage</p>
      <nav className="sfms-side-nav -mr-1 min-h-0 flex-1 overflow-y-auto pr-1" aria-label="Admin navigation">
        <ul className="sfms-nav-list m-0 flex list-none flex-col gap-[3px] p-0">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navItemClass} onClick={onNavigate}>
                <Icon name={item.icon} size={19} strokeWidth={1.8} />
                <span className="truncate">{item.label}</span>
                {item.badge > 0 && (
                  <span className="ml-auto rounded-full bg-[#17c8f2] px-2 py-0.5 text-[10px] font-extrabold text-[#061330]">{item.badge > 99 ? "99+" : item.badge}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Link to="/dashboard" onClick={onNavigate} className="sfms-nav mt-3 shrink-0 no-underline">
        <Icon name="arrowLeft" size={19} strokeWidth={1.8} />
        <span className="truncate">Back to my SFMS</span>
      </Link>

      <div className="sfms-profile mt-3 shrink-0 overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 px-3.5 py-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/10 text-sm font-bold text-white">
            <Avatar src={avatar} fallback={initials(name)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{name}</p>
            <p className="truncate text-[11px] text-[#9fb6e3]">{roleLabel(me?.role || user?.role)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
