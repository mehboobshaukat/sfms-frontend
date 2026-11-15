import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

/** `me` = GET /admin/me (role + capabilities), `stats` = inbox counters, `refreshStats()` after any message change.
 *  `notifUnread` / `refreshNotifications()` = unread admin notifications (email failover alerts, ...).
 *  `activityTick` increases whenever the inbox changed on the server (new message, Gmail / customer reply,
 *  changes by another admin): pages listen to it and reload quietly - this is the "live" part. */
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminLayout");
  return ctx;
}

function titleFor(pathname) {
  if (pathname.startsWith("/admin/users")) return "Admin · Users";
  if (pathname.startsWith("/admin/admins")) return "Admin · Admins";
  if (pathname.startsWith("/admin/notifications")) return "Admin · Notifications";
  return "Admin · Messages";
}

export default function AdminLayout() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [notifUnread, setNotifUnread] = useState(0);
  const [activityTick, setActivityTick] = useState(0);
  const liveRef = useRef({ token: null, unread: null, latestSlug: null, syncEnabled: true, nextSyncAt: 0 });

  const refreshStats = useCallback(async () => {
    try {
      setStats(await adminApi.messageStats());
    } catch {
      /* the badge is non-essential */
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const { unread } = await adminApi.notificationUnreadCount();
      setNotifUnread(unread);
    } catch {
      /* the badge is non-essential */
    }
  }, []);

  // ---- Live updates (AJAX polling; works on serverless hosting where websockets do not) ----
  //  * every 5 s : GET /admin/messages/activity (tiny). If its token changed, refresh the badges, tell the
  //                open page to reload (activityTick) and toast new messages / replies.
  //  * every 30 s: POST /admin/messages/sync pulls replies written in Gmail (or by customers) into the panel.
  // Paused while the tab is hidden; resumes immediately when the admin comes back.
  useEffect(() => {
    if (!me) return undefined;
    const POLL_MS = 5000;
    const SYNC_MS = 30000;
    let stopped = false;
    let timer = null;

    const checkActivity = async () => {
      const live = liveRef.current;
      const a = await adminApi.messagesActivity();
      setNotifUnread(a.notifications_unread);
      if (live.token !== null && a.token !== live.token) {
        if (live.unread !== null && a.unread > live.unread) {
          if (a.latest && a.latest.slug !== live.latestSlug) toast(`New message from ${a.latest.name}`, { icon: "✉️" });
          else toast("New reply received", { icon: "💬" });
        }
        refreshStats();
        setActivityTick((t) => t + 1);
      }
      live.token = a.token;
      live.unread = a.unread;
      live.latestSlug = a.latest?.slug ?? null;
    };

    const runSync = async () => {
      const live = liveRef.current;
      if (!live.syncEnabled || Date.now() < live.nextSyncAt) return;
      live.nextSyncAt = Date.now() + SYNC_MS;
      try {
        const result = await adminApi.syncMessages();
        if (!result.enabled) live.syncEnabled = false;                       // MAIL_SYNC_ENABLED is off: stop asking
        else if (result.errors?.length) live.nextSyncAt = Date.now() + 5 * 60 * 1000; // mailbox problem: back off
      } catch {
        /* offline or temporary error: the next round tries again */
      }
    };

    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        await runSync();
        try {
          await checkActivity();
        } catch {
          /* ignore: next round tries again */
        }
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") { clearTimeout(timer); tick(); }
    };
    document.addEventListener("visibilitychange", onVisible);
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [me, refreshStats]);

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

  const value = useMemo(
    () => ({ me, stats, refreshStats, notifUnread, refreshNotifications, activityTick }),
    [me, stats, refreshStats, notifUnread, refreshNotifications, activityTick],
  );
  const pageTitle = titleFor(location.pathname);

  if (!me) return <LogoLoader fullscreen label="Opening admin panel…" />;

  return (
    <AdminContext.Provider value={value}>
      <div className="min-h-screen bg-bg lg:flex">
        <Seo title={pageTitle} noindex />

        <aside className="sfms-side hidden lg:block sticky top-0 h-screen w-[248px] shrink-0 z-30">
          <AdminSidebar me={me} unread={stats?.unread || 0} notifUnread={notifUnread} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-[#061330]/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="sfms-side absolute left-0 top-0 h-full w-[280px] shadow-float">
              <AdminSidebar me={me} unread={stats?.unread || 0} notifUnread={notifUnread} onNavigate={() => setMobileOpen(false)} />
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
