import React from "react";
import logo from "../../pages/assets/SFMS_logo_transparent.png";
import "./Spinner.css";

/**
 * Branded loading indicator: the SFMS logo inside a spinning blue/cyan ring.
 *  - default / size="sm": centred block for sections and pages that are waiting on data
 *  - size="xs": small round chip for inside buttons
 * Pass label={null} to hide the text under the logo.
 */
export default function Spinner({ size = "md", label, className = "" }) {
  if (size === "xs") {
    return (
      <span className={`sfms-spin-xs ${className}`} role="status" aria-label="Loading">
        <img src={logo} alt="" />
      </span>
    );
  }
  return (
    <div className={`sfms-spin${size === "sm" ? " is-sm" : ""} ${className}`} role="status" aria-live="polite">
      <span className="sfms-spin-mark">
        <span className="sfms-spin-ring" />
        <img src={logo} alt="" />
      </span>
      {label !== null && <span className="sfms-spin-label">{label ?? "Loading…"}</span>}
    </div>
  );
}
