import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { backendAssetUrl } from "../../api/client";
import Icon from "../ui/Icon";

function initials(value) {
  if (!value) return "U";
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function displayName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.username || "Profile";
}

export default function Topbar({ title, onMenuClick, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const name = displayName(user);
  const avatar = backendAssetUrl(user?.profile_image_url);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
      toast.success("Signed out successfully.");
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sfms-topbar sticky top-0 z-20 border-b border-cardBorder">
      <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden shrink-0 h-10 w-10 rounded-xl border border-cardBorder bg-btnSec flex items-center justify-center text-ink hover:bg-hover" aria-label="Open menu">
            <Icon name="menu" size={19} />
          </button>
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="m-0 flex list-none items-center gap-2 p-0 text-sm">
              <li className="hidden sm:block font-semibold text-muted">SFMS</li>
              <li aria-hidden="true" className="hidden sm:block text-subtle">/</li>
              <li className="min-w-0"><h1 className="truncate font-display text-[1.08rem] sm:text-[1.15rem] font-extrabold tracking-[-0.025em] text-ink">{title}</h1></li>
            </ol>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          {actions}
          <span className="hidden md:inline-flex h-9 items-center gap-2 rounded-xl border border-cardBorder bg-card/70 px-3 text-xs font-semibold text-nav">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-[#17c8f2] to-[#1565ff]" />
            {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </span>
          <Link to="/" title="Home" className="inline-flex h-9 items-center gap-2 rounded-xl border border-cardBorder bg-btnSec px-3 text-sm font-semibold text-muted no-underline transition hover:border-primary-border hover:bg-hover hover:text-primary">
            <Icon name="home" size={17} />
            <span className="hidden lg:inline">Home</span>
          </Link>
          <Link to="/profile" className="hidden sm:flex h-9 items-center gap-2 rounded-xl border border-cardBorder bg-card px-2.5 no-underline transition hover:border-primary-border hover:bg-hover" title="Profile">
            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[10px] font-bold text-primary border border-primary-border">{avatar ? <img src={avatar} alt="Profile" className="h-full w-full object-cover" /> : initials(name)}</span>
            <span className="max-w-[110px] truncate text-xs font-medium text-ink">{name}</span>
          </Link>
          <button onClick={handleLogout} disabled={loggingOut} className="inline-flex h-9 items-center gap-2 rounded-xl border border-cardBorder bg-btnSec px-3 text-sm font-semibold text-muted transition hover:border-danger/35 hover:bg-danger-soft hover:text-danger disabled:opacity-50" title="Log out">
            <Icon name="logout" size={17} />
            <span className="hidden md:inline">{loggingOut ? "Signing out…" : "Log out"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
