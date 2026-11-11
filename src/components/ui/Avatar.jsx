import React, { useEffect, useState } from "react";

/**
 * Fills its (already sized, rounded, overflow-hidden) parent.
 * - no `src`           -> shows `fallback` (usually the person's initials)
 * - `src` fails to load -> shows a neutral default avatar instead of a broken-image icon
 */
export function DefaultAvatar({ className = "h-full w-full" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="Default avatar" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="#dbe7ff" />
      <circle cx="32" cy="25" r="11" fill="#7b9cdc" />
      <path d="M10 64c0-13 9.8-22 22-22s22 9 22 22z" fill="#7b9cdc" />
    </svg>
  );
}

export default function Avatar({ src, fallback = null, alt = "", className = "h-full w-full object-cover" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src) return <>{fallback}</>;
  if (failed) return <DefaultAvatar />;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" decoding="async" />;
}
