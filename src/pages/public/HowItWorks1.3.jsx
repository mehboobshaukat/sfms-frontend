import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../../components/Seo";
import { Ic, useFx, Faq, Cta } from "./sfmsUi";
import GridBackdrop from "../../components/ui/GridBackdrop";
import "./common.css";
import "./HowItWorks.css";

const JOURNEY = [
  ["user", "Create your account", "Register with your name, email and password, and choose your country and state so amounts appear in your currency. Verify your email, then sign in.", ["Email verification", "Country-based currency", "Starter Cash account"],
    [["Sign up", "Name, email, password"], ["Location", "Country and state"], ["Verify", "Link sent to your email"], ["Starter account", "Cash, ready to use"]]],
  ["wallet", "Shape your workspace", "Add the accounts you use and the payment methods under each. Pick or create categories, groups, contacts and priorities, then reuse them everywhere.", ["Cash, bank, digital wallet", "Reusable categories", "Custom priorities"],
    [["Accounts", "Cash · Bank · Digital wallet"], ["Payment methods", "Linked to each account"], ["Categories", "Under every transaction type"], ["Priorities", "Emergency · Necessary · Wish"]]],
  ["tx", "Record a transaction", "Use the transaction form, or write your notes to the AI Assistant. Either way SFMS checks the details before anything is saved.", ["Manual form", "AI drafts you approve", "Loans and credit items"],
    [["Pick a type", "Income, Expense, Loan Given…"], ["Choose a category", "Group and contact if needed"], ["Select accounts", "And a payment method"], ["Save", "The engine validates it"]]],
  ["sync", "Everything stays in sync", "One engine updates the related records the moment you save, so you never recalculate balances, loans or budgets by hand.", ["Balances", "Loan remaining amounts", "Budget spending"],
    [["Account balances", "Updated instantly"], ["Loans", "Remaining amount reduced"], ["Budgets", "Spent amount increases"], ["Credit purchases", "Settled by item payments"]]],
  ["chart", "Review, report and undo", "See cash flow on your dashboard, generate reports for any date range, and use History to undo a mistake within 30 days.", ["Dashboard", "Reports", "30-day History"],
    [["Dashboard", "Cash flow and spending"], ["Reports", "Any range, print or save as PDF"], ["History", "Undo within 30 days"], ["Goals", "Add or release savings"]]],
];

const TRY = [
  ["Expense", "Expense · Food · 1,500 from Cash", [["Cash balance", "− 1,500", "dn"], ["Food budget used", "+ 1,500", "up"], ["History entry", "Added", ""]]],
  ["Loan repaid", "Loan Repaid · 5,000 to Ali", [["Account balance", "− 5,000", "dn"], ["Loan remaining", "− 5,000", "up"], ["Loan status", "Closes at zero", ""]]],
  ["Transfer", "Transfer · 10,000 Bank → Cash", [["Bank balance", "− 10,000", "dn"], ["Cash balance", "+ 10,000", "up"], ["Budgets", "Not affected", ""]]],
  ["Delete", "Delete the 1,500 Food expense", [["Cash balance", "+ 1,500", "up"], ["Food budget used", "− 1,500", "up"], ["History", "Undo available 30 days", ""]]],
];

const TYPES = [
  ["in", ["Income", "Take Support", "Refund", "Loan Received", "Loan Collected", "Item Payment Received"]],
  ["out", ["Expense", "Give Support", "Charges", "Loan Given", "Loan Repaid", "Item Payment Made", "Other"]],
  ["mv", ["Transfer", "Withdraw", "Deposit"]],
];
const KIND = { all: "All types", in: "Money in", out: "Money out", mv: "Move money" };

const SAFE = [
  ["undo", "History and undo", "Changes are kept for 30 days. Undo a create, an update or a delete, subject to safety checks."],
  ["sync", "Reversible deletes", "Deleting a transaction reverses its effect on balances, loans and budgets automatically."],
  ["lock", "Protected sign-in", "Verify your email, and sign-in locks briefly after repeated failed attempts."],
  ["shield", "You approve AI drafts", "The assistant only proposes drafts. Nothing is posted until you confirm it."],
];

