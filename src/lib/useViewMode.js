import { useCallback, useEffect, useState } from "react";

/**
 * Device-aware List / Table / Cards switch.
 *
 * - `wide` / `narrow` are the defaults for large and small screens.
 * - A choice the person makes is remembered separately for each screen class, so a
 *   "Table" picked on a desktop never forces a table onto the same account's phone.
 * - Until they choose, the view follows the screen (rotate a tablet, resize a window).
 *
 * `TABLE_QUERY` is "wide" when there is room for a real table: tablets in portrait have no
 * sidebar (768–1023px), and desktops need 1280px+ to fit the content area next to the 248px sidebar.
 * `CARDS_QUERY` is "wide" from 640px, where a 2-column card grid fits.
 */
export const TABLE_QUERY = "(min-width: 1280px), (min-width: 768px) and (max-width: 1023.98px)";
export const CARDS_QUERY = "(min-width: 640px)";

const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

function readStored(key, allowed) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export default function useViewMode(storageKey, { wide, narrow, query = TABLE_QUERY }) {
  const [isWide, setIsWide] = useState(() => (canMatch() ? window.matchMedia(query).matches : true));

  useEffect(() => {
    if (!canMatch()) return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setIsWide(mql.matches);
    onChange();
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange); // older Safari
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  const allowed = [wide, narrow];
  const [picked, setPicked] = useState(() => ({
    wide: readStored(`${storageKey}:wide`, allowed),
    narrow: readStored(`${storageKey}:narrow`, allowed),
  }));

  const bucket = isWide ? "wide" : "narrow";
  const view = picked[bucket] || (isWide ? wide : narrow);

  const setView = useCallback((next) => {
    setPicked((prev) => ({ ...prev, [bucket]: next }));
    try { localStorage.setItem(`${storageKey}:${bucket}`, next); } catch { /* storage unavailable: choice just won't persist */ }
  }, [bucket, storageKey]);

  return [view, setView];
}
