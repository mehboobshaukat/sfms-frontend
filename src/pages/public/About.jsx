import { useRef } from "react";
import { Link } from "react-router-dom";
import Seo from "../../components/Seo";
import logo from "../assets/SFMS_logo_transparent.png";
import { Ic, useFx, CtaF, StartLink, SingleStartLink } from "./sfmsUi";
import GridBackdrop from "../../components/ui/GridBackdrop";
import "./common.css";
import "./About.css";

const PRINCIPLES = [
  ["sync", "One engine for everything", "Income, expenses, transfers, loans, credit purchases, refunds and charges all flow through the same engine, so your records agree with each other."],
  ["tree", "Reusable by design", "Set up a category, group or contact once and link it wherever it applies, instead of recreating it for every transaction type."],
  ["shield", "You approve what posts", "The AI Assistant proposes drafts and asks about missing details. Nothing reaches your ledger until you confirm it."],
  ["history", "Mistakes are fixable", "Changes are kept in History for 30 days, and supported actions can be undone, whether the change was yours or an assistant's."],
  ["lock", "Private to your account", "Your records are tied to your own account, with email verification and protected sign-in."],
  ["globe", "Speaks your currency", "Choose your country when you sign up and SFMS shows amounts in the matching currency."],
];

export default function About() {
  const root = useRef();
  const move = useFx(root);
  return (
    <div className="sfms-home" ref={root} onMouseMove={move}>
      <Seo title="About SFMS" description="SFMS is a personal finance ledger built around one principle: your data should drive itself, keeping accounts, loans, credit purchases, budgets, and goals consistent automatically." path="/about" />
      <div className="prog" /><div className="glow" />

      <section className="hero"><div className="wrap hgrid">
        <div className="rv">
          <span className="tag">About SFMS</span>
          <h1>A finance ledger that <span className="grad">keeps itself consistent.</span></h1>
          <p className="lead">SFMS (Self Finance Management System) is built around one principle: your data should drive itself, so you spend your time on decisions, not bookkeeping.</p>
          <div className="cta">
            <SingleStartLink className="btn pri lg" outClass="btn out lg" free />
            <Link className="btn out lg" to="/how-it-works">See how it works</Link>
          </div>
        </div>
        <div className="ab-orb rv" style={{ "--d": ".15s" }} aria-hidden="true">
          <img src={logo} alt="" />
          <span className="chip o1"><Ic n="wallet" s={16} /> Accounts</span>
          <span className="chip o2"><Ic n="pie" s={16} /> Budgets</span>
          <span className="chip o3"><Ic n="loan" s={16} /> Loans</span>
          <span className="chip o4"><Ic n="goal" s={16} /> Goals</span>
        </div>
      </div></section>

      <section className="sec"><div className="wrap ab-story">
        <div className="rv"><span className="tag">Our idea</span><p className="ab-q">Record it once. Let the system do the rest.</p></div>
        <div className="rv mut" style={{ "--d": ".1s", display: "grid", gap: 16 }}>
          <p>Instead of manually updating account balances, tracking who owes you money, or recalculating a budget after every purchase, SFMS does it for you the moment a transaction is recorded.</p>
          <p>Every transaction type, whether income, an expense, a transfer between your own accounts, a loan you gave or received, an item bought or given on credit, a refund or a charge, flows through the same engine. Your accounts, loans, credit purchases and budgets stay consistent with each other.</p>
          <p>Categories, groups and contacts are reusable across the whole system. And because every change is kept in History for 30 days, a slip is something you can fix rather than something you have to live with.</p>
        </div>
      </div></section>

      <section className="sec insights"><div className="wrap">
        <div className="sh c rv"><span className="tag">What we stand for</span><h2>Principles behind every feature</h2></div>
        <div className="ab-grid rv">
          {PRINCIPLES.map(([n, t, d]) => <div className="ab-card spot" key={t}><span className="ico"><Ic n={n} /></span><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </div></section>

      <section className="sec security ab-dark"><GridBackdrop /><div className="wrap">
        <div className="sh c rv"><span className="tag">Made for real life</span><h2>Built for how people really handle money</h2><p>Whether you track everyday spending, lend to a friend, buy something on credit or save for something big, SFMS keeps it all in one place and in order.</p></div>
        <div className="ab-stack rv">{["Daily spending", "Lending and borrowing", "Items bought on credit", "Monthly budgets", "Savings goals", "Moving money between accounts", "Family expenses"].map((t) => <span key={t}>{t}</span>)}</div>
      </div></section>

      <CtaF title="Give your money a clearer system." text="Start with one transaction and let SFMS keep the rest in order." />
    </div>
  );
}
