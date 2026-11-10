import { Fragment, useEffect, useRef, useState } from "react";
import Seo from "../../components/Seo";
import logo from "../assets/SFMS_logo_transparent.png"; // adjust path to where you keep the logo
import GridBackdrop from "../../components/ui/GridBackdrop";
import { FlipCard, CtaHIW, SingleStartLink } from "./sfmsUi";
import "./common.css";
import "./Home.css";

const P = {
  arrow: "M5 12h14M13 6l6 6-6 6", check: "M5 12.5l4.5 4.5L19 7", plus: "M12 5v14M5 12h14",
  tx: "M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6",
  loan: "M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.2-4 3 1.8 2.6 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3",
  card: "M3 6h18v12H3zM3 10h18M7 15h4", pie: "M12 3v9h9A9 9 0 1 1 12 3zM15 3.5A9 9 0 0 1 20.5 9H15z",
  goal: "M12 21a9 9 0 1 1 9-9M12 16a4 4 0 1 1 4-4M12 12l7-7M17 5h2v2", undo: "M4 9h10a5 5 0 0 1 0 10H8M8 5L4 9l4 4",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", lock: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  db: "M5 6c0-1.7 3-3 7-3s7 1.3 7 3-3 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", play: "M8 5l11 7-11 7z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6", menu: "M4 7h16M4 12h16M4 17h16",
  rupee: "M7 5h10M7 9h10M7 5c5 0 7 1.5 7 4s-2 4-7 4l6 6",
};
const Ic = ({ n, s = 22 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
);

const STRIP = [["rupee", "Track every rupee", "Know exactly where your money goes."], ["pie", "Budget live", "Stay on track, every day."], ["goal", "Goal progress", "Turn dreams into reality."], ["shield", "Secure access", "Your data, always protected."]];
const FEATURES = [
  ["tx", "Transaction tracking", "Track all your income and expenses, automatically or manually.", "Latest entries", [["Salary", "+₹80,000"], ["Zomato", "−₹520"], ["Amazon", "−₹2,450"]]],
  ["loan", "Loan tracking", "Manage personal loans and EMIs with repayment reminders.", "Next EMI", [["Due in", "6 days"], ["EMI", "₹8,200"], ["Remaining", "₹46,000"]]],
  ["card", "Credit purchases", "Keep track of credit purchases and pending payments.", "Pending", [["Open bills", "3"], ["Total due", "₹12,750"], ["Next payment", "28 Apr"]]],
  ["pie", "Live budgets", "Set monthly budgets and watch your spending in real time.", "This month", [["Food & Dining", "78%"], ["Transport", "64%"], ["Shopping", "48%"]]],
  ["goal", "Savings goals", "Plan and track your financial goals, big or small.", "Goals", [["Buy a Car", "56%"], ["Europe Trip", "40%"], ["Emergency fund", "72%"]]],
  ["undo", "History & undo", "See your full history and undo mistakes in one click.", "Recent activity", [["Edited budget", "2 min ago"], ["Deleted entry", "1 h ago"], ["Undo window", "30 days"]]],
];
const STEPS = [["user", "Create your account", "Sign up in seconds and set up your secure profile."], ["card", "Add your finances", "Track income, expenses, loans and credit purchases."], ["goal", "Set budgets & goals", "Create monthly budgets and set your financial goals."], ["pie", "Stay in control", "Get insights and make smarter financial decisions."]];
const BUDGETS = [["Food & Dining", "₹7,800 / ₹10,000", 78, "#1565ff"], ["Transport", "₹3,200 / ₹5,000", 64, "#17c8f2"], ["Shopping", "₹2,400 / ₹5,000", 48, "#10b981"], ["Bills & Utilities", "₹4,100 / ₹5,000", 82, "#f5a524"]];
const SEC = [["lock", "Secure sign-in", "Multi-factor authentication and encrypted access."], ["shield", "Verified access", "Only you can open your financial data."], ["db", "Data integrity", "Accurate, consistent and always backed up."], ["eye", "Transparent history", "Full activity logs so nothing happens unseen."]];
// Sample testimonial content for the UI. Replace these examples with verified customer feedback before production.
const REVIEWS = [
  { name: "Priya M.", role: "Student", quote: "SFMS helped me finally get control of my spending. The budgeting tools make it easier to plan my month.", avatar: 47 },
  { name: "Rahul S.", role: "Freelancer", quote: "I love how simple and clean it is. Tracking my loans and goals has never been easier. Everything is in one place.", avatar: 12 },
  { name: "Ananya K.", role: "Working professional", quote: "A helpful way to keep everyday finances organized. I can review my spending without juggling separate notes.", avatar: 32 },
  { name: "Omar H.", role: "Small business owner", quote: "Having income, expenses and pending payments together gives me a clearer picture of my cash flow.", avatar: 13 },
  { name: "Sana R.", role: "Teacher", quote: "Monthly budgets help me plan ahead and notice when a category is getting close to its limit.", avatar: 44 },
  { name: "Hamza A.", role: "Software developer", quote: "The transaction history is useful when I need to review an entry or understand a change I made.", avatar: 68 },
  { name: "Ayesha F.", role: "Consultant", quote: "I like having savings goals and day-to-day spending in one straightforward view.", avatar: 49 },
  { name: "Bilal T.", role: "Accountant", quote: "The organized records make my regular money reviews feel more structured and less stressful.", avatar: 59 },
  { name: "Mariam N.", role: "Graduate student", quote: "SFMS helps me see my habits more clearly and think about what I can set aside for later.", avatar: 25 },
];
const FAQ = [
  ["Is SFMS free to use?", "Yes. You can start for free, and no credit card is required."],
  ["Is my financial data private?", "Your data is tied to your account, protected with encrypted access, and visible only to you."],
  ["Can I undo a mistake?", "Yes. History keeps every change for 30 days, so you can restore a deleted entry or undo an edit."],
  ["Can I track loans and credit purchases?", "Yes. Track money you lend or borrow, EMIs, and items bought or given on credit, with reminders for what is pending."],
  ["Does it work on my phone?", "Yes. The layout adapts to every screen size, from phones to desktops."],
];
const WORDS = ["Healthier", "Smarter", "Stronger"];

function Count({ to, suf }) {
  const [v, setV] = useState(0), ref = useRef();
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      const t0 = performance.now();
      const f = (t) => { const p = Math.min((t - t0) / 1400, 1); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    o.observe(ref.current);
    return () => o.disconnect();
  }, [to]);
  return <span ref={ref}>{v.toFixed(Number.isInteger(to) ? 0 : 1)}{suf}</span>;
}

