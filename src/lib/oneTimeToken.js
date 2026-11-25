import { useEffect, useRef } from "react";

/**
 * Pages that receive a one-time secret in the URL (reset / verification links) must not leak it.
 *   1. `<meta name="referrer" content="no-referrer">` while the page is mounted, so no request made from
 *      the page (fonts, images, API) can carry the URL in a Referer header.
 *   2. The token is copied into memory and removed from the address bar / history right away.
 * (vercel.json also sends `Referrer-Policy: no-referrer` for these routes.)
 */
export function useNoReferrer() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

/** Reads `?token=` once, strips it from the URL, and returns it from a ref (never re-read from the URL). */
export function useUrlToken(searchParams) {
  const ref = useRef(null);
  if (ref.current === null) ref.current = (searchParams.get("token") || "").trim();
  useEffect(() => {
    if (window.location.search.includes("token=")) {
      window.history.replaceState(window.history.state, document.title, window.location.pathname);
    }
  }, []);
  return ref.current;
}
