import { useEffect, useRef, useState } from "react";

/** Counts up to `target` (starting from the previous value) so figures settle in instead of popping. */
export default function useCountUp(target, duration = 900) {
  const end = Number(target) || 0;
  const [value, setValue] = useState(0);
  const previous = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { previous.current = end; setValue(end); return undefined; }
    const from = previous.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const next = from + (end - from) * (1 - Math.pow(1 - p, 3));
      previous.current = next;
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return value;
}