const Stars = () => <span className="stars" role="img" aria-label="Rated 5 out of 5">{[0, 1, 2, 3, 4].map((i) => <Ic key={i} n="star" s={16} />)}</span>;

const QuoteMark = ({ id }) => (
  <svg className="review-quote-mark" viewBox="0 0 28 20" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2f9bff" /><stop offset="1" stopColor="#1565ff" /></linearGradient></defs>
    <path fill={`url(#${id})`} d="M2.2 15.2C2.2 8.6 5.6 4.6 11.2 3l1 2.4C9.4 6.4 8 8.2 7.6 10.4A5 5 0 1 1 2.2 15.2zM16.7 15.2c0-6.6 3.4-10.6 9-12.2l1 2.4c-2.8 1-4.2 2.8-4.6 5A5 5 0 1 1 16.7 15.2z" />
  </svg>
);

/* ---------- Velvet-rope links between neighbouring testimonial cards ----------
   Three ropes per pair (the middle one is the biggest). Each sags slightly in the centre and is
   held at both ends by two interlocked golden rings (one from the card, one from the rope), all tucked behind the cards. Purely decorative; sizing and spacing live in the CSS. */
const ROPES = [["top", 20, "M0 12Q50 24 100 12"], ["mid", 47, "M0 12Q50 32 100 12"], ["low", 74, "M0 12Q50 24 100 12"]];
const RopeSet = ({ side, innerRef }) => (
  <span className={`review-ropes${side}`} ref={innerRef} aria-hidden="true">
    {ROPES.map(([size, at, d]) => (
      <span className={`review-rope ${size}`} style={{ "--at": `${at}%` }} key={size}>
        <i className="rope-cap l" /><i className="rope-link l"><b /></i>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none">
          {["rp-base", "rp-body", "rp-shade", "rp-fibre", "rp-hi"].map((k) => <path key={k} className={k} d={d} />)}
        </svg>
        <i className="rope-cap r" /><i className="rope-link r"><b /></i>
      </span>
    ))}
  </span>
);

