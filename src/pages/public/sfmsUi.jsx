import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const P = {
  arrow: "M5 12h14M13 6l6 6-6 6", check: "M5 12.5l4.5 4.5L19 7", plus: "M12 5v14M5 12h14", x: "M6 6l12 12M18 6L6 18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6", wallet: "M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1zM4 7l11-3v3M16 13.5h.01",
  tx: "M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6", card: "M3 6h18v12H3zM3 10h18M7 15h4", pie: "M12 3v9h9A9 9 0 1 1 12 3zM15 3.5A9 9 0 0 1 20.5 9H15z",
  goal: "M12 21a9 9 0 1 1 9-9M12 16a4 4 0 1 1 4-4M12 12l7-7M17 5h2v2", chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2", undo: "M4 9h10a5 5 0 0 1 0 10H8M8 5L4 9l4 4",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", lock: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  db: "M5 6c0-1.7 3-3 7-3s7 1.3 7 3-3 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z", play: "M8 5l11 7-11 7z",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  loan: "M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.2-4 3 1.8 2.6 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3",
  mail: "M3 6h18v12H3zM3 7l9 7 9-7", tree: "M10 3h4v4h-4zM4 17h4v4H4zM16 17h4v4h-4zM12 7v5M6 17v-5h12v5",
  into: "M17 7L7 17M7 9v8h8", outof: "M7 17L17 7M9 7h8v8", swap: "M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z", at: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1",
  eyeoff: "M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.6 6.7A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01", alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  chat: "M4 5h16v11H9l-5 4z", bug: "M9 9h6v7a3 3 0 0 1-6 0zM9 12H5M15 12h4M10 6l-1-2M14 6l1-2", sync: "M20 11a8 8 0 0 0-14-4M4 5v4h4M4 13a8 8 0 0 0 14 4M20 19v-4h-4",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
};

export const Ic = ({ n, s = 22 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
);

/* Signs the user out, returns to the home page and confirms with a toast. */
export function useSignOut() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    try { await logout(); navigate("/", { replace: true }); toast.success("Signed out successfully."); }
    catch { toast.error("Could not sign out. Please try again."); }
    finally { setBusy(false); }
  };
  return { signOut, busy };
}

/* The call-to-action slot used across the public pages:
   signed out -> "Get started"; signed in -> "Go to Dashboard" + "Log out". */
export function StartLink({ className, outClass = "btn out", free = false, size = 18 }) {
  const { isAuthenticated, loading } = useAuth();
  const { signOut, busy } = useSignOut();
  if (loading) return <span className={className} style={{ visibility: "hidden" }} aria-hidden="true">Get started</span>;
  if (!isAuthenticated) return <Link className={className} to="/register">{free ? "Get started free" : "Get started"} <Ic n="arrow" s={size} /></Link>;
  return (
    <>
      <Link className={className} to="/dashboard">Go to Dashboard <Ic n="arrow" s={size} /></Link>
      <button type="button" className={outClass} onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Log out"}</button>
    </>
  );
}

export function SingleStartLink({ className, outClass = "btn out", free = false, size = 18 }) {
  const { isAuthenticated, loading } = useAuth();
  const { signOut, busy } = useSignOut();
  if (loading) return <span className={className} style={{ visibility: "hidden" }} aria-hidden="true">Get started</span>;
  if (!isAuthenticated) return <Link className={className} to="/register">{free ? "Get started free" : "Get started"} <Ic n="arrow" s={size} /></Link>;
  return (
    <>
      <Link className={className} to="/dashboard">Go to Dashboard <Ic n="arrow" s={size} /></Link>
      {/* <button type="button" className={outClass} onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Log out"}</button> */}
    </>
  );
}

/* Scroll reveal + progress bar + cursor glow/spotlight. Returns the mousemove handler for the page root. */
export function useFx(root) {
  useEffect(() => {
    const el = root.current;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
    el.querySelectorAll(".rv").forEach((n) => io.observe(n));
    const sc = () => el.style.setProperty("--p", window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
    sc();
    window.addEventListener("scroll", sc, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", sc); };
  }, [root]);
  return (e) => {
    root.current.style.setProperty("--cx", e.clientX + "px");
    root.current.style.setProperty("--cy", e.clientY + "px");
    const s = e.target.closest && e.target.closest(".spot");
    if (s) { const b = s.getBoundingClientRect(); s.style.setProperty("--mx", e.clientX - b.left + "px"); s.style.setProperty("--my", e.clientY - b.top + "px"); }
  };
}

/* A card that rotates front <-> back on click / Enter / Space. Each card keeps its own state, and the scroll-reveal
   class sits on a wrapper whose className never changes, so React can't wipe it (that made flipped cards vanish). */
export function FlipCard({ icon, cat, title, text, back, rows, delay }) {
  const [on, setOn] = useState(false);
  const toggle = () => setOn((v) => !v);
  return (
    <div className="flip-slot rv" style={{ "--d": delay }}>
      <div className={"flip" + (on ? " on" : "")} role="button" tabIndex={0} aria-pressed={on} aria-label={`${title}. ${on ? "Showing details. Press to flip back" : "Press to see details"}`}
        onClick={toggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}>
        <div className="fin">
          <div className="face spot" aria-hidden={on}>{icon}{cat && <span className="cat">{cat}</span>}<h3>{title}</h3><p>{text}</p><span className="more">See details <Ic n="arrow" s={15} /></span></div>
          <div className="face bk" aria-hidden={!on}><h4>{back}</h4>{rows.map(([a, b]) => <div key={a}>{a}<b>{b}</b></div>)}<span className="more">Back to overview</span></div>
        </div>
      </div>
    </div>
  );
}

export function Faq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq rv">
      {items.map(([q, a], i) => (
        <div key={q} className={"fq" + (open === i ? " on" : "")}>
          <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<Ic n="plus" s={20} /></button>
          <div className="fa"><p>{a}</p></div>
        </div>
      ))}
    </div>
  );
}

export function CtaF({ title, text }) {
  return (
    <section className="cta-b"><div className="wrap">
      <div className="cbox rv">
        <div><h2>{title}</h2><p>{text}</p></div>
        <div className="cta"><SingleStartLink className="btn wht lg" outClass="btn line lg" free /><Link className="btn line lg" to="/features">Explore features</Link></div>
      </div>
    </div></section>
  );
}

export function CtaHIW({ title, text }) {
  return (
    <section className="cta-b"><div className="wrap">
      <div className="cbox rv">
        <div><h2>{title}</h2><p>{text}</p></div>
        <div className="cta"><SingleStartLink className="btn wht lg" outClass="btn line lg" free /><Link className="btn line lg" to="/features"><Ic n="play" s={16} /> See how it works</Link></div>
      </div>
    </div></section>
  );
}