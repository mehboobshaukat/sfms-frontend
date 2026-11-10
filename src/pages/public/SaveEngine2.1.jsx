import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Ic } from "./sfmsUi";
import SfmsEngine, { VB, PORTS, STEPS, OUT_STEP, DONE_STEP, CYCLE } from "./SfmsEngine";
import "./SaveEngine.css";

/* ===========================================================================
   "What happens when you press save" stage.
   Command panel  ->  SFMS Engine (animated processor)  ->  Updated Records

   `items` is a list of [name, "what you record", [[label, value, "up" | "dn" | ""], ...]].
   One cycle per item: the command streams into the engine, the engine's parts talk to each other step by
   step (see STEPS in SfmsEngine.jsx), the results stream out, and only then do the record cards appear.
   The next item starts by itself; clicking a command jumps straight to it.
   =========================================================================== */

const CMD_META = [["tx", "rd"], ["sync", "bl"], ["arrow", "gn"], ["undo", "rd"]];      // [icon, tint] for each command
const ACCENT = { b: "#2f7bff", g: "#12b886", p: "#7c5cff", o: "#f59e0b", c: "#17c8f2" };   // card colours = colours of the engine parts
const prefer = (label) => (/balance/i.test(label) ? "b" : /budget/i.test(label) ? "g" : /histor/i.test(label) ? "p" : /loan|status/i.test(label) ? "o" : "c");
const accents = (rows) => { const taken = new Set(); return rows.map(([a]) => { let k = prefer(a); if (taken.has(k)) k = ["b", "g", "p", "o", "c"].find((x) => !taken.has(x)); taken.add(k); return k; }); };
const rowIcon = (label) => (/balance/i.test(label) ? "wallet" : /budget/i.test(label) ? "chart" : /histor/i.test(label) ? "history" : /remaining/i.test(label) ? "sync" : /status/i.test(label) ? "loan" : "check");

// element position inside the stage from layout offsets (ignores CSS transforms, so animating cards are measured where they will rest)
const offsetIn = (el, root) => { let x = 0, y = 0; for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
const r1 = (n) => Math.round(n * 10) / 10;

function curve(a, b, mode) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let c1, c2;
  if (mode === "h") { c1 = { x: a.x + dx * 0.5, y: a.y }; c2 = { x: b.x - dx * 0.5, y: b.y }; }
  else if (mode === "v") { c1 = { x: a.x, y: a.y + Math.max(dy, 40) * 0.55 }; c2 = { x: b.x, y: b.y - Math.max(dy, 40) * 0.2 }; }
  else { c1 = { x: a.x, y: a.y + Math.max(dy, 40) * 0.45 }; c2 = { x: b.x + 46, y: b.y }; }          // "sideR": enters a card from its right edge
  const tx = b.x - c2.x, ty = b.y - c2.y, m = Math.hypot(tx, ty) || 1, ux = tx / m, uy = ty / m;
  const head = `${r1(b.x)},${r1(b.y)} ${r1(b.x - ux * 11 - uy * 6)},${r1(b.y - uy * 11 + ux * 6)} ${r1(b.x - ux * 11 + uy * 6)},${r1(b.y - uy * 11 - ux * 6)}`;
  return { a, b, head, d: `M${r1(a.x)} ${r1(a.y)}C${r1(c1.x)} ${r1(c1.y)} ${r1(c2.x)} ${r1(c2.y)} ${r1(b.x)} ${r1(b.y)}` };
}

