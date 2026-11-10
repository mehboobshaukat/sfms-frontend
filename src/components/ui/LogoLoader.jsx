import React from "react";
import logo from "../../pages/assets/SFMS_logo_transparent.png";
import "./LogoLoader.css";

/**
 * Branded loading screen. Use it only where the user genuinely waits on the server
 * (restoring a session, first dashboard load), not for quick UI changes.
 *  - fullscreen: covers the whole viewport
 *  - default:    fills the area it is placed in
 * It fades in after a short delay, so fast loads never flash it.
 */
export default function LogoLoader({ fullscreen = false, label = "Loading your finances…" }) {
  return (
    <div className={"sfms-ll" + (fullscreen ? " sfms-ll-full" : "")} role="status" aria-live="polite">
      <div className="sfms-ll-mark">
        <span className="sfms-ll-ring a" />
        <span className="sfms-ll-ring b" />
        <span className="sfms-ll-arc" />
        <img src={logo} alt="" width="84" height="84" />
      </div>
      <p className="sfms-ll-label">{label}</p>
      <span className="sfms-ll-bar" aria-hidden="true"><i /></span>
    </div>
  );
}
