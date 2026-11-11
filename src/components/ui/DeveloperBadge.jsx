import React from "react";
import portrait from "../../assets/dev-badge/mehboob-portrait.webp";
import mark from "../../assets/dev-badge/ms-mark.webp";
import "./DeveloperBadge.css";

/* Footer credit badge: a round avatar that gently alternates between the developer's photo and the "MS" mark,
   sitting on a navy pill. Pure CSS animation (no timers); it pauses on hover/focus and stays on the logo
   for visitors who prefer reduced motion. Pass `href` to make the whole badge a link. */
export default function DeveloperBadge({ href, className = "" }) {
  const body = (
    <>
      <span className="ms-av" aria-hidden="true">
        <span className="ms-av-w">
          <span className="ms-av-s">
            <img className="ms-img ms-photo" src={portrait} alt="" width="210" height="210" loading="lazy" decoding="async" draggable="false" />
            <img className="ms-img ms-logo" src={mark} alt="" width="160" height="160" loading="lazy" decoding="async" draggable="false" />
          </span>
        </span>
      </span>
      <span className="ms-pill">
        <span className="ms-by">Designed &amp; Developed by</span>
        <span className="ms-nm">Mehboob <b>Shaukat</b></span>
      </span>
    </>
  );
  const label = "Designed and developed by Mehboob Shaukat";
  return href
    ? <a className={"ms-badge " + className} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>{body}</a>
    : <div className={"ms-badge " + className} role="group" aria-label={label}>{body}</div>;
}