const FAQ = [
  ["Do I have to enter every transaction manually?", "No. Use the normal transaction form, or write several notes to the AI Assistant. Its suggestions go through clarification and draft review before they become real records."],
  ["Can I use more than one account?", "Yes. Add cash, bank and digital wallet accounts, then choose the source or destination when you record a transaction."],
  ["What if the AI misunderstands a transaction?", "Edit the draft, answer the clarifying questions, or reject it. The assistant never posts on its own."],
  ["Can I track money I have lent or borrowed?", "Yes. Loan transactions need a contact, and repayments or collections are recorded against the matching loan. Items bought or given on credit are tracked separately."],
  ["Is this page a live preview?", "No. The examples here use sample values to explain the flow. After you sign in you will see your own data."],
];

/* ---------- "One engine" section: helpers ---------- */
const CYCLE = 6500;                                   // ms a transaction stays selected before the next one plays
const TRY_META = [["tx", "rd"], ["sync", "bl"], ["arrow", "cy"], ["undo", "am"]];   // [icon, tint] of the "You record" tile
const rowIcon = (label) => /balance/i.test(label) ? "wallet" : /budget/i.test(label) ? "chart" : /histor/i.test(label) ? "history" : /remaining/i.test(label) ? "sync" : "check";
const rowTone = (k) => (k === "dn" ? "rd" : k === "up" ? "gn" : "bl");

