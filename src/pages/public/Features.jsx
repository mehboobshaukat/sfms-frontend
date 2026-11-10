import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../../components/Seo";
import logo from "../assets/SFMS_logo_transparent.png"; // adjust path to where you keep the logo
import "./common.css";
import GridBackdrop from "../../components/ui/GridBackdrop";
import { FlipCard, CtaHIW, SingleStartLink } from "./sfmsUi";
import "./Features.css";

const P = {
  arrow: "M5 12h14M13 6l6 6-6 6", check: "M5 12.5l4.5 4.5L19 7", plus: "M12 5v14M5 12h14", x: "M6 6l12 12M18 6L6 18",
  tx: "M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6", wallet: "M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1zM4 7l11-3v3M16 13.5h.01",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  loan: "M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.2-4 3 1.8 2.6 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3",
  card: "M3 6h18v12H3zM3 10h18M7 15h4", pie: "M12 3v9h9A9 9 0 1 1 12 3zM15 3.5A9 9 0 0 1 20.5 9H15z",
  goal: "M12 21a9 9 0 1 1 9-9M12 16a4 4 0 1 1 4-4M12 12l7-7M17 5h2v2", chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  tree: "M10 3h4v4h-4zM4 17h4v4H4zM16 17h4v4h-4zM12 7v5M6 17v-5h12v5", flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  file: "M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h4", globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18", filter: "M4 5h16l-6 8v6l-4-2v-4z",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2", shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  lock: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3", db: "M5 6c0-1.7 3-3 7-3s7 1.3 7 3-3 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z", play: "M8 5l11 7-11 7z", menu: "M4 7h16M4 12h16M4 17h16",
  pen: "M4 20l1-4L16 5l3 3L8 19zM14 7l3 3M4 20h4",
};
const Ic = ({ n, s = 22 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
);

const CAPS = [
  ["tx", "", "Daily finances", "All your transactions, connected", "Record income, expenses, transfers, refunds and charges. Account balances are updated through the same financial ledger.", "Latest entries", [["Salary received", "+PKR 45,000"], ["Groceries", "−PKR 2,500"], ["Travel", "−PKR 850"]]],
  ["spark", "e", "AI-assisted entry", "Write it naturally. Review it clearly.", "Describe one or several transactions in everyday language. The AI Assistant proposes editable drafts and asks for missing details before you approve.", "Drafts today", [["Drafts proposed", "3"], ["Need more details", "1"], ["Posted without review", "0"]]],
  ["wallet", "", "Accounts", "Know where your money is", "Keep track of your accounts and transfers in one place, with a clear view of how transactions affect balances.", "Balances", [["Cash Wallet", "PKR 1,24,500"], ["Bank Account", "PKR 80,000"], ["Savings Account", "PKR 47,600"]]],
  ["loan", "a", "Loans", "Keep lending and borrowing organized", "Track loans received or given, then record repayments and collections against the related loan.", "Personal loan", [["Repaid so far", "PKR 1,20,000"], ["Total loan", "PKR 3,00,000"], ["Progress", "40%"]]],
  ["card", "e", "Credit purchases", "Separate item credit from cash loans", "Follow outstanding items bought or given on credit and record payments or installments against the right purchase.", "Laptop (installments)", [["Paid", "PKR 32,000"], ["Outstanding", "PKR 48,000"], ["Progress", "40%"]]],
  ["pie", "", "Budgeting", "Turn a plan into a spending limit", "Set budgets for your categories and see the impact of new expenses as they're recorded.", "Budget used", [["Food & Dining", "78%"], ["Transport", "64%"], ["Shopping", "48%"]]],
  ["goal", "a", "Savings", "Give every goal a destination", "Create savings targets, log progress and keep important financial milestones visible.", "Buy a Car", [["Saved", "PKR 4,50,000"], ["Target", "PKR 8,00,000"], ["Progress", "56%"]]],
  ["chart", "", "Insights", "See the bigger picture", "Use your dashboard, analytics and reports to review patterns across your financial activity.", "This month", [["Top category", "Food & Dining"], ["Spent", "PKR 32,400"], ["Vs last month", "−5%"]]],
  ["history", "e", "Record keeping", "Know what changed", "Follow changes through transaction history, so reviews and corrections are easier to trace.", "Recent activity", [["Edited budget", "2 min ago"], ["Deleted entry", "1 h ago"], ["History kept", "30 days"]]],
  ["tree", "", "Structure", "Categories, groups and contacts", "Organize every transaction under a category, with an optional group and contact, and reuse them across the whole system.", "Example path", [["Type", "Expense"], ["Category", "Food & Dining"], ["Group", "Family"]]],
  ["flag", "a", "Priorities", "Know what is essential", "Tag spending as Emergency, Necessary or Wish, or create your own priorities to match how you think about money.", "Built-in priorities", [["Emergency", "Built in"], ["Necessary", "Built in"], ["Wish", "Built in"]]],
  ["filter", "e", "Filters", "Find any transaction fast", "Filter by date, type, category, account, payment method, priority or contact, with paging for long histories.", "You can filter by", [["Dates", "Any range"], ["Account", "Any account"], ["Contact", "Any person"]]],
  ["file", "", "Reports", "Take a report with you", "Generate a combined report for any date range, then print it or save it as a PDF from your browser.", "A report covers", [["Totals", "Inflow and outflow"], ["Categories", "Spending breakdown"], ["Loans and budgets", "Current status"]]],
  ["globe", "a", "Your currency", "Amounts in your own currency", "Choose your country and state when you sign up and SFMS shows amounts in the matching currency.", "Set at sign-up", [["Country", "Your choice"], ["State", "Your choice"], ["Currency", "Matches country"]]],
  ["lock", "e", "Account security", "Protected sign-in", "Verify your email, change your password any time, and schedule account deletion with a 30-day window. Sign-in locks briefly after repeated failed attempts.", "Account controls", [["Email", "Verified"], ["Failed attempts", "Temporary lock"], ["Deletion", "30-day window"]]],
];
const NOTE = "Salary 45k received, spent 850 on transport.";
const STEP_MS = 4200; // how long each workflow step stays active before the loop moves on
const WF = [
  { n: "pen", k: "k1", t: "You write", d: "Type naturally, in your own words.", c: "#1565ff", c2: "#17c8f2", cs: "rgba(21,101,255,.34)" },
  { n: "spark", k: "k2", t: "SFMS suggests", d: "Review and edit the suggested drafts.", c: "#0f7ae5", c2: "#17c8f2", cs: "rgba(23,160,242,.34)" },
  { n: "check", k: "k3", t: "You confirm", d: "You confirm each draft before posting.", c: "#0b9d6e", c2: "#34d399", cs: "rgba(16,185,129,.34)" },
];
const DRAFTS = [["Salary received", "Income · Salary", "+ PKR 45,000", "g"], ["Groceries", "Expense · Food", "− PKR 2,500", ""], ["Travel", "Expense · Transport", "− PKR 850", ""]];
const OV = [
  ["Account Balances", "l", [["Cash Wallet", "PKR 1,24,500"], ["Bank Account", "PKR 80,000"], ["Savings Account", "PKR 47,600"]]],
  ["Recent Transactions", "l", [["Salary received", "+ PKR 45,000"], ["Groceries", "− PKR 2,500"], ["Travel", "− PKR 850"]]],
  ["Budget Progress", "b", [["Food & Dining", "78% used", 78, "#1565ff"], ["Transport", "64% used", 64, "#17c8f2"], ["Shopping", "48% used", 48, "#10b981"]]],
  ["Savings Goals", "b", [["Buy a Car", "PKR 4,50,000 / 8,00,000", 56, "#10b981"]]],
  ["Loan Repayments", "b", [["Personal Loan", "PKR 1,20,000 / 3,00,000", 40, "#f5a524"]]],
  ["Credit Purchases", "b", [["Laptop (installments)", "PKR 32,000 / 80,000", 40, "#1565ff"]]],
];
const SEC = [["lock", "Account access", "Sign in to your account to access your data privately."], ["db", "Structured records", "All transactions are kept in a consistent, connected ledger."], ["shield", "Reviewable changes", "Review AI suggestions and confirm each draft before posting."], ["history", "Clear financial history", "View a full history of changes within 30 days."]];
const CMP = [["Separate ledgers for every account", "One connected ledger"], ["Automatic entries you only notice later", "AI drafts wait for your review"], ["Item credit mixed with cash loans", "Item credit kept apart from loans"], ["Edits that are hard to trace", "History shows what changed"]];
const FAQ = [
  ["Does the AI post transactions on its own?", "No. AI-assisted entry creates editable drafts and asks about missing details. Nothing is posted until you approve each draft."],
  ["What is the difference between a loan and a credit purchase?", "Loans track cash you lend or borrow. Credit purchases track items bought or given on credit, with payments or installments recorded against each purchase."],
  ["Do transfers and charges update my balances?", "Yes. They go through the same financial ledger, so account balances stay in sync with your transactions."],
  ["Can I look back at changes?", "Yes. Transaction history keeps changes for 30 days so reviews and corrections are easy to trace."],
];

export default function Features() {
  const root = useRef(), hero = useRef(), tilt = useRef(), wfRef = useRef();
  const [faq, setFaq] = useState(0), [stage, setStage] = useState(0), [ok, setOk] = useState([false, false, false]);
  const [live, setLive] = useState(false), [hold, setHold] = useState(false), [typed, setTyped] = useState(NOTE.length);
  const done = ok.every(Boolean);

  useEffect(() => {
    const el = root.current;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
    el.querySelectorAll(".rv").forEach((n) => io.observe(n));
    const sc = () => {
      el.style.setProperty("--p", window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
    };
    sc();
    window.addEventListener("scroll", sc, { passive: true });
    // The workflow loop only runs while its section is on screen.
    const wio = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.35 });
    if (wfRef.current) wio.observe(wfRef.current);
    return () => { io.disconnect(); wio.disconnect(); window.removeEventListener("scroll", sc); };
  }, []);

  // Step 1 types the sample note each time it becomes active.
  useEffect(() => {
    if (stage !== 0) return;
    if (!live || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) { setTyped(NOTE.length); return; }
    setTyped(0);
    const t = setInterval(() => setTyped((n) => (n >= NOTE.length ? n : n + 1)), 55);
    return () => clearInterval(t);
  }, [stage, live]);

  // The active ring's progress animation is the loop clock: when it ends, the next step takes over.
  const nextStep = (e) => { if (e.animationName === "wfRing") setStage((s) => (s + 1) % WF.length); };

  const move = (e) => {
    root.current.style.setProperty("--cx", e.clientX + "px");
    root.current.style.setProperty("--cy", e.clientY + "px");
    const s = e.target.closest && e.target.closest(".spot");
    if (s) { const b = s.getBoundingClientRect(); s.style.setProperty("--mx", e.clientX - b.left + "px"); s.style.setProperty("--my", e.clientY - b.top + "px"); }
    if (tilt.current && hero.current && hero.current.contains(e.target)) {
      const b = hero.current.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      tilt.current.style.transform = `perspective(1200px) rotateY(${x * 7}deg) rotateX(${-y * 5}deg)`;
    }
  };

  return (
    <div className="sfms-home pg-features" ref={root} onMouseMove={move}>
      <Seo title="Features" description="Explore SFMS features: smart transaction tracking, AI-assisted entry, loans, credit purchases, budgets, savings goals, analytics and financial history." path="/features" />
      <div className="prog" />
      <div className="glow" />

      <section className="hero" ref={hero} onMouseLeave={() => tilt.current && (tilt.current.style.transform = "")}>
        <div className="wrap hgrid">
          <div className="rv">
            <span className="tag">Explore the platform</span>
            <h1>Everything about your money, <span className="grad">finally in one place.</span></h1>
            <p className="lead">From one expense to your entire financial picture, SFMS connects the details that matter, without making you manage separate ledgers.</p>
            <div className="cta">
              <SingleStartLink className="btn pri lg" outClass="btn out lg" free />
              <a className="btn out lg" href="#how"><Ic n="play" s={16} /> See how it works</a>
            </div>
            <div className="ticks">{["One connected ledger", "Review before AI posting", "Accounts and goals in sync"].map((t) => <span key={t}><Ic n="check" s={16} />{t}</span>)}</div>
          </div>
          <div className="hvis rv" style={{ "--d": ".15s" }}>
            <div className="dash-wrap" ref={tilt}>
              <div className="chip c1"><Ic n="spark" s={16} /> AI draft ready</div>
              <div className="chip c2"><Ic n="check" s={16} /> You approve <b>first</b></div>
              <img className="emblem" src={logo} alt="" />
              <div className="dash" aria-label="Illustration of a transaction review card">
                <aside><img src={logo} alt="" />{["pie", "tx", "card", "goal", "loan"].map((n) => <i key={n}><Ic n={n} s={16} /></i>)}</aside>
                <div className="dmain">
                  <div className="dtop"><b>Transaction review</b><span className={"pill" + (done ? " ok" : "")}>{done ? "All reviewed" : "Awaiting your approval"}</span></div>
                  {DRAFTS.map(([a, b, c, k], i) => (
                    <button key={a} className={"drf" + (ok[i] ? " ok" : "")} onClick={() => setOk((o) => o.map((v, j) => (j === i ? !v : v)))} aria-pressed={ok[i]}>
                      <span><b>{a}</b><small>{b}</small></span><span className={"amt " + k}>{c}</span><i className="tick"><Ic n="check" s={14} /></i>
                    </button>
                  ))}
                  <div className="dnote"><span>Illustrative sample · no data posted</span><b className="g">Tap a draft to review</b></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="features"><div className="wrap">
        <div className="sh rv"><span className="tag">Built for the full picture</span><h2>Powerful where it matters. Simple where it should be.</h2><p>Each tool is useful on its own. Together, they help you stay organized from daily entries to longer-term plans. Hover or tap a card to see related details.</p></div>
        <div className="fgrid">
          {CAPS.map(([n, tint, cat, t, d, h, rows], i) => (
            <FlipCard key={t} icon={<span className={"ico " + tint}><Ic n={n} /></span>} cat={cat} title={t} text={d} back={h} rows={rows} delay={(i % 3) * 0.1 + "s"} />
          ))}
        </div>
      </div></section>

      <section className="sec ai-sec" id="ai"><div className="wrap">
        <div className="ai-band rv">
          <div>
            <span className="tag">AI, with you in control</span><h2>Fast entry. A careful review.</h2>
            <p className="mut">Write financial notes naturally, in the languages you use. SFMS organizes what it can identify, asks about missing or unmatched details, and prepares drafts for you to review. Nothing is posted just because an AI suggested it.</p>
            <Link className="btn out" to="/how-it-works" style={{ marginTop: 22 }}>Explore the workflow <Ic n="arrow" s={16} /></Link>
          </div>
          <div className={"wf" + (!live || hold ? " pz" : "")} ref={wfRef} role="group" aria-label="AI-assisted entry in three steps" style={{ "--i": stage, "--dur": STEP_MS + "ms" }}
            onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
            <div className="wb" aria-hidden="true">
              <div className="wb-t"><i className="wb-f" /></div>
              <i className={"wb-c c1" + (stage >= 1 ? " lit" : "")} /><i className={"wb-c c2" + (stage >= 2 ? " lit" : "")} />
            </div>
            {WF.map((w, i) => (
              <div key={w.t} className={"wst " + w.k + (stage === i ? " on" : "")} style={{ "--c": w.c, "--c2": w.c2, "--cs": w.cs }}>
                <span className="wn">{"0" + (i + 1)}</span>
                <button type="button" className="wo" onClick={() => setStage(i)} aria-label={"Step " + (i + 1) + ": " + w.t} aria-current={stage === i ? "step" : undefined}>
                  <span className="wo-g" />
                  <span className="wo-o" />
                  <svg className="wr" viewBox="0 0 100 100" aria-hidden="true">
                    <circle className="wr-t" cx="50" cy="50" r="48.5" />
                    <circle className="wr-p" cx="50" cy="50" r="48.5" pathLength="100" onAnimationEnd={nextStep} />
                  </svg>
                  <span className="wo-i"><span className="wo-t"><Ic n={w.n} s={26} /></span></span>
                </button>
                <div className="wtx"><h3>{w.t}</h3><p>{w.d}</p></div>
                <div className="wpv" aria-hidden={stage !== i}>
                  {i === 0 && (
                    <div className="wpc"><span className="wpl"><Ic n="pen" s={12} />Your note</span><p className="wq">“{NOTE.slice(0, typed)}<i className="wcr" />”</p></div>
                  )}
                  {i === 1 && (
                    <div className="wpc"><span className="wpl"><Ic n="spark" s={12} />Draft suggestions</span>
                      <div className="wsg"><span>Income · Salary</span><b>45,000</b></div>
                      <div className="wsg"><span>Expense · Transport</span><b>850</b></div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="wpc wok"><span className="wk"><Ic n="check" s={18} /></span><div><b>Approved by you</b><small>Nothing posts without it</small></div></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div></section>

      <section className="sec insights" id="overview"><div className="wrap ovw">
        <div className="rv">
          <span className="tag">Your connected finances</span><h2>One connected picture of your finances.</h2>
          <p className="mut">Accounts, transactions, budgets, goals, loans and credit purchases all work together in a single, clear view.</p>
          <div className="note"><Ic n="eye" /><span>All data shown here is illustrative sample data for demonstration purposes only.</span></div>
        </div>
        <div className="ovg">
          {OV.map(([t, k, rows], i) => (
            <div className="ovc spot rv" key={t} style={{ "--d": (i % 3) * 0.1 + "s" }}>
              <h4>{t}</h4>
              {k === "l" ? rows.map(([a, b]) => <div className="li" key={a}><span>{a}</span><span>{b}</span></div>)
                : rows.map(([a, b, w, c]) => <div className="pb" key={a}><div className="ph"><span>{a}</span><span>{w}%</span></div><small>{b}</small><div className="track"><i style={{ "--w": w + "%", "--c": c }} /></div></div>)}
            </div>
          ))}
        </div>
      </div></section>

      <section className="sec security" id="security"><GridBackdrop /><div className="wrap">
        <div className="sh c rv"><span className="tag">Secure and organized</span><h2>A system you can trust for everyday use.</h2><p>SFMS keeps your financial data organized and under your control, with features designed for safe and reliable use.</p></div>
        <div className="sgrid rv">{SEC.map(([n, t, d]) => <div className="scard spot" key={t}><span className="ico"><Ic n={n} /></span><h3>{t}</h3><p>{d}</p></div>)}</div>
      </div></section>

      <section className="sec" id="compare"><div className="wrap">
        <div className="sh c rv"><span className="tag">Why SFMS</span><h2>One system instead of scattered ledgers</h2></div>
        <div className="cmp">
          <div className="cc rv"><h3>Managing it separately</h3><ul>{CMP.map(([a]) => <li key={a}><Ic n="x" />{a}</li>)}</ul></div>
          <div className="cc us rv" style={{ "--d": ".15s" }}><h3>With SFMS</h3><ul>{CMP.map(([, b]) => <li key={b}><Ic n="check" />{b}</li>)}</ul></div>
        </div>
      </div></section>

      <section className="sec faqs" id="faq"><div className="wrap">
        <div className="sh c rv"><span className="tag">FAQ</span><h2>Questions, answered</h2></div>
        <div className="faq rv">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={"fq" + (faq === i ? " on" : "")}>
              <button aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}>{q}<Ic n="plus" s={20} /></button>
              <div className="fa"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </div></section>

      <section className="cta-b"><div className="wrap">
        <CtaHIW title="Your finances deserve a clearer system." text="Start with a simple transaction. Let the connected tools do the bookkeeping around it." />
      </div></section>

    </div>
  );
}
