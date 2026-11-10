import logo from "../assets/SFMS_logo_transparent.png"; // same path the other pages use for the logo

/* ===========================================================================
   SFMS Engine: an animated isometric "processor" board.

   - One affine projection (O, U, V) puts every part on the same board plane, so chips, pins, arrows,
     labels and the glass cover all share one perspective, like the reference artwork.
   - The component is purely presentational: it is told which STEP of the processing cycle is running
     (`phase`) and lights up the chips and data paths that take part in that step.
   - STEPS is also the single source of truth for the order in which the components talk to each other:
     fetch -> decode -> cache check -> load operands -> read memory -> execute -> write back -> output.
   =========================================================================== */

export const VB = { x: 34, y: 22, w: 672, h: 508 };            // visible part of the drawing (empty margins cropped)
const O = [70, 262], U = [3.4, -1.75], V = [2.5, 2.4];      // plane origin + screen vectors of one board unit along u / v
const LEN = Math.hypot(U[0], U[1]);
const pt = (u, v, z = 0) => [O[0] + u * U[0] + v * V[0], O[1] + u * U[1] + v * V[1] - z];
const P = (pts) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
const plane = (z = 0) => `translate(0 ${-z}) matrix(${U[0]} ${U[1]} ${V[0]} ${V[1]} ${O[0]} ${O[1]})`;   // draw in board units (u, v) at height z

// processor parts: footprint on the board (u0..u1, v0..v1) and colours (taken from the reference image)
const CHIPS = {
  cache: { name: "Cache Memory", u: [35, 59], v: [6, 27], color: "#2f7bff", dark: "#0f3190", glow: "#4da8ff", top: ["#2556d6", "#0f2a78"], icon: "cache" },
  alu: { name: "ALU", sub: "Arithmetic Logic Unit", u: [72, 92], v: [16, 44], color: "#f59e0b", dark: "#8f5200", glow: "#ffb83d", top: ["#c27806", "#6a3a00"], icon: "alu" },
  ctl: { name: "Control Unit", u: [40, 60], v: [38, 58], color: "#22d3ee", dark: "#15304d", glow: "#6be6ff", top: ["#27415f", "#0e1d38"], icon: "cpu" },
  reg: { name: "Registers", u: [10, 30], v: [42, 64], color: "#12b886", dark: "#07523f", glow: "#34e0a8", top: ["#12936b", "#07402f"], icon: "reg" },
  mem: { name: "Main Memory", u: [36, 58], v: [68, 90], color: "#7c5cff", dark: "#2a1a80", glow: "#a58bff", top: ["#5a3fe0", "#241570"], icon: "mem" },
  io: { name: "I/O Interface", u: [72, 92], v: [60, 82], color: "#9fb3d1", dark: "#334257", glow: "#d6e4fa", top: ["#66788f", "#2a3648"], icon: "io" },
};
const CHIP_ORDER = Object.keys(CHIPS).sort((a, b) => (CHIPS[a].v[0] + CHIPS[a].v[1] - CHIPS[a].u[0] - CHIPS[a].u[1]) - (CHIPS[b].v[0] + CHIPS[b].v[1] - CHIPS[b].u[0] - CHIPS[b].u[1]));   // far -> near

// data paths between parts, in board units
const PATHS = {
  "buf-ctl": { pts: [[24, 25], [29, 25], [29, 34], [35, 34], [35, 46], [36.4, 46]], color: "#38bdf8" },
  "ctl-cache": { pts: [[46, 35.6], [46, 31]], color: "#e8f3ff" },
  "cache-ctl": { pts: [[53, 31], [53, 35.6]], color: "#7dd3fc" },
  "ctl-reg": { pts: [[36.2, 51], [31.8, 51]], color: "#34e0a8" },
  "reg-mem": { pts: [[20, 68], [20, 80], [32.2, 80]], color: "#34e0a8" },
  "mem-ctl": { pts: [[53, 66.2], [53, 62]], color: "#22d3ee" },
  "ctl-alu": { pts: [[61.6, 42], [68.2, 42]], color: "#ffb83d" },
  "alu-ctl": { pts: [[68.2, 37.5], [61.6, 37.5]], color: "#ffd27a" },
  "ctl-mem": { pts: [[46, 62], [46, 66.2]], color: "#a58bff" },
  "mem-io": { pts: [[59.6, 77], [68.2, 77]], color: "#a58bff" },
  "alu-io": { pts: [[82, 48], [82, 58.4]], color: "#ffb83d", both: true },
};