/* ---------- Animated dotted wave ribbon (replaces the old dot pattern) ----------
   A twisting sheet of dots drawn on <canvas>. Each card owns its own timeline (`s.t`):
   - active card  -> requestAnimationFrame loop advances the wave + blue hue drift
   - other cards  -> one static frame, loop stopped, timeline frozen
   When a card becomes active again it resumes from the exact frame it stopped on. */
const RIBBON_U = 96, RIBBON_V = 15;
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

function paintRibbon(ctx, { t, w, h, dpr }) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const dot = Math.max(1, w / 250);         // keeps dot size proportional to the layer
  const dots = [];
  for (let i = 0; i < RIBBON_U; i++) {
    const u = i / (RIBBON_U - 1);
    const sweep = u * u * (3 - 2 * u);        // S-curve: starts above the card's top edge, ends past its right edge
    const pin = smooth(0.08, 0.45, u) * smooth(0, 0.3, 1 - u);   // both ends stay pinned to the edges, the middle waves
    const x0 = w * (0.04 + 1.1 * u);
    const yc = h * (-0.36 + 0.84 * sweep + pin * (0.07 * Math.sin(u * Math.PI * 2.4 - t * 1.15) + 0.03 * Math.sin(u * Math.PI * 4.6 + t * 1.7)));
    const twist = u * Math.PI * 1.6 - t * 0.9, cosT = Math.cos(twist), sinT = Math.sin(twist);
    const hw = h * (0.22 + 0.08 * Math.sin(u * Math.PI));
    const hue = 218 + 30 * Math.sin(t * 0.7 + u * 2.4);   // drifts between cyan-blue and indigo-blue only
    for (let j = 0; j < RIBBON_V; j++) {
      const v = (j / (RIBBON_V - 1)) * 2 - 1, z = v * sinT, depth = (z + 1) / 2;
      dots.push({
        depth, x: x0 + z * w * 0.02, y: yc + v * hw * cosT, r: (0.6 + 0.95 * depth) * dot,
        a: (0.42 + 0.58 * depth) * (1 - 0.35 * Math.abs(v) ** 3), hue, l: 58 + 12 * depth,
      });
    }
  }
  dots.sort((p, q) => p.depth - q.depth);     // far dots first -> gives the sheet its depth
  for (const d of dots) {
    ctx.fillStyle = `hsla(${d.hue.toFixed(0)},92%,${d.l.toFixed(0)}%,${d.a.toFixed(2)})`;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
  }
}

function WaveRibbon({ active, seed }) {
  const canvasRef = useRef(null);
  const timeline = useRef({ t: seed * 1.9, w: 0, h: 0, dpr: 1 });   // persists while the card is inactive

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const s = timeline.current;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0, visible = true;

    const fit = () => {
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = canvas.offsetWidth; s.h = canvas.offsetHeight;              // layout size, unaffected by CSS scale()
      canvas.width = Math.round(s.w * s.dpr); canvas.height = Math.round(s.h * s.dpr);
      paintRibbon(ctx, s);
    };
    fit();

    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    ro?.observe(canvas);
    const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }) : null;
    io?.observe(canvas);

    if (active && !reduced) {
      const tick = (now) => {
        raf = requestAnimationFrame(tick);
        if (!visible || document.hidden) { last = 0; return; }
        s.t += last ? Math.min((now - last) / 1000, 0.05) : 0;
        last = now;
        paintRibbon(ctx, s);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); };
  }, [active]);

  return <canvas ref={canvasRef} className="review-ribbon" aria-hidden="true" />;
}