export default function SaveEngine({ items }) {
  const stage = useRef(), panel = useRef(), core = useRef(), cmdRefs = useRef([]), outRefs = useRef([]);
  const [fx, setFx] = useState(0), [phase, setPhase] = useState(-1), [live, setLive] = useState(false), [replay, setReplay] = useState(0), [geo, setGeo] = useState(null);
  const reduce = useRef(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [name, rec, rows] = items[fx], acc = accents(rows), run = `${fx}-${replay}`;
  const showCards = reduce.current || phase >= DONE_STEP;

  // timeline: walk the engine through its steps, then move on to the next command
  useEffect(() => {
    if (reduce.current) { setPhase(DONE_STEP); return undefined; }
    if (!live) { setPhase(-1); return undefined; }
    let i = 0, t;
    setPhase(0);
    const next = () => {
      i += 1;
      if (i < STEPS.length) { setPhase(i); t = setTimeout(next, STEPS[i].ms); }
      else setFx((f) => (f + 1) % items.length);
    };
    t = setTimeout(next, STEPS[0].ms);
    return () => clearTimeout(t);
  }, [fx, live, replay, items.length]);

  useEffect(() => {                                                // only run while enough of it is on screen; start from the top on entry
    const el = stage.current;
    if (!el || typeof IntersectionObserver !== "function") { setLive(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting && (e.intersectionRatio >= 0.25 || e.intersectionRect.height >= 280)), { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (live) setReplay((r) => r + 1); }, [live]);

  useLayoutEffect(() => {                                          // wires: measured from the real layout so they always meet the cards
    const el = stage.current;
    if (!el) return undefined;
    const measure = () => {
      const item = cmdRefs.current[fx], outs = outRefs.current;
      if (!item || !core.current || !panel.current || outs.length !== 3 || !outs.every(Boolean)) return;
      const stacked = window.matchMedia("(max-width: 1020px)").matches;
      const E = offsetIn(core.current, el), I = offsetIn(item, el), PN = offsetIn(panel.current, el), O = outs.map((o) => offsetIn(o, el));
      const port = ([x, y]) => ({ x: E.x + (E.w * (x - VB.x)) / VB.w, y: E.y + (E.h * (y - VB.y)) / VB.h });
      const nets = [stacked ? curve({ x: PN.x + 34, y: PN.y + PN.h }, port(PORTS.in), "v") : curve({ x: I.x + I.w, y: I.y + I.h / 2 }, port(PORTS.in), "h")];
      O.forEach((o, i) => nets.push(stacked ? curve(port(PORTS.out[i]), { x: o.x + o.w, y: o.y + o.h / 2 }, "sideR") : curve(port(PORTS.out[i]), { x: o.x, y: o.y + o.h / 2 }, "h")));
      setGeo({ w: el.offsetWidth, h: el.offsetHeight, nets });
    };
    measure();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    document.fonts?.ready.then(measure);
    return () => ro?.disconnect();
  }, [fx]);

  const jump = (i) => { setFx(i); setReplay((r) => r + 1); };
  const step = STEPS[phase];

  return (
    <div className="eg-stage" ref={stage} data-run={live && !reduce.current ? "1" : "0"} style={{ "--cycle": `${CYCLE}ms` }}>
      {/* streams between the command panel, the engine and the record cards */}
      <svg className="eg-links" viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : "0 0 10 10"} aria-hidden="true">
        {geo && (
          <>
            <g className={"eg-stream" + (phase === 0 ? " hot" : "")}>
              <path className="eg-s-glow" d={geo.nets[0].d} /><path className="eg-s-base" d={geo.nets[0].d} /><path className="eg-s-flow" d={geo.nets[0].d} />
              <polygon className="eg-s-head" points={geo.nets[0].head} />
            </g>
            {geo.nets.slice(1).map((n, i) => (
              <g key={i} className={"eg-o" + (phase >= OUT_STEP ? " lit" : "")} style={{ "--c": ACCENT[acc[i]] }}>
                <path className="eg-o-line" d={n.d} />
                <polygon className="eg-o-head" points={n.head} />
                {phase === OUT_STEP && <path key={`c${run}${phase}`} className="eg-o-comet" pathLength="1" d={n.d} style={{ "--d": `${260 + i * 140}ms` }} />}
              </g>
            ))}
          </>
        )}
      </svg>

      <section className="eg-panel eg-cmd" ref={panel}>
        <h3>Command</h3>
        <div className="eg-cmds" role="group" aria-label="Choose a transaction">
          {items.map(([n], i) => (
            <button key={n} ref={(el) => { cmdRefs.current[i] = el; }} className={"eg-c" + (i === fx ? " on" : "")} onClick={() => jump(i)} aria-pressed={i === fx}>
              <span className={"eg-tile " + CMD_META[i % CMD_META.length][1]}><Ic n={CMD_META[i % CMD_META.length][0]} s={20} /></span>
              <b>{n}</b>
              {i === fx && <i className="eg-bar" key={run} />}
            </button>
          ))}
        </div>
        <div className="eg-rec" key={run}><small>You record</small><code><i>›</i>{rec}</code></div>
      </section>

      <div className="eg-core">
        <div className="eg-engine-wrap" ref={core}><SfmsEngine phase={phase} /></div>
        <div className={"eg-cap" + (phase >= DONE_STEP ? " ok" : "")} key={phase}>
          <i /><span>{step ? step.cap : "Waiting for a command"}</span>
          {phase >= 0 && phase < DONE_STEP && <small>{phase + 1}/{DONE_STEP}</small>}
        </div>
      </div>

      <section className="eg-panel eg-rec-p">
        <h3>Updated Records</h3>
        <div className="eg-recs" key={run}>
          {rows.map(([a, b, k], i) => (
            <div className={"eg-rc " + (k || "nu") + (showCards ? " show" : "")} key={a} style={{ "--i": i, "--c": ACCENT[acc[i]] }} ref={(el) => { outRefs.current[i] = el; }}>
              <span className="eg-ri"><Ic n={rowIcon(a)} s={20} /></span>
              <span className="eg-rl">{a}</span><b>{b}</b>
              <i className="eg-ok"><Ic n="check" s={11} /></i>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