// the processing cycle, in the order the parts really talk to each other
export const STEPS = [
  { id: "in", ms: 900, cap: "Command received in the input buffer", chips: ["buf"], paths: [] },
  { id: "dec", ms: 600, cap: "Control unit fetches and decodes it", chips: ["buf", "ctl"], paths: ["buf-ctl"] },
  { id: "chk", ms: 750, cap: "Checking the rules in cache", chips: ["ctl", "cache"], paths: ["ctl-cache", "cache-ctl"] },
  { id: "ld", ms: 600, cap: "Loading accounts and amount into registers", chips: ["ctl", "reg"], paths: ["ctl-reg"] },
  { id: "rd", ms: 700, cap: "Reading balances, loans and budgets from memory", chips: ["reg", "mem"], paths: ["reg-mem"] },
  { id: "ret", ms: 600, cap: "Records sent back to the control unit", chips: ["mem", "ctl"], paths: ["mem-ctl"] },
  { id: "exe", ms: 800, cap: "ALU calculating the new values", chips: ["ctl", "alu"], paths: ["ctl-alu", "alu-ctl"] },
  { id: "wr", ms: 800, cap: "Writing the results back to main memory", chips: ["ctl", "mem"], paths: ["ctl-mem"] },
  { id: "out", ms: 1000, cap: "I/O interface sending the updates out", chips: ["mem", "io", "alu"], paths: ["mem-io", "alu-io"] },
  { id: "done", ms: 3800, cap: "Records updated", chips: ["io"], paths: [] },
];
export const OUT_STEP = STEPS.findIndex((s) => s.id === "out");
export const DONE_STEP = STEPS.length - 1;
export const CYCLE = STEPS.reduce((n, s) => n + s.ms, 0);

// where the outside world plugs into the board (viewBox coordinates)
export const PORTS = { in: pt(0, 25, 1), out: [pt(94.4, 66, 5), pt(94.4, 71, 5), pt(94.4, 76, 5)] };

/* ------------------------------ small drawing helpers ------------------------------ */
const Box = ({ u0, u1, v0, v1, z0 = 0, z1, left, front, top, soft = 0.9 }) => (
  <g strokeLinejoin="round" strokeWidth={soft}>
    <polygon points={P([pt(u0, v0, z0), pt(u0, v1, z0), pt(u0, v1, z1), pt(u0, v0, z1)])} fill={left} stroke={left} />
    <polygon points={P([pt(u0, v1, z0), pt(u1, v1, z0), pt(u1, v1, z1), pt(u0, v1, z1)])} fill={front} stroke={front} />
    <polygon points={P([pt(u0, v0, z1), pt(u1, v0, z1), pt(u1, v1, z1), pt(u0, v1, z1)])} fill={top} stroke={top} />
  </g>
);