export default function Home() {
  const root = useRef(), hero = useRef(), tilt = useRef();
  const [word, setWord] = useState(0), [reviewIndex, setReviewIndex] = useState(1), [faq, setFaq] = useState(0);
  const reviewViewport = useRef(null), reviewCardRefs = useRef([]), reviewRopeRefs = useRef([]), activeReviewRef = useRef(1);
  const reviewPaused = useRef(false), reviewScrollTimer = useRef(null), reviewScrollGoal = useRef(null);

  useEffect(() => {
    // Reset the pointer spotlight whenever the active card changes.
    reviewCardRefs.current.forEach((card) => {
      if (!card) return;
      card.style.removeProperty("--mouse-x");
      card.style.removeProperty("--mouse-y");
    });
  }, [reviewIndex]);

  useEffect(() => {
    const el = root.current;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
    el.querySelectorAll(".rv").forEach((n) => io.observe(n));
    const sc = () => {
      el.style.setProperty("--p", window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
    };
    sc();
    window.addEventListener("scroll", sc, { passive: true });
    const t1 = setInterval(() => setWord((w) => (w + 1) % 3), 2600);
    return () => { io.disconnect(); window.removeEventListener("scroll", sc); clearInterval(t1); };
  }, []);

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

  // Circular carousel. Cards keep their DOM order, but flex `order` is re-assigned so the card in
  // view always sits in the middle of a ring: the next/previous card is then always an immediate
  // neighbour, so after the last card the first one slides in from the right instead of the list
  // scrolling all the way back. The re-ordering is invisible because the card in view is held at
  // the same screen position while it happens.
  const nearestReview = () => {
    const viewport = reviewViewport.current;
    let closest = activeReviewRef.current;
    if (!viewport) return closest;
    const center = viewport.scrollLeft + viewport.clientWidth / 2;
    let distance = Infinity;
    reviewCardRefs.current.forEach((card, i) => {
      if (!card) return;
      const nextDistance = Math.abs(center - (card.offsetLeft + card.clientWidth / 2));
      if (nextDistance < distance) { distance = nextDistance; closest = i; }
    });
    return closest;
  };

  const recenterReviewRing = (anchor) => {
    const viewport = reviewViewport.current, cards = reviewCardRefs.current, card = cards[anchor];
    if (!viewport || !card) return;
    const count = REVIEWS.length, mid = Math.floor(count / 2);
    if (card.style.order === String(mid * 2)) return;
    const before = card.offsetLeft - viewport.scrollLeft;
    cards.forEach((node, i) => {
      const pos = (i - anchor + mid + count) % count;
      if (node) node.style.order = String(pos * 2);
      const rope = reviewRopeRefs.current[i];      // the ropes that follow card i
      if (rope) rope.style.order = String(pos * 2 + 1);
    });
    viewport.scrollTo({ left: Math.max(0, card.offsetLeft - before), behavior: "instant" });
  };

  const goToReview = (index, motion = "smooth") => {
    const next = (index + REVIEWS.length) % REVIEWS.length;
    activeReviewRef.current = next;
    setReviewIndex(next);
    const viewport = reviewViewport.current;
    const card = reviewCardRefs.current[next];
    if (!viewport || !card) return;
    const track = card.parentElement;
    if (track) track.style.paddingInline = `${Math.max(0, (viewport.clientWidth - card.clientWidth) / 2)}px`;
    recenterReviewRing(nearestReview());
    const left = card.offsetLeft - (viewport.clientWidth - card.clientWidth) / 2;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    reviewScrollGoal.current = { left: Math.max(0, left), at: performance.now() };
    viewport.scrollTo({ left: Math.max(0, left), behavior: motion === "smooth" && !reduced ? "smooth" : "instant" });
  };

  const handleReviewScroll = () => {
    if (reviewScrollTimer.current) window.clearTimeout(reviewScrollTimer.current);
    reviewScrollTimer.current = window.setTimeout(() => {
      const viewport = reviewViewport.current;
      if (!viewport) return;
      const goal = reviewScrollGoal.current;
      // A requested slide is still gliding (e.g. a slow frame delayed the scroll events): wait for it
      // to land before settling, otherwise re-ordering the ring would cut the slide short.
      if (goal && performance.now() - goal.at < 1600 && Math.abs(viewport.scrollLeft - goal.left) > 2) { handleReviewScroll(); return; }
      reviewScrollGoal.current = null;
      const closest = nearestReview();
      activeReviewRef.current = closest;
      setReviewIndex((current) => current === closest ? current : closest);
      recenterReviewRing(closest);   // keeps the ring endless for swipes/drags too
    }, 110);
  };

  const handleReviewMouseMove = (e) => {
    const card = e.currentTarget;
    // Only the active card reacts to the pointer.
    if (!card.classList.contains("on")) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const initialFrame = window.requestAnimationFrame(() => goToReview(activeReviewRef.current, "auto"));
    const onResize = () => goToReview(activeReviewRef.current, "auto");
    window.addEventListener("resize", onResize, { passive: true });
    const interval = reduced ? null : window.setInterval(() => {
      if (reviewPaused.current || document.visibilityState === "hidden") return;
      goToReview(activeReviewRef.current + 1);
    }, 5200);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.removeEventListener("resize", onResize);
      if (interval) window.clearInterval(interval);
      if (reviewScrollTimer.current) window.clearTimeout(reviewScrollTimer.current);
    };
  }, []);

  return (
    <div className="sfms-home" ref={root} onMouseMove={move}>
      <Seo path="/" />
      <div className="prog" />
      <div className="glow" />

      <section className="hero" id="top" ref={hero} onMouseLeave={() => tilt.current && (tilt.current.style.transform = "")}>
        <div className="wrap hgrid">
          <div className="rv">
            <span className="tag">Your complete finance companion</span>
            <h1>One system for<br />a <span className="word grad" key={word}>{WORDS[word]}</span> Financial You</h1>
            <p className="lead">Track income, expenses, loans, credit purchases, budgets and goals, all in one place with SFMS.</p>
            <div className="cta">
              <SingleStartLink className="btn pri lg" outClass="btn out lg" free />
              <a className="btn out lg" href="#how"><Ic n="play" s={16} /> See how it works</a>
            </div>
            <div className="ticks">{["Free to start", "No credit card required", "Your data stays private"].map((t) => <span key={t}><Ic n="check" s={16} />{t}</span>)}</div>
          </div>

          <div className="hvis rv" style={{ "--d": ".15s" }}>
            <div className="dash-wrap" ref={tilt}>
              <div className="chip c1"><Ic n="pie" s={16} /> Savings <b>+12%</b></div>
              <div className="chip c2"><Ic n="goal" s={16} /> Europe Trip <b>40%</b></div>
              <img className="emblem" src={logo} alt="" />
              <div className="dash">
                <aside><img src={logo} alt="" />{["pie", "tx", "card", "goal", "loan"].map((n) => <i key={n}><Ic n={n} s={16} /></i>)}</aside>
                <div className="dmain">
                  <div className="dtop"><div><b>Good morning, Alex</b><small>Here is your financial overview</small></div><span>This month</span></div>
                  <div className="stats3">
                    {[["Total balance", "₹1,24,500", "+12%", "g"], ["Total income", "₹80,000", "+8%", "g"], ["Total expenses", "₹32,400", "−5%", "r"]].map(([a, b, c, k]) => (
                      <div className="st" key={a}>{a}<b>{b}</b><em className={k}>{c}</em></div>
                    ))}
                  </div>
                  <div className="drow">
                    <div className="box"><b>Spending overview</b>
                      <div className="bars">{[40, 28, 34, 58, 30, 26].map((h, i) => <i key={i} style={{ "--h": h + "%", "--i": i }} />)}</div>
                    </div>
                    <div className="box"><b>Expense by category</b>
                      <div className="donut"><b>₹32,400</b></div>
                    </div>
                  </div>
                  <div className="box">
                    {[["Z", "Zomato", "Food & Dining", "−₹520", "r"], ["S", "Salary", "Income", "+₹80,000", "g"], ["A", "Amazon", "Shopping", "−₹2,450", "r"]].map(([l, a, b, c, k]) => (
                      <div className="tx" key={a}><i>{l}</i><div>{a}<small>{b}</small></div><span className={k}>{c}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="strip"><div className="wrap">
        {STRIP.map(([n, t, d], i) => <div className="tr rv" key={t} style={{ "--d": i * 0.08 + "s" }}><span className="ico"><Ic n={n} /></span><div><b>{t}</b><small>{d}</small></div></div>)}
      </div></div>

      <section className="stats"><GridBackdrop tone={0.85} /><div className="wrap rv">
        {[[10, "K+", "Active users"], [50, "L+", "Transactions tracked"], [99.9, "%", "Uptime"], [4.9, "/5", "Average rating"]].map(([n, s, l]) => (
          <div key={l}><b><Count to={n} suf={s} /></b><small>{l}</small></div>
        ))}
      </div></section>

      <section className="sec" id="features"><div className="wrap">
        <div className="sh rv"><span className="tag">Powerful features</span><h2>Everything you need to manage your money</h2><p>All parts of your personal finance in one simple, elegant system. Hover or tap a card to see live details.</p></div>
        <div className="fgrid">
          {FEATURES.map(([n, t, d, h, rows], i) => (
            <FlipCard key={t} icon={<span className="ico"><Ic n={n} /></span>} title={t} text={d} back={h} rows={rows} delay={(i % 3) * 0.1 + "s"} />
          ))}
        </div>
      </div></section>

      <section className="sec how" id="how"><div className="wrap">
        <div className="sh c rv"><span className="tag">How it works</span><h2>Get started in 4 simple steps</h2></div>
        <div className="steps">
          {STEPS.map(([n, t, d], i) => <div className="step rv" key={t} style={{ "--d": i * 0.12 + "s" }}><div className="sic"><Ic n={n} s={28} /><em>{i + 1}</em></div><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </div></section>

      <section className="sec insights" id="insights"><div className="wrap igrid">
        <div className="rv">
          <span className="tag">Why choose SFMS</span><h2>More than just a finance tracker</h2>
          <p className="mut">SFMS helps you build better money habits, reach your goals and take control of your financial future.</p>
          <ul className="checks">{["All-in-one finance management", "Simple and beautiful interface", "Real-time insights and reports", "Helps you save more and spend smarter", "Designed for individuals and families"].map((t) => <li key={t}><Ic n="check" />{t}</li>)}</ul>
        </div>
        <div className="panel rv" style={{ "--d": ".15s" }}>
          <div>
            <h4>Monthly overview</h4>
            <div className="mini">{[["Income", "₹80,000", "g"], ["Expenses", "₹32,400", "r"], ["Savings", "₹47,600", "g"]].map(([a, b, k]) => <div key={a}>{a}<b className={k}>{b}</b></div>)}</div>
            <svg className="chart" viewBox="0 0 400 130" role="img" aria-label="Income and expenses trend">
              <defs><linearGradient id="sfms-ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1565ff" stopOpacity=".2" /><stop offset="1" stopColor="#1565ff" stopOpacity="0" /></linearGradient></defs>
              <path d="M0 100H400M0 65H400M0 30H400" stroke="#e8eef9" />
              <path d="M0 80C30 55 50 85 80 62S130 50 160 58 210 25 240 45 300 20 330 32 380 15 400 12V130H0Z" fill="url(#sfms-ga)" />
              <path className="ln" pathLength="1" stroke="#1565ff" d="M0 80C30 55 50 85 80 62S130 50 160 58 210 25 240 45 300 20 330 32 380 15 400 12" />
              <path className="ln" pathLength="1" stroke="#10b981" d="M0 105C40 100 60 110 90 98S150 100 180 92 250 95 280 80 350 78 400 60" />
            </svg>
          </div>
          <div>
            <h4>Budget progress</h4>
            {BUDGETS.map(([a, b, w, c]) => <div className="pb" key={a}><div className="ph"><span>{a}</span><span>{w}%</span></div><small>{b}</small><div className="track"><i style={{ "--w": w + "%", "--c": c }} /></div></div>)}
          </div>
        </div>
      </div></section>

      <section className="sec security" id="security"><GridBackdrop /><div className="wrap">
        <div className="sh c rv"><span className="tag">Built for peace of mind</span><h2>Secure. Private. Reliable.</h2><p>Your financial data is sensitive. SFMS uses industry-standard practices to keep it safe and always in your control.</p></div>
        <div className="sgrid rv">{SEC.map(([n, t, d]) => <div className="scard spot" key={t}><span className="ico"><Ic n={n} /></span><h3>{t}</h3><p>{d}</p></div>)}</div>
      </div></section>

      <section className="sec reviews-section" id="reviews">
        <span className="review-blob" aria-hidden="true" />
        <span className="review-orb" aria-hidden="true" />
        <div className="wrap">
          <div className="sh c rv review-heading">
            <span className="tag review-tag">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M5 4h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6.2L8 21.5V18H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" /><path fill="none" stroke="#e3f0ff" strokeWidth="1.7" strokeLinecap="round" d="M8.6 10.4h6.8M9.2 13.3c1.6 1.2 4 1.2 5.6 0" /></svg>
              What our users say
            </span>
            <h2>Trusted by <span className="grad">thousands</span></h2>
            <p>Real people. Real results. Here&rsquo;s what our users have to say about SFMS and how it has helped them take control of their finances.</p>
          </div>

          <div
            className="review-carousel rv"
            style={{ "--review-count": REVIEWS.length }}
            onMouseEnter={() => { reviewPaused.current = true; }}
            onMouseLeave={() => { reviewPaused.current = false; }}
            onFocusCapture={() => { reviewPaused.current = true; }}
            onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) reviewPaused.current = false; }}
            onTouchStart={() => { reviewPaused.current = true; }}
            onTouchEnd={() => { reviewPaused.current = false; }}
          >
            <button className="review-arrow prev" type="button" aria-label="Previous testimonial" onClick={() => goToReview(activeReviewRef.current - 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>

            <div className="review-viewport" ref={reviewViewport} onScroll={handleReviewScroll} tabIndex={0} role="region" aria-label="Customer testimonials. Scroll horizontally to browse reviews.">
              <div className="review-track">
                {REVIEWS.map((review, i) => (
                  <Fragment key={review.name}>
                  <article
                    ref={(node) => { reviewCardRefs.current[i] = node; }}
                    className={`rc${reviewIndex === i ? " on" : ""}`}
                    aria-label={`Testimonial ${i + 1} of ${REVIEWS.length}`}
                    aria-current={reviewIndex === i ? "true" : undefined}
                    onMouseMove={handleReviewMouseMove}
                    onClick={() => goToReview(i)}
                  >
                    {/* Artwork: pale/vivid blue base, white curved panel, layered waves */}
                    <div className="review-vivid" aria-hidden="true" />
                    <svg className="review-art" viewBox="0 0 560 320" preserveAspectRatio="none" aria-hidden="true">
                      <path className="art-panel" d="M0 0H262C352 0 414 48 414 128C414 188 372 214 336 252C318 272 298 306 270 320H0Z" />
                      <path className="art-wave w1" d="M150 320C226 316 270 278 346 276C418 274 470 244 560 224V320Z" />
                      <path className="art-wave w2" d="M268 320C330 312 372 288 430 290C482 292 524 280 560 262V320Z" />
                      <path className="art-wave w3" d="M440 320C490 316 530 300 560 280V320Z" />
                    </svg>

                    {/* Animated dotted wave layer (animates only while this card is active) */}
                    <WaveRibbon active={reviewIndex === i} seed={i} />

                    <div className="review-card-content">
                      <QuoteMark id={`sfms-q-${i}`} />
                      <blockquote>{review.quote}</blockquote>
                      <footer className="review-person">
                        <span className="avatar sm">
                          <span className="avatar-fb" aria-hidden="true">{review.name.split(" ").map((part) => part[0]).join("")}</span>
                          <img className="avatar-img" src={`https://i.pravatar.cc/180?img=${review.avatar}`} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        </span>
                        <span className="review-person-copy">
                          <strong>{review.name}</strong>
                          <small>{review.role}</small>
                          <Stars />
                        </span>
                      </footer>
                    </div>

                    {/* Large featured portrait: only visible on the active card */}
                    <span className="avatar lg" aria-hidden="true">
                      <span className="avatar-ring" />
                      <span className="avatar-fb">{review.name.split(" ").map((part) => part[0]).join("")}</span>
                      <img className="avatar-img" src={`https://i.pravatar.cc/180?img=${review.avatar}`} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    </span>
                  </article>
                  <RopeSet side={reviewIndex === i ? " near-l" : reviewIndex === (i + 1) % REVIEWS.length ? " near-r" : ""} innerRef={(node) => { reviewRopeRefs.current[i] = node; }} />
                  </Fragment>
                ))}
              </div>
            </div>

            <button className="review-arrow next" type="button" aria-label="Next testimonial" onClick={() => goToReview(activeReviewRef.current + 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>

            <div className="review-controls" aria-label="Choose a testimonial">
              <div className="review-pagination">
                {REVIEWS.map((review, i) => (
                  <button key={review.name} type="button" className={`review-dot${reviewIndex === i ? " active" : ""}`} aria-label={`Show testimonial ${i + 1}`} aria-pressed={reviewIndex === i} onClick={() => goToReview(i)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

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
        <CtaHIW title="Start your financial journey with SFMS today" text="Free to start. No credit card required. Set up in minutes." />
      </div></section>

    </div>
  );
}
