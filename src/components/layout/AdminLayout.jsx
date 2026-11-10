import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "./AdminSidebar";
import Topbar from "./Topbar";
import Seo from "../Seo";
import LogoLoader from "../ui/LogoLoader";
import "./AppShell.css";

const AdminContext = createContext(null);

/** `me` = GET /admin/me (role + capabilities), `stats` = inbox counters, `refreshStats()` after any message change. */
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminLayout");
  return ctx;
}

function titleFor(pathname) {
  if (pathname.startsWith("/admin/users")) return "Admin · Users";
  if (pathname.startsWith("/admin/admins")) return "Admin · Admins";
  return "Admin · Messages";
}

export default function AdminLayout() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await adminApi.messageStats());
    } catch {
      /* the badge is non-essential */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await adminApi.me();
        if (!alive) return;
        setMe(data);
        refreshStats();
      } catch (err) {
        if (!alive) return;
        if ([401, 403].includes(err?.response?.status)) {
          toast.error("You don't have admin access.");
          await refreshProfile().catch(() => {});
          navigate("/dashboard", { replace: true });
        } else {
          toast.error(apiErrorMessage(err));
        }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ me, stats, refreshStats }), [me, stats, refreshStats]);
  const pageTitle = titleFor(location.pathname);

  if (!me) return <LogoLoader fullscreen label="Opening admin panel…" />;

  return (
    <AdminContext.Provider value={value}>
      <div className="min-h-screen bg-bg lg:flex">
        <Seo title={pageTitle} noindex />

        <aside className="sfms-side hidden lg:block sticky top-0 h-screen w-[248px] shrink-0 z-30">
          <AdminSidebar me={me} unread={stats?.unread || 0} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-[#061330]/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="sfms-side absolute left-0 top-0 h-full w-[280px] shadow-float">
              <AdminSidebar me={me} unread={stats?.unread || 0} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <Topbar title={pageTitle} onMenuClick={() => setMobileOpen(true)} />
          <main className="sfms-main relative mx-auto w-full max-w-[1580px] px-4 py-6 sm:px-6 sm:py-7 xl:px-7">
            <div key={location.pathname.split("/").slice(0, 3).join("/")} className="sfms-page"><Outlet /></div>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