const Icon = ({ kind }) => {
  switch (kind) {
    case "cache": return <g>{[-4.2, -1, 2.2].map((y) => <rect key={y} x="-4" y={y} width="8" height="2.3" rx="1.1" />)}</g>;
    case "cpu": return <g><rect x="-3" y="-3" width="6" height="6" rx="1.2" fill="none" stroke="#fff" strokeWidth=".8" /><rect x="-1.2" y="-1.2" width="2.4" height="2.4" rx=".5" />{[-2, 0, 2].map((k) => <g key={k}><rect x={k - .3} y="-4.6" width=".6" height="1.4" /><rect x={k - .3} y="3.2" width=".6" height="1.4" /><rect x="-4.6" y={k - .3} width="1.4" height=".6" /><rect x="3.2" y={k - .3} width="1.4" height=".6" /></g>)}</g>;
    case "reg": return <g>{[-3.4, 0, 3.4].flatMap((x) => [-2.4, 0.4].map((y) => <rect key={`${x}${y}`} x={x - 1.4} y={y - 0.2} width="2.8" height="1.8" rx=".5" />))}</g>;
    case "alu": return <g><path d="M-4 -3.5L0 -3.5L4 0L0 3.5L-4 3.5L-1 0Z" fill="none" stroke="#fff" strokeWidth="1" strokeLinejoin="round" /><circle cx="1.6" cy="0" r="1.1" /></g>;
    case "mem": return <g>{[-4, -0.9, 2.2].map((y) => <g key={y}><rect x="-4" y={y} width="8" height="2.4" rx="1" /><circle cx="2.6" cy={y + 1.2} r=".5" fill="#1a1a40" /></g>)}</g>;
    default: return <g><path d="M-4 -1.6H2.6M2.6 -1.6L.9 -3.2M2.6 -1.6L.9 .1" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 1.8H-2.6M-2.6 1.8L-.9 .2M-2.6 1.8L-.9 3.4" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></g>;
  }
};

function Chip({ id, on }) {
  const c = CHIPS[id], [u0, u1] = c.u, [v0, v1] = c.v, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  const zb = 3.6, zt = 15, m = 1.4;
  const pinsU = Math.round((u1 - u0) / 2.6), pinsV = Math.round((v1 - v0) / 2.6);
  return (
    <g className={"eg-chip" + (on ? " on" : "")} style={{ "--c": c.glow }}>
      <g transform={plane(0)} className="eg-under"><rect x={u0 - 5} y={v0 - 4} width={u1 - u0 + 10} height={v1 - v0 + 10} rx="6" fill={c.glow} filter="url(#egBlur)" /></g>
      <Box u0={u0 - m} u1={u1 + m} v0={v0 - m} v1={v1 + m} z1={zb} left="#0b1430" front="#16254b" top="#0d1838" />
      {Array.from({ length: pinsU }, (_, i) => { const u = u0 + 0.8 + (i * (u1 - u0 - 2.2)) / (pinsU - 1); return <Box key={`f${i}`} u0={u} u1={u + 1.1} v0={v1 + m} v1={v1 + m + 2.2} z1={1.5} left="#b89432" front="url(#egPin)" top="#f6d97a" soft={0.4} />; })}
      {Array.from({ length: pinsV }, (_, i) => { const v = v0 + 0.8 + (i * (v1 - v0 - 2.2)) / (pinsV - 1); return <Box key={`l${i}`} u0={u0 - m - 2.2} u1={u0 - m} v0={v} v1={v + 1.1} z1={1.5} left="#b89432" front="url(#egPin)" top="#f6d97a" soft={0.4} />; })}
      <Box u0={u0} u1={u1} v0={v0} v1={v1} z0={zb} z1={zt} left={`url(#egL-${id})`} front={`url(#egF-${id})`} top={`url(#egT-${id})`} />
      <g transform={plane(zt)}>
        <rect x={u0 + 1.2} y={v0 + 1.2} width={u1 - u0 - 2.4} height={v1 - v0 - 2.4} rx="2.4" fill="none" stroke={c.glow} strokeWidth=".9" className="eg-rim" />
        <rect x={u0 + 1.2} y={v0 + 1.2} width={u1 - u0 - 2.4} height={v1 - v0 - 2.4} rx="2.4" fill="url(#egSheen)" opacity=".6" />
        <g transform={`translate(${cu} ${cv - 2.6}) scale(.92)`} fill="#fff" opacity=".96"><Icon kind={c.icon} /></g>
        <text x={cu} y={cv + (c.sub ? 4.6 : 5.8)} textAnchor="middle" className="eg-t" fontSize={c.sub ? 3.4 : 2.7}>{c.name}</text>
        {c.sub && <text x={cu} y={cv + 7.1} textAnchor="middle" className="eg-t sub" fontSize="1.55">{c.sub}</text>}
        <circle cx={u1 - 3.2} cy={v0 + 3.2} r=".9" className="eg-led" fill={c.glow} style={{ "--d": `${(u0 % 7) * 0.3}s` }} />
      </g>
    </g>
  );
}

