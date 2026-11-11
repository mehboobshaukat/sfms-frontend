import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSignOut } from "../../pages/public/sfmsUi";
import Icon from "../ui/Icon";
import logo from "../../pages/assets/SFMS_logo_transparent.png";
import wordmarkDark from "../../pages/assets/sfms-wordmark.png";
import wordmarkLight from "../../pages/assets/sfms-wordmark-light.png";
import GridBackdrop from "../ui/GridBackdrop";
import DeveloperBadge from "../ui/DeveloperBadge";
import "./PublicLayout.css";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function Brand({ tagline = true }) {
  return (
    <Link to="/" className="pl-brand" aria-label="SFMS, Self Finance Management System: home">
      <img className="pl-logo" src={logo} alt="" />
      <span className="pl-word"><img className="wm-dark" src={wordmarkDark} alt="SFMS" /><img className="wm-light" src={wordmarkLight} alt="SFMS" />{tagline && <small>Self Finance Management System</small>}</span>
    </Link>
  );
}

export default function PublicLayout() {
  const { isAuthenticated, loading } = useAuth();
  const { signOut, busy } = useSignOut();
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setOpen(false); if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sfms-site flex min-h-screen flex-col bg-bg">
      <header className={"pl-hd" + (scrolled ? " sc" : "")}>
        <div className="pl-bar">
          <Brand />
          <nav className="pl-nav" aria-label="Main navigation">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={pathname === l.to ? "on" : ""} aria-current={pathname === l.to ? "page" : undefined}>{l.label}</Link>
            ))}
          </nav>
          <div className="pl-acts" style={loading ? { visibility: "hidden" } : undefined}>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="pl-btn">Dashboard <Icon name="chevronRight" size={16} /></Link>
                <button type="button" className="pl-out" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Log out"}</button>
              </>
            ) : (
              <>
                <Link to="/login" className="pl-login">Log in</Link>
                <Link to="/register" className="pl-btn">Get started <Icon name="chevronRight" size={16} /></Link>
              </>
            )}
            <button type="button" className="pl-menu" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close navigation" : "Open navigation"} aria-controls="sfms-mobile-nav" aria-expanded={open}>
              {open ? <span aria-hidden="true" className="pl-x">×</span> : <Icon name="menu" size={20} />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="sfms-mobile-nav" className="pl-mnav" aria-label="Mobile navigation">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={pathname === l.to ? "on" : ""} aria-current={pathname === l.to ? "page" : undefined}>{l.label}</Link>
            ))}
            {isAuthenticated
              ? <><Link to="/dashboard" className="pl-mcta">Dashboard</Link><button type="button" className="pl-mout" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Log out"}</button></>
              : <><Link to="/login">Log in</Link><Link to="/register" className="pl-mcta">Get started</Link></>}
          </nav>
        )}
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="pl-ft">
        <GridBackdrop tone={0.8} />
        <div className="pl-ft-in">
          <div>
            <Brand />
            <p>One ledger for your income, expenses, loans, credit purchases, budgets and savings goals.</p>
          </div>
          <nav aria-label="Explore"><h4>Explore</h4><ul>{LINKS.slice(0, 3).map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}</ul></nav>
          <nav aria-label="Company"><h4>Company</h4><ul>{LINKS.slice(3).map((l) => <li key={l.to}><Link to={l.to}>{l.label}</Link></li>)}</ul></nav>
          <nav aria-label="Account"><h4>Account</h4>
            <ul>
              {isAuthenticated
                ? <><li><Link to="/dashboard">Dashboard</Link></li><li><button type="button" className="pl-flink" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Log out"}</button></li></>
                : <><li><Link to="/login">Log in</Link></li><li><Link to="/register">Create account</Link></li></>}
            </ul>
          </nav>
        </div>
        <div className="pl-ft-dev"><DeveloperBadge /></div>
        <div className="pl-ft-b">
          <span>© {new Date().getFullYear()} SFMS — Self Finance Management System.</span>
          <span>Illustrative sample data is used on marketing pages.</span>
        </div>
      </footer>
    </div>
  );
}
