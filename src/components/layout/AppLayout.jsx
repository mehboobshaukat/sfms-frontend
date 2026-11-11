import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Seo from "../Seo";

const TITLES = {
  "/dashboard": "Dashboard",
  "/transactions": "Transactions",
  "/accounts": "Accounts",
  "/loans": "Loans",
  "/credit-purchases": "Credit Purchases",
  "/budgets": "Budgets",
  "/goals": "Goals",
  "/analytics": "Analytics",
  "/reports": "Reports",
  "/history": "History",
  "/ai-assistant": "AI Assistant",
  "/settings": "Settings",
  "/profile": "Profile & Settings",
};

function titleFor(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/transactions")) return "Transactions";
  return "SFMS";
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const pageTitle = titleFor(location.pathname);
  const isDashboard = location.pathname === "/dashboard";

  // Drawer: Esc closes it, the page behind doesn't scroll, and it closes itself if the screen grows past the desktop layout.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    const mql = window.matchMedia ? window.matchMedia("(min-width: 1024px)") : null;
    const onResize = () => mql?.matches && setMobileOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    mql?.addEventListener?.("change", onResize);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      mql?.removeEventListener?.("change", onResize);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bg lg:flex">
      <Seo title={pageTitle} noindex />

      <aside className="sfms-side hidden lg:block sticky top-0 h-screen h-[100dvh] w-[248px] shrink-0 z-30">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#061330]/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="sfms-side absolute left-0 top-0 h-full w-[min(280px,86vw)] shadow-float" role="dialog" aria-modal="true" aria-label="Menu" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {!isDashboard && <Topbar title={pageTitle} onMenuClick={() => setMobileOpen(true)} />}
        <main className={`sfms-main relative w-full max-w-[1580px] mx-auto px-4 sm:px-6 xl:px-7 2xl:max-w-[1760px] ${isDashboard ? "py-5 xl:py-6" : "py-6 sm:py-7"}`}>
          {isDashboard && (
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden mb-4 h-11 w-11 rounded-xl border border-cardBorder bg-card flex items-center justify-center text-ink shadow-card"
              aria-label="Open menu"
            >
              <span className="text-xl leading-none">☰</span>
            </button>
          )}
          <div key={location.pathname} className="sfms-page"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