// arrow for one data path: line + arrow head (+ a second head for two-way paths)
const head = (a, b, w = 2.1, l = 3.6) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m, px = -uy, py = ux;
  return `${b[0]},${b[1]} ${b[0] - ux * l + px * w},${b[1] - uy * l + py * w} ${b[0] - ux * l - px * w},${b[1] - uy * l - py * w}`;
};
const dOf = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join("");

const GRID = [[6, 6, 6, 94], [6, 94, 94, 94]];
const TRACES = [
  [[0, 20], [8, 20], [8, 8]], [[0, 50], [6, 50], [6, 40]], [[14, 34], [14, 26], [30, 26]], [[26, 8], [26, 20], [34, 20]],
  [[62, 20], [66, 20], [66, 10], [90, 10]], [[96, 30], [96, 52], [90, 52]], [[64, 62], [64, 88], [74, 88], [74, 94]], [[4, 70], [4, 92], [28, 92]],
  [[62, 92], [90, 92], [96, 86]], [[36, 96], [36, 92]], [[10, 66], [10, 82], [16, 82]], [[64, 48], [64, 52], [70, 52]],
];

export default function SfmsEngine({ phase = -1 }) {
  const step = STEPS[phase] || null;
  const used = new Set();
  STEPS.slice(0, Math.max(phase, 0)).forEach((s) => s.paths.forEach((p) => used.add(p)));
  const onChip = (id) => !!step && step.chips.includes(id);
  const k = (n) => `${phase}-${n}`;

  return (
    <svg className="eg" viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} aria-hidden="true">
      <defs>
        <filter id="egBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" /></filter>
        <filter id="egNeon" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id="egBaseL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3b5f" /><stop offset="1" stopColor="#0a1228" /></linearGradient>
        <linearGradient id="egBaseF" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1b2a4a" /><stop offset=".5" stopColor="#3a4f78" /><stop offset="1" stopColor="#16233f" /></linearGradient>
        <linearGradient id="egPcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0f2f76" /><stop offset="1" stopColor="#07173f" /></linearGradient>
        <linearGradient id="egPin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6d97a" /><stop offset="1" stopColor="#8a6a14" /></linearGradient>
        <linearGradient id="egSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".22" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <linearGradient id="egGlassF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".34" /><stop offset="1" stopColor="#b8dcff" stopOpacity=".06" /></linearGradient>
        <linearGradient id="egPlate" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".92" /><stop offset="1" stopColor="#d6e8ff" stopOpacity=".8" /></linearGradient>
        <linearGradient id="egRim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#17c8f2" /><stop offset=".5" stopColor="#2f7bff" /><stop offset="1" stopColor="#7c5cff" /></linearGradient>
        <linearGradient id="egWord" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0a2c6e" /><stop offset="1" stopColor="#1565ff" /></linearGradient>
        <pattern id="egGrid" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M4 0H0V4" fill="none" stroke="#4da8ff" strokeOpacity=".13" strokeWidth=".25" /></pattern>
        <radialGradient id="egGround"><stop offset="0" stopColor="#2a8bff" stopOpacity=".32" /><stop offset="1" stopColor="#2a6bff" stopOpacity="0" /></radialGradient>
        {Object.entries(CHIPS).map(([id, c]) => (
          <g key={id}>
            <linearGradient id={`egT-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c.top[0]} /><stop offset="1" stopColor={c.top[1]} /></linearGradient>
            <linearGradient id={`egL-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.dark} /><stop offset="1" stopColor="#070e24" /></linearGradient>
            <linearGradient id={`egF-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.glow} /><stop offset=".22" stopColor={c.color} stopOpacity=".85" /><stop offset=".6" stopColor={c.dark} /><stop offset="1" stopColor="#0a1330" /></linearGradient>
          </g>
        ))}
      </defs>

      {/* ground glow and shadow */}
      <ellipse cx="368" cy="372" rx="330" ry="118" fill="url(#egGround)" />
      <ellipse cx="368" cy="396" rx="250" ry="56" fill="#0a2a70" opacity=".16" filter="url(#egBlur)" />

      {/* metal base: left face (with vents) and front face (with neon strip) */}
      <polygon points={P([pt(0, 0, 0), pt(0, 100, 0), pt(0, 100, -21), pt(0, 0, -21)])} fill="url(#egBaseL)" stroke="#2a3b5f" strokeWidth=".8" strokeLinejoin="round" />
      <polygon points={P([pt(0, 100, 0), pt(100, 100, 0), pt(100, 100, -21), pt(0, 100, -21)])} fill="url(#egBaseF)" stroke="#2a3b5f" strokeWidth=".8" strokeLinejoin="round" />
      <g transform={`matrix(${V[0] / 2.4} ${V[1] / 2.4} 0 1 ${pt(0, 0, 0)[0]} ${pt(0, 0, 0)[1]})`} className="eg-vents">
        {Array.from({ length: 22 }, (_, i) => <rect key={i} x={6 + i * 4.1} y="5" width="1.7" height="13" rx=".7" fill="#050a18" opacity=".85" />)}
      </g>
      <polyline points={P([pt(0, 0, -4), pt(0, 100, -4), pt(100, 100, -4)])} fill="none" stroke="#17c8f2" strokeWidth="2.6" strokeLinejoin="round" opacity=".95" filter="url(#egNeon)" className="eg-strip" />
      <polyline points={P([pt(0, 0, -4), pt(0, 100, -4), pt(100, 100, -4)])} fill="none" stroke="#fff" strokeWidth=".7" strokeLinejoin="round" opacity=".7" />

      {/* circuit board */}
      <g transform={plane(0)}>
        <rect x="0" y="0" width="100" height="100" rx="3" fill="url(#egPcb)" stroke="#2c6bff" strokeOpacity=".8" strokeWidth=".7" />
        <rect x="2" y="2" width="96" height="96" rx="2" fill="url(#egGrid)" />
        {TRACES.map((t, i) => <g key={i}><path d={dOf(t)} fill="none" stroke="#4da8ff" strokeOpacity=".4" strokeWidth=".45" strokeLinejoin="round" /><circle cx={t[t.length - 1][0]} cy={t[t.length - 1][1]} r=".9" fill="#7fe4ff" opacity=".7" /></g>)}
        <rect x="1.6" y="1.6" width="96.8" height="96.8" rx="2.4" fill="none" stroke="url(#egRim)" strokeWidth="1.1" pathLength="100" className="eg-rimflow" filter="url(#egNeon)" />
      </g>

      {/* small parts at the back-left, like the reference */}
      <Box u0={6} u1={14} v0={5} v1={11} z1={3.2} left="#06102a" front="#0f1c3f" top="#0a1633" />
      <Box u0={16} u1={24} v0={5} v1={12} z1={4.2} left="#06102a" front="#13224b" top="#0b1838" />
      <Box u0={66} u1={72} v0={4} v1={10} z1={3} left="#06102a" front="#0f1c3f" top="#0a1633" />

      {/* data paths between the parts */}
      <g transform={plane(0.4)}>
        {Object.entries(PATHS).map(([id, p]) => {
          const on = !!step && step.paths.includes(id), cls = "eg-path" + (on ? " on" : used.has(id) ? " trail" : "");
          const n = p.pts.length;
          return (
            <g key={id} className={cls} style={{ "--c": p.color }}>
              <path d={dOf(p.pts)} className="eg-line" />
              <polygon points={head(p.pts[n - 2], p.pts[n - 1])} className="eg-head" />
              {p.both && <polygon points={head(p.pts[1], p.pts[0])} className="eg-head" />}
            </g>
          );
        })}
        {step && step.paths.map((id, i) => {
          const p = PATHS[id], d = dOf(p.pts), delay = i * step.ms * 0.4, dur = Math.max(260, step.ms * 0.5);
          return <path key={k(id)} d={d} className="eg-comet" pathLength="1" style={{ "--d": `${delay}ms`, "--t": `${dur}ms`, "--c": p.color }} />;
        })}
        {/* input buffer */}
        <g className={"eg-buf" + (onChip("buf") ? " on" : "")}>
          <rect x="2" y="21" width="22" height="8" rx="4" fill="#07153a" stroke="#38bdf8" strokeWidth=".8" />
          <text x="14" y="26.3" textAnchor="middle" className="eg-t" fontSize="2.9">Input Buffer</text>
          {[0, 1, 2].map((i) => <rect key={i} x={4.2 + i * 1.7} y="23.2" width="1.1" height="1.6" rx=".3" className="eg-pkt" style={{ "--d": `${i * 0.18}s` }} />)}
        </g>
      </g>

      {/* the six processor parts, far to near */}
      {CHIP_ORDER.map((id) => <Chip key={id} id={id} on={onChip(id)} />)}

      {/* glass cover with corner posts */}
      {[[3, 3], [97, 3], [3, 97], [97, 97]].map(([u, v], i) => (
        <g key={i}>
          <polygon points={P([pt(u - 1.4, v, 0), pt(u + 1.4, v, 0), pt(u + 1.4, v, 27), pt(u - 1.4, v, 27)])} fill="#cfe8ff" fillOpacity=".35" stroke="#fff" strokeOpacity=".6" strokeWidth=".6" />
        </g>
      ))}
      <polygon points={P([pt(3, 97, 0), pt(97, 97, 0), pt(97, 97, 27), pt(3, 97, 27)])} fill="url(#egGlassF)" stroke="#fff" strokeOpacity=".5" strokeWidth=".8" />
      <polygon points={P([pt(3, 3, 0), pt(3, 97, 0), pt(3, 97, 27), pt(3, 3, 27)])} fill="url(#egGlassF)" stroke="#fff" strokeOpacity=".45" strokeWidth=".8" />
      <polygon points={P([pt(3, 3, 27), pt(97, 3, 27), pt(97, 97, 27), pt(3, 97, 27)])} fill="#cfe8ff" fillOpacity=".08" stroke="#fff" strokeOpacity=".85" strokeWidth="1.6" strokeLinejoin="round" />
      <polygon points={P([pt(14, 3, 27), pt(40, 3, 27), pt(22, 97, 27), pt(3, 97, 27), pt(3, 70, 27)])} fill="#fff" opacity=".07" />
      {[[3, 3], [97, 3], [3, 97], [97, 97]].map(([u, v], i) => { const [x, y] = pt(u, v, 27); return <g key={i}><ellipse cx={x} cy={y + 2} rx="6.4" ry="3.6" fill="#1a2748" /><ellipse cx={x} cy={y} rx="6.4" ry="3.6" fill="#c8d6ee" stroke="#fff" strokeWidth=".8" /><ellipse cx={x} cy={y - .4} rx="3.1" ry="1.7" fill="#7b8aa8" /></g>; })}

      {/* name plate on the front face, with the SFMS logo */}
      <g transform={`matrix(${U[0] / LEN} ${U[1] / LEN} 0 1 ${pt(0, 100, 0)[0]} ${pt(0, 100, 0)[1] - 30})`} className="eg-plate">
        <rect x={34 * LEN} y="0" width={42 * LEN} height="50" rx="10" fill="url(#egPlate)" stroke="#fff" strokeWidth="1.6" />
        <rect x={34 * LEN + 2.5} y="2.5" width={42 * LEN - 5} height="45" rx="8" fill="none" stroke="#9cc4fb" strokeOpacity=".7" strokeWidth=".8" />
        <image href={logo} x={34 * LEN + 8} y="6" width="38" height="38" preserveAspectRatio="xMidYMid meet" />
        <text x={34 * LEN + 52} y="28" className="eg-word" fontSize="23" fill="url(#egWord)">SFMS</text>
        <text x={34 * LEN + 53} y="41" className="eg-word sub" fontSize="9" fill="#1565ff">ENGINE</text>
        {[[34 * LEN + 5, 5], [76 * LEN - 5, 5], [34 * LEN + 5, 45], [76 * LEN - 5, 45]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="2.1" fill="#9db0cf" /><circle cx={x - .5} cy={y - .5} r=".8" fill="#fff" /></g>)}
      </g>
    </svg>
  );
}
