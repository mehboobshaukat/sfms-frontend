import { useEffect, useRef } from "react";

/* ---------- Animated grid backdrop for the dark sections ----------
   A fine grid with glowing nodes, drawn on <canvas> *over the section's own gradient* (nothing is painted
   opaque), so it always takes its tone from the background. Nodes drift and twinkle on their own and are pulled
   toward the pointer on an elastic tether: the stretch is capped, so a node never leaves its home cell, and it
   springs back when the pointer goes away. Grid lines join the nodes, so the whole mesh bends with them. */
const gridHash = (i, j, k) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };

function createGridBackdrop(canvas, { tone = 1 } = {}) {
  const host = canvas.parentElement, ctx = canvas.getContext("2d");
  const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const sprite = document.createElement("canvas");          // soft glow, pre-rendered once
  sprite.width = sprite.height = 64;
  const sg = sprite.getContext("2d"), glow = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(150,225,255,1)"); glow.addColorStop(0.25, "rgba(110,200,255,.45)"); glow.addColorStop(1, "rgba(80,170,255,0)");
  sg.fillStyle = glow; sg.fillRect(0, 0, 64, 64);

  let w = 0, h = 0, dpr = 1, cell = 56, cols = 0, rows = 0, nodes = [], raf = 0, last = 0, visible = true, time = 3;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, s: 0, on: false };

  const fit = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = host.clientWidth; h = host.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    cell = w < 640 ? 44 : 56;
    cols = Math.ceil(w / cell) + 2; rows = Math.ceil(h / cell) + 2;
    const offX = (w - (cols - 1) * cell) / 2, offY = (h - (rows - 1) * cell) / 2;
    nodes = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const r = gridHash(i, j, 2), x = offX + i * cell, y = offY + j * cell;
      nodes.push({ ox: x, oy: y, x, y, vx: 0, vy: 0, seed: gridHash(i, j, 1), lvl: r > 0.86 ? 1 : r > 0.62 ? 0.55 : 0.25, prox: 0 });
    }
    draw();
  };

  const step = () => {
    pointer.x += (pointer.tx - pointer.x) * 0.25; pointer.y += (pointer.ty - pointer.y) * 0.25;
    pointer.s += ((pointer.on ? 1 : 0) - pointer.s) * 0.07;
    const live = pointer.s > 0.003, R = cell * 3.6, MAX = cell * 0.62;
    for (const n of nodes) {
      const ph = n.ox * 0.012 + n.oy * 0.009;                  // idle drift is a smooth ripple, so the grid stays tidy
      let tx = n.ox + Math.sin(time * 0.6 + ph) * 1.3, ty = n.oy + Math.cos(time * 0.5 + ph * 1.1) * 1.3;
      n.prox = 0;
      if (live) {
        const dx = pointer.x - n.ox, dy = pointer.y - n.oy, d = Math.hypot(dx, dy);
        if (d < R && d > 0.01) {
          const k = 1 - d / R, pull = Math.min(MAX * Math.pow(k, 1.5) * pointer.s, d * 0.8);   // capped: stays on its tether
          n.prox = k * k * pointer.s; tx += (dx / d) * pull; ty += (dy / d) * pull;
        }
      }
      n.vx = (n.vx + (tx - n.x) * 0.14) * 0.78; n.vy = (n.vy + (ty - n.y) * 0.14) * 0.78;      // elastic spring
      n.x += n.vx; n.y += n.vy;
    }
  };

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const big = Math.max(w, h);
    for (const [fx, fy, sx, sy, rr, a] of [[0.22, 0.35, 0.11, 0.09, 0.55, 0.1], [0.78, 0.65, 0.08, 0.12, 0.5, 0.08]]) {   // slow ambient lights
      const x = w * (fx + 0.12 * Math.sin(time * sx * 6)), y = h * (fy + 0.2 * Math.cos(time * sy * 6));
      const g = ctx.createRadialGradient(x, y, 0, x, y, big * rr);
      g.addColorStop(0, `rgba(40,150,255,${(a * tone).toFixed(3)})`); g.addColorStop(1, "rgba(40,150,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.lineWidth = 1; ctx.strokeStyle = `rgba(110,185,255,${(0.075 * tone).toFixed(3)})`; ctx.beginPath();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const n = nodes[j * cols + i];
      if (i < cols - 1) { const m = nodes[j * cols + i + 1]; ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); }
      if (j < rows - 1) { const m = nodes[(j + 1) * cols + i]; ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); }
    }
    ctx.stroke();
    if (pointer.s > 0.003) {                                  // lines warm up a little near the pointer
      for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
        const n = nodes[j * cols + i]; if (n.prox < 0.02) continue;
        ctx.strokeStyle = `rgba(120,200,255,${(n.prox * 0.2 * tone).toFixed(3)})`; ctx.beginPath();
        const a = nodes[j * cols + i + 1], b = nodes[(j + 1) * cols + i];
        ctx.moveTo(a.x, a.y); ctx.lineTo(n.x, n.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    ctx.fillStyle = "#8fd9ff";
    for (const n of nodes) {
      const wave = Math.pow(Math.max(0, Math.sin(time * 0.7 - (n.ox * 0.0042 + n.oy * 0.0031))), 8);   // light sweeping across
      const tw = 0.5 + 0.5 * Math.sin(time * (0.6 + n.seed * 0.9) + n.seed * 40);
      const a = Math.min(0.92, 0.16 + 0.16 * n.lvl + n.lvl * (0.34 * tw + 0.3 * wave) + 0.35 * n.prox) * tone;
      const r = (0.75 + 1.05 * n.lvl) * (1 + 0.4 * n.prox);
      if (n.lvl > 0.5 || n.prox > 0.25) { const s = r * 8; ctx.globalAlpha = a * 0.55; ctx.drawImage(sprite, n.x - s / 2, n.y - s / 2, s, s); }
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = 0; return; }
    time += last ? Math.min((now - last) / 1000, 0.05) : 0; last = now;
    step(); draw();
  };
  const move = (e) => {
    if (e.pointerType === "touch") return;
    const r = canvas.getBoundingClientRect();
    pointer.tx = e.clientX - r.left; pointer.ty = e.clientY - r.top;
    if (!pointer.on) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.on = true;
  };
  const leave = () => { pointer.on = false; };

  fit();
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null; ro?.observe(host);
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }) : null; io?.observe(canvas);
  if (!reduced) {
    host.addEventListener("pointermove", move); host.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(frame);
  }
  return {
    destroy() { cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); },
    maxStretch() { return nodes.reduce((m, n) => Math.max(m, Math.hypot(n.x - n.ox, n.y - n.oy)), 0); },
  };
}

function GridBackdrop({ tone = 1 }) {
  const ref = useRef(null);
  useEffect(() => { const grid = createGridBackdrop(ref.current, { tone }); return () => grid.destroy(); }, [tone]);
  return <canvas ref={ref} className="grid-bg" aria-hidden="true" />;
}

export default GridBackdrop;
