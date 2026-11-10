import { useEffect, useRef, useState } from "react";
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
  ["in", "Money in", "into", [
    ["Income", "Money you earn, such as a salary"], ["Take Support", "Money you receive as help from someone"], ["Refund", "Money returned to you"],
    ["Loan Received", "Money you borrow"], ["Loan Collected", "Repayment on a loan you gave"], ["Item Payment Received", "A payment for an item you gave on credit"]]],
  ["out", "Money out", "outof", [
    ["Expense", "Everyday spending"], ["Give Support", "Money you give to help someone"], ["Charges", "Fees and service charges"],
    ["Loan Given", "Money you lend to someone"], ["Loan Repaid", "A repayment on a loan you took"], ["Item Payment Made", "A payment on an item bought on credit"], ["Other", "Anything that fits nowhere else"]]],
  ["mv", "Move money", "swap", [
    ["Transfer", "Move money between your own accounts"], ["Withdraw", "Take money out of an account as cash"], ["Deposit", "Put cash into an account"]]],
];
const TABS = [["all", "All types"], ...TYPES.map(([k, l]) => [k, l])];
const countOf = (k) => (k === "all" ? TYPES.reduce((n, t) => n + t[3].length, 0) : TYPES.find((t) => t[0] === k)[3].length);

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

export default function HowItWorks() {
  const root = useRef();
  const move = useFx(root);
  const [step, setStep] = useState(0), [pause, setPause] = useState(false), [fx, setFx] = useState(0), [kind, setKind] = useState("all");

  useEffect(() => {
    if (pause || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % JOURNEY.length), 6000);
    return () => clearTimeout(t);
  }, [step, pause]);

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
        <div className="hw-try rv">
          <div>
            <div className="hw-tabs">{TRY.map(([n], i) => <button key={n} className={"hw-pill" + (i === fx ? " on" : "")} onClick={() => setFx(i)}>{n}</button>)}</div>
            <div className="hw-in"><small>You record</small><b>{T[1]}</b></div>
          </div>
          <div className="hw-fx" key={fx}>
            {T[2].map(([a, b, k], i) => <div key={a} style={{ "--i": i }}><Ic n="check" s={16} />{a}<b className={k}>{b}</b></div>)}
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
        <div className="sh c rv"><span className="tag">Ready-made types</span><h2>Every kind of money movement</h2><p>SFMS starts with built-in transaction types for money coming in, going out and moving between your accounts. You can add your own too.</p></div>
        <div className="ty-seg rv" role="tablist" aria-label="Transaction type groups" style={{ "--k": TABS.findIndex(([k]) => k === kind) }}>
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{l}<em>{countOf(k)}</em></button>)}
        </div>
        <div className="ty-grid" key={kind} role="tabpanel">
          {TYPES.filter(([k]) => kind === "all" || kind === k)
            .flatMap(([k, label, icon, list]) => list.map(([name, desc]) => ({ k, label, icon, name, desc })))
            .map((c, i) => (
              <div key={c.name} className={"ty-card spot " + c.k} style={{ "--i": i }}>
                <span className="ty-ic"><Ic n={c.icon} /></span>
                <div>{kind === "all" && <em className="ty-tag">{c.label}</em>}<b>{c.name}</b><small>{c.desc}</small></div>
              </div>
            ))}
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
