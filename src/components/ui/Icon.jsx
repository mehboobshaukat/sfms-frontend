import React from "react";

const paths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  transactions: <><path d="M4 7h12"/><path d="m13 4 3 3-3 3"/><path d="M20 17H8"/><path d="m11 14-3 3 3 3"/></>,
  wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 8h13"/><path d="M15 12h5v4h-5a2 2 0 0 1 0-4z"/></>,
  loan: <><path d="M8 9V6a4 4 0 0 1 8 0v3"/><rect x="5" y="9" width="14" height="11" rx="2"/><path d="M9 14h6"/><path d="M12 12v4"/></>,
  credit: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/><path d="M7 15h3"/></>,
  budget: <><path d="M4 7h16"/><path d="M7 4v6"/><path d="M17 4v6"/><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 14h3"/><path d="M14 14h2"/></>,
  goal: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m15 9 5-5"/><path d="M16 4h4v4"/></>,
  analytics: <><path d="M5 20V10"/><path d="M12 20V4"/><path d="M19 20v-7"/></>,
  reports: <><path d="M6 3h9l3 3v15H6z"/><path d="M14 3v4h4"/><path d="M9 12h6"/><path d="M9 16h6"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
  spark: <><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.4v-4h.1A1.7 1.7 0 0 0 4.2 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.66 3.8l.06.06A1.7 1.7 0 0 0 8.6 4.2a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.4h4v.1a1.7 1.7 0 0 0 1 1.7 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.6c.18.38.46.72.8 1 .34.27.76.41 1.2.4h.2v4h-.2a1.7 1.7 0 0 0-2 1z"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  logout: <><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5"/><path d="m14 8 4 4-4 4"/><path d="M18 12H8"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>,
  arrowDown: <path d="m7 10 5 5 5-5"/>,
  arrowUp: <><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>,
  arrowDownLong: <><path d="M12 5v14"/><path d="m18 13-6 6-6-6"/></>,
  savings: <><path d="M5 9h14a2 2 0 0 1 2 2v7H3v-7a2 2 0 0 1 2-2z"/><path d="M7 9V7a5 5 0 0 1 10 0v2"/><path d="M8 14h8"/></>,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  chevronRight: <path d="m9 18 6-6-6-6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></>,
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  users: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/></>,
  archive: <><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></>,
  trash: <><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"/><path d="M9 7V4h6v3"/></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  send: <><path d="M21 3 10 14"/><path d="M21 3 14.5 21l-4.5-7-7-4.5z"/></>,
  inbox: <><path d="M3 13l3-8h12l3 8"/><path d="M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6h-5l-1 3h-6l-1-3z"/></>,
  ban: <><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></>,
  arrowLeft: <><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></>,
  undo: <><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></>,
  key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m16 7 3 3"/></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.5-4"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4"/><path d="M20 20v-4h-4"/></>,
};

export default function Icon({ name, size = 20, strokeWidth = 1.8, className = "", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name] || paths.dashboard}
    </svg>
  );
}
