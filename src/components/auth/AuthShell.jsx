import React from "react";
import { Link } from "react-router-dom";
import GridBackdrop from "../ui/GridBackdrop";
import { Ic } from "../../pages/public/sfmsUi";
import "./AuthShell.css";

const SIDE = {
  login: { eyebrow: "Welcome back", title: "Pick up right where you left off.", points: ["Balances, budgets and goals at a glance", "Review AI drafts before anything is posted", "Undo mistakes within 30 days"] },
  register: { eyebrow: "Free to start", title: "Your whole financial picture, in one place.", points: ["Accounts, loans, credit purchases and budgets together", "Amounts shown in your own currency", "No credit card required"] },
  recover: { eyebrow: "Account help", title: "Back in, safely.", points: ["Links are sent only to your email", "Your records stay private to your account", "Sign-in locks briefly after repeated failed attempts"] },
};

/** Shared layout for the login / register / password-recovery screens: brand panel on the left, form card on the right. */
export default function AuthShell({ side = "login", icon = "lock", title, subtitle, footer, wide = false, children }) {
  const S = SIDE[side] || SIDE.login;
  return (
    <section className="sfms-auth">
      <aside className="au-side">
        <GridBackdrop tone={0.8} />
        <div className="au-top">
          <span className="au-eyebrow">{S.eyebrow}</span>
          <h2>{S.title}</h2>
          <ul className="au-points">{S.points.map((t) => <li key={t}><Ic n="check" s={16} />{t}</li>)}</ul>
        </div>
        <div className="au-float" aria-hidden="true">
          <div className="au-mini a">
            <div className="au-mh"><b>Transaction review</b><em>Awaiting approval</em></div>
            <div className="au-mr"><span>Salary received</span><b className="g">+ PKR 45,000</b></div>
            <div className="au-mr"><span>Groceries</span><b>− PKR 2,500</b></div>
          </div>
          <div className="au-mini b">
            <div className="au-mh"><b>Europe Trip</b><em className="ok">40%</em></div>
            <div className="au-bar"><i /></div>
          </div>
          <small>Illustrative sample</small>
        </div>
      </aside>

      <div className="au-main">
        <div className={"au-card" + (wide ? " wide" : "")}>
          <div className="au-head">
            <span className="au-ico"><Ic n={icon} s={22} /></span>
            <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
          </div>
          {children}
        </div>
        {footer && <p className="au-foot">{footer}</p>}
        <p className="au-priv"><Ic n="shield" s={14} /> Your data stays private to your account.</p>
      </div>
    </section>
  );
}

export const AuthLink = ({ to, children }) => <Link to={to} className="au-link">{children}</Link>;

export function AuthAlert({ children }) {
  return <div className="au-alert" role="alert"><Ic n="alert" s={18} /><span>{children}</span></div>;
}

/** Labelled field with a leading icon and, for passwords, a show/hide toggle. */
export function Field({ label, icon, hint, required, type = "text", className = "", ...props }) {
  const [show, setShow] = React.useState(false);
  const isPw = type === "password";
  return (
    <label className={"au-f " + className}>
      <span className="au-lab">{label}{required && <i> *</i>}</span>
      <span className="au-in">
        {icon && <Ic n={icon} s={18} />}
        <input type={isPw && show ? "text" : type} required={required} {...props} className={isPw ? "au-pw" : undefined} />
        {isPw && (
          <button type="button" className="au-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
            <Ic n={show ? "eyeoff" : "eye"} s={18} />
          </button>
        )}
      </span>
      {hint && <span className="au-hint">{hint}</span>}
    </label>
  );
}