// 8-tooth gear drawn around (140, 74); the hole is cut out with fill-rule evenodd
const GEAR = (() => {
  const cx = 140, cy = 74, ro = 19, ri = 14.5, n = 8;
  const pt = (a, r) => `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    d += `${i ? "L" : "M"}${pt(a - 0.2, ri)}L${pt(a - 0.13, ro)}L${pt(a + 0.13, ro)}L${pt(a + 0.2, ri)}`;
  }
  return `${d}ZM${cx + 7} ${cy}a7 7 0 1 0 -14 0a7 7 0 1 0 14 0Z`;
})();

// position of an element inside the stage from layout offsets (ignores CSS transforms, so cards that are
// still animating in are measured at their final place)
const offsetIn = (el, root) => {
  let x = 0, y = 0;
  for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
};
const r1 = (n) => Math.round(n * 10) / 10;
const bez = ([a, b, c, d], t) => { const u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y }; };
const bezTan = ([a, b, c, d], t) => { const u = 1 - t; return { x: 3 * u * u * (b.x - a.x) + 6 * u * t * (c.x - b.x) + 3 * t * t * (d.x - c.x), y: 3 * u * u * (b.y - a.y) + 6 * u * t * (c.y - b.y) + 3 * t * t * (d.y - c.y) }; };

// one neuron-style connection: a curved axon plus two short dendrite twigs with synapse nodes
function neuron(a, b, mode, idx) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const c1 = mode === "h" ? { x: a.x + dx * 0.55, y: a.y } : { x: a.x, y: a.y + dy * 0.52 };
  const c2 = mode === "h" ? { x: b.x - dx * 0.55, y: b.y } : mode === "v" ? { x: b.x, y: b.y - dy * 0.52 } : { x: b.x - 30, y: b.y };
  const p = [a, c1, c2, b];
  const twigs = [0.3, 0.64].map((t, k) => {
    const P = bez(p, t), T = bezTan(p, t), m = Math.hypot(T.x, T.y) || 1, tx = T.x / m, ty = T.y / m;
    const s = (idx + k) % 2 ? 1 : -1, len = 24 + k * 8, nx = -ty * s, ny = tx * s;
    const end = { x: P.x + nx * len + tx * len * 0.55, y: P.y + ny * len + ty * len * 0.55 };
    const ctl = { x: P.x + nx * len * 0.15 + tx * len * 0.5, y: P.y + ny * len * 0.15 + ty * len * 0.5 };
    return { P: { x: r1(P.x), y: r1(P.y) }, end: { x: r1(end.x), y: r1(end.y) }, d: `M${r1(P.x)} ${r1(P.y)}Q${r1(ctl.x)} ${r1(ctl.y)} ${r1(end.x)} ${r1(end.y)}` };
  });
  return { a, b, twigs, d: `M${r1(a.x)} ${r1(a.y)}C${r1(c1.x)} ${r1(c1.y)} ${r1(c2.x)} ${r1(c2.y)} ${r1(b.x)} ${r1(b.y)}` };
}

// wires: "You record" card -> engine -> each result card (side by side on desktop, stacked on small screens)
function buildLinks(stage, inEl, coreEl, outEls) {
  const stacked = window.matchMedia("(max-width: 1020px)").matches;
  const I = offsetIn(inEl, stage), C = offsetIn(coreEl, stage), O = outEls.map((e) => offsetIn(e, stage));
  const port = (px, py) => ({ x: C.x + (C.w * px) / 280, y: C.y + (C.h * py) / 250 });   // engine art is a 280 x 250 viewBox
  const nets = [];
  if (!stacked) {
    const left = port(18, 160), right = port(262, 160);
    nets.push(neuron({ x: I.x + I.w, y: I.y + I.h / 2 }, left, "h", 0));
    O.forEach((o, i) => nets.push(neuron(right, { x: o.x, y: o.y + o.h / 2 }, "h", i + 1)));
  } else {
    const top = port(140, 40), bottom = port(140, 236);
    nets.push(neuron({ x: I.x + I.w / 2, y: I.y + I.h }, top, "v", 0));
    O.forEach((o, i) => nets.push(neuron(bottom, { x: o.x, y: o.y + o.h / 2 }, "side", i + 1)));
  }
  return { w: stage.offsetWidth, h: stage.offsetHeight, nets };
}

export default function HowItWorks() {
  const root = useRef();
  const move = useFx(root);
  const [step, setStep] = useState(0), [pause, setPause] = useState(false), [fx, setFx] = useState(0), [kind, setKind] = useState("all");
  const stage = useRef(), inRef = useRef(), coreRef = useRef(), outRefs = useRef([]);
  const [live, setLive] = useState(false), [replay, setReplay] = useState(0), [geo, setGeo] = useState(null);
  const reduce = useRef(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (pause || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % JOURNEY.length), 6000);
    return () => clearTimeout(t);
  }, [step, pause]);

  // "What happens when you press save": play the next transaction when this one has finished; clicking a tab jumps there
  useEffect(() => {
    if (!live || reduce.current) return;
    const t = setTimeout(() => setFx((f) => (f + 1) % TRY.length), CYCLE);
    return () => clearTimeout(t);
  }, [fx, live]);
  useEffect(() => {                                   // only run while the section is on screen, and replay from the start on entry
    const el = stage.current;
    if (!el || typeof IntersectionObserver !== "function") { setLive(true); return; }
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (live) setReplay((r) => r + 1); }, [live]);
  useLayoutEffect(() => {                             // measure the real cards so the neuron wires always meet them
    const el = stage.current;
    if (!el) return undefined;
    const measure = () => { if (inRef.current && coreRef.current && outRefs.current.length === 3 && outRefs.current.every(Boolean)) setGeo(buildLinks(el, inRef.current, coreRef.current, outRefs.current)); };
    measure();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    document.fonts?.ready.then(measure);
    return () => ro?.disconnect();
  }, [fx]);

  const run = `${fx}-${replay}`;
  const J = JOURNEY[step], T = TRY[fx];
  return (
    <div className="sfms-home" ref={root} onMouseMove={move}>
      <Seo title="How It Works" description="See how SFMS works: create an account, set up accounts and categories, record transactions manually or with AI, keep balances, loans and budgets in sync, and review reports with 30-day undo." path="/how-it-works" />
      <div className="prog" /><div className="glow" />

      <section className="hero sm"><div className="wrap hcenter rv">
        <span className="tag">How SFMS works</span>
        <h1>From sign-up to a clear picture, <span className="grad">in five steps.</span></h1>
        <p className="lead">Record a transaction once and SFMS keeps your accounts, loans, budgets and history consistent, with a safety net underneath.</p>
        <div className="cta" style={{ justifyContent: "center" }}>
          <Link className="btn pri lg" to="/register">Get started free <Ic n="arrow" s={18} /></Link>
          <Link className="btn out lg" to="/features">Explore features</Link>
        </div>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sh c rv"><span className="tag">The journey</span><h2>Your first day with SFMS</h2><p>Pick a step to see what happens. The tour moves on by itself and pauses while you hover.</p></div>
        <div className="hw-jr rv" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
          <div className="hw-list">
            {JOURNEY.map(([n, t], i) => (
              <button key={t} className={"hw-step" + (i === step ? " on" : "") + (pause ? " hold" : "")} onClick={() => setStep(i)} aria-pressed={i === step}>
                <span className="ico"><Ic n={n} /></span><span><b>{i + 1}. {t}</b><small>{i === step ? "Selected" : "Tap to preview"}</small></span>
              </button>
            ))}
          </div>
          <div className="hw-panel" key={step}>
            <span className="ico"><Ic n={J[0]} s={26} /></span>
            <h3>{J[1]}</h3><p>{J[2]}</p>
            <div className="hw-tags">{J[3].map((t) => <span key={t}>{t}</span>)}</div>
            <div>{J[4].map(([a, b], i) => <div className="hw-row" key={a} style={{ "--i": i }}><span>{a}</span><b>{b}</b></div>)}</div>
            <small className="hw-ill">Illustrative example, not live data</small>
          </div>
        </div>
      </div></section>

      <section className="sec insights"><div className="wrap">
        <div className="sh c rv"><span className="tag">One engine</span><h2>What happens when you press save</h2><p>Choose a transaction to see which records SFMS updates for you.</p></div>
        <div className="hw-eng rv" ref={stage} data-run={live && !reduce.current ? "1" : "0"} style={{ "--cycle": `${CYCLE}ms` }}>
          {/* neuron-style wires between the cards and the engine (measured from the real layout) */}
          <svg className="hw-eng-links" viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : "0 0 10 10"} aria-hidden="true">
            {geo && (
              <>
                {geo.nets.map((n, i) => (
                  <g key={i}>
                    <path className="hw-wire" d={n.d} />
                    {n.twigs.map((t, k) => (
                      <g key={k}><path className="hw-twig" d={t.d} /><circle className="hw-syn" cx={t.P.x} cy={t.P.y} r="2.4" /><circle className="hw-syn" cx={t.end.x} cy={t.end.y} r="2.1" /></g>
                    ))}
                    <path className="hw-comet idle" pathLength="1" d={n.d} style={{ "--d": `${i * 0.9}s`, "--t": `${3.4 + i * 0.5}s` }} />
                    <circle className="hw-port" cx={n.a.x} cy={n.a.y} r="4" /><circle className="hw-port" cx={n.b.x} cy={n.b.y} r="4" />
                  </g>
                ))}
                <g key={run}>
                  {geo.nets.map((n, i) => <path key={i} className="hw-comet" pathLength="1" d={n.d} style={{ "--d": i === 0 ? ".15s" : `${1.05 + (i - 1) * 0.14}s`, "--t": i === 0 ? ".9s" : ".72s" }} />)}
                  {geo.nets.slice(1).map((n, i) => <circle key={i} className="hw-land" cx={n.b.x} cy={n.b.y} r="5" style={{ "--d": `${1.7 + i * 0.14}s` }} />)}
                </g>
              </>
            )}
          </svg>

          <div className="hw-eng-in">
            <div className="hw-tabs">{TRY.map(([n], i) => <button key={n} className={"hw-pill" + (i === fx ? " on" : "")} onClick={() => setFx(i)} aria-pressed={i === fx}>{n}</button>)}</div>
            <div className="hw-in" key={run} ref={inRef}>
              <span className={"hw-tile " + TRY_META[fx][1]}><Ic n={TRY_META[fx][0]} s={22} /></span>
              <span className="hw-in-t"><small>You record</small><b>{T[1]}</b></span>
              <span className="hw-chev"><Ic n="arrow" s={16} /></span>
            </div>
          </div>

          <div className="hw-eng-core">
            <div className="hw-engine-wrap" ref={coreRef}>
              <svg className="hw-engine" viewBox="0 0 280 250" aria-hidden="true">
                <defs>
                  <linearGradient id="hwTopB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3f9ff" /><stop offset="1" stopColor="#a9d3ff" /></linearGradient>
                  <linearGradient id="hwTopM" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dcedff" /><stop offset="1" stopColor="#74b5ff" /></linearGradient>
                  <linearGradient id="hwTopT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c3e1ff" /><stop offset="1" stopColor="#4b93ff" /></linearGradient>
                  <linearGradient id="hwSideL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f6ff0" /><stop offset="1" stopColor="#1740b0" /></linearGradient>
                  <linearGradient id="hwSideR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a86ff" /><stop offset="1" stopColor="#2557d0" /></linearGradient>
                  <linearGradient id="hwCubeT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c4e4ff" /><stop offset="1" stopColor="#7cb8ff" /></linearGradient>
                  <linearGradient id="hwCubeL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a86f7" /><stop offset="1" stopColor="#1f55e0" /></linearGradient>
                  <linearGradient id="hwCubeR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6aa2ff" /><stop offset="1" stopColor="#3470f0" /></linearGradient>
                  <radialGradient id="hwGlow"><stop offset="0" stopColor="#7fe4ff" stopOpacity=".9" /><stop offset="1" stopColor="#17c8f2" stopOpacity="0" /></radialGradient>
                  <filter id="hwBlur" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3" /></filter>
                </defs>
                <ellipse cx="140" cy="196" rx="132" ry="44" fill="url(#hwGlow)" opacity=".5" />

                {/* three stacked platforms */}
                <path d="M18 160L140 221V237L18 176Z" fill="url(#hwSideL)" /><path d="M262 160L140 221V237L262 176Z" fill="url(#hwSideR)" />
                <path d="M18 160L140 99L262 160L140 221Z" fill="url(#hwTopB)" stroke="#fff" strokeOpacity=".9" strokeWidth="1.5" strokeLinejoin="round" />
                <path className="hw-edge" pathLength="100" d="M18 160L140 99L262 160L140 221Z" />
                <path d="M48 146L140 192V206L48 160Z" fill="url(#hwSideL)" /><path d="M232 146L140 192V206L232 160Z" fill="url(#hwSideR)" />
                <path d="M48 146L140 100L232 146L140 192Z" fill="url(#hwTopM)" stroke="#fff" strokeOpacity=".85" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M78 134L140 165V177L78 146Z" fill="url(#hwSideL)" /><path d="M202 134L140 165V177L202 146Z" fill="url(#hwSideR)" />
                <path d="M78 134L140 103L202 134L140 165Z" fill="url(#hwTopT)" stroke="#fff" strokeOpacity=".85" strokeWidth="1.4" strokeLinejoin="round" />

                <ellipse className="hw-ripple" cx="140" cy="134" rx="74" ry="37" /><ellipse className="hw-ripple b" cx="140" cy="134" rx="74" ry="37" />
                <ellipse key={`f${run}`} className="hw-flash" cx="140" cy="134" rx="70" ry="35" fill="url(#hwGlow)" />
                <g transform="translate(140 110) scale(1 .32)"><circle className="hw-ring" r="94" /><g className="hw-orbit"><ellipse cx="94" rx="6" ry="18.75" fill="#7fe4ff" /><ellipse cx="-94" rx="4" ry="12.5" fill="#fff" opacity=".85" /></g></g>

                {/* ports where the neuron wires plug in */}
                <circle className="hw-eport" cx="18" cy="160" r="5" /><circle className="hw-eport" cx="262" cy="160" r="5" /><circle className="hw-eport" cx="140" cy="236" r="4.5" />

                <ellipse className="hw-shadow" cx="140" cy="134" rx="30" ry="9" fill="rgba(8,30,110,.4)" filter="url(#hwBlur)" />
                <g className="hw-chip3d">
                  <g transform="translate(140 74) scale(1.16) translate(-140 -74)"><g className="hw-bump" key={`b${run}`}>
                    <path d="M108 56L140 74V110L108 92Z" fill="url(#hwCubeL)" stroke="#3c78f2" strokeWidth="3" strokeLinejoin="round" />
                    <path d="M172 56L140 74V110L172 92Z" fill="url(#hwCubeR)" stroke="#5b97ff" strokeWidth="3" strokeLinejoin="round" />
                    <path d="M140 38L172 56L140 74L108 56Z" fill="url(#hwCubeT)" stroke="#a5d2ff" strokeWidth="3" strokeLinejoin="round" />
                    <path d="M140 38L172 56V92L140 110L108 92V56Z" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.6" strokeLinejoin="round" />
                    <circle cx="140" cy="74" r="25" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.55)" strokeWidth="1.4" />
                    <path className="hw-gear" d={GEAR} fill="#fff" fillRule="evenodd" />
                  </g></g>
                </g>
              </svg>
            </div>
            <div className="hw-eng-label"><i />SFMS Engine</div>
          </div>

          <div className="hw-fx" key={run}>
            {T[2].map(([a, b, k], i) => (
              <div className={"hw-oc " + (k || "nu")} key={a} style={{ "--i": i }} ref={(el) => { outRefs.current[i] = el; }}>
                <span className={"hw-tile " + rowTone(k)}><Ic n={rowIcon(a)} s={20} /></span>
                <span className="hw-ol">{a}</span><b>{b}</b>
                <i className="hw-done"><Ic n="check" s={11} /></i>
              </div>
            ))}
          </div>
        </div>
      </div></section>

      <section className="sec"><div className="wrap">
        <div className="sh c rv"><span className="tag">Two ways to enter</span><h2>Choose what suits the moment</h2></div>
        <div className="hw-paths rv">
          <div className="hw-path">
            <h3><Ic n="tx" /> Transaction form</h3>
            <ol>{["Choose a transaction type", "Pick the category, group and contact", "Select accounts and a payment method", "Save. SFMS validates and updates everything"].map((t, i) => <li key={t}><i>{i + 1}</i>{t}</li>)}</ol>
          </div>
          <div className="hw-path hw-ai">
            <h3><Ic n="spark" /> AI Assistant</h3>
            <ol>{["Write one or many notes in your own words", "Answer any question about missing details", "Review and edit each draft, or reject it", "Confirm to post to your ledger"].map((t, i) => <li key={t}><i>{i + 1}</i>{t}</li>)}</ol>
          </div>
        </div>
      </div></section>

      <section className="sec insights"><div className="wrap">
        <div className="sh rv"><span className="tag">Ready-made types</span><h2>Every kind of money movement</h2><p>SFMS starts with built-in transaction types and lets you add your own.</p></div>
        <div className="hw-tabs rv">{Object.entries(KIND).map(([k, l]) => <button key={k} className={"hw-pill" + (kind === k ? " on" : "")} onClick={() => setKind(k)}>{l}</button>)}</div>
        <div className="hw-chips" key={kind}>
          {TYPES.filter(([k]) => kind === "all" || kind === k).flatMap(([k, l]) => l.map((t) => [k, t])).map(([k, t], i) => <span key={t} className={"hw-chip " + k} style={{ "--i": i }}>{t}</span>)}
        </div>
      </div></section>

      <section className="sec security"><GridBackdrop /><div className="wrap">
        <div className="sh c rv"><span className="tag">A safety net</span><h2>Mistakes are easy to fix</h2><p>Every change leaves a trail, and supported actions can be undone for 30 days.</p></div>
        <div className="sgrid rv">{SAFE.map(([n, t, d]) => <div className="scard spot" key={t}><span className="ico"><Ic n={n} /></span><h3>{t}</h3><p>{d}</p></div>)}</div>
      </div></section>

      <section className="sec faqs" id="faq"><div className="wrap">
        <div className="sh c rv"><span className="tag">FAQ</span><h2>Questions, answered</h2></div>
        <Faq items={FAQ} />
      </div></section>

      <Cta title="Ready to see it with your own numbers?" text="Create a free account and record your first transaction in minutes." />
    </div>
  );
}
