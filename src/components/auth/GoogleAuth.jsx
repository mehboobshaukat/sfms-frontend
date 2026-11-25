import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import { AuthAlert, Field } from "./AuthShell";
import LocationFields from "../location/LocationFields";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GIS_SRC = "https://accounts.google.com/gsi/client";

let gisPromise = null;
function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GIS_SRC;
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => { gisPromise = null; reject(new Error("Google sign-in could not be loaded.")); };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

const randomNonce = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * "Continue with Google". Google only proves who the person is; the backend verifies the ID token
 * (signature, audience, expiry, verified e-mail, nonce) and then issues SFMS's own session.
 *
 * Three outcomes:
 *   authenticated     -> signed in
 *   link_required     -> an SFMS account already uses this e-mail: the user proves it's theirs with its password
 *   profile_required  -> first time with Google: ask for the few details Google doesn't provide
 */
export default function GoogleAuth({ onSuccess, label = "signin_with" }) {
  const { finishLogin } = useAuth();
  const buttonRef = useRef(null);
  const nonceRef = useRef(randomNonce());
  const [step, setStep] = useState("button"); // button | link | profile
  const [ticket, setTicket] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState({ first_name: "", last_name: "", username: "", phone_number: "", country: "", state: "", city: "", postal_code: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const done = async (result) => {
    if (result.status === "authenticated") {
      await finishLogin();
      toast.success("Signed in with Google.");
      onSuccess?.();
    } else if (result.status === "link_required") {
      setTicket(result.ticket);
      setEmailHint(result.email_hint || "");
      setStep("link");
    } else if (result.status === "profile_required") {
      setTicket(result.ticket);
      setProfile((p) => ({ ...p, first_name: result.prefill?.first_name || "", last_name: result.prefill?.last_name || "" }));
      setStep("profile");
    }
  };

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await done(await fn());
    } catch (err) {
      const code = err?.response?.data?.detail?.code;
      if (code === "ticket_invalid" || code === "ticket_used") setStep("button");
      setError(apiErrorMessage(err, "Google sign-in failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!CLIENT_ID || step !== "button") return undefined;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: nonceRef.current,
          callback: (response) => run(() => authApi.googleLogin(response.credential, nonceRef.current)),
          ux_mode: "popup",
          auto_select: false,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard", theme: "outline", size: "large", text: label, shape: "pill",
          width: Math.min(360, buttonRef.current.parentElement?.clientWidth || 320),
        });
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [step, label]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!CLIENT_ID) return null;

  const submitLink = (e) => { e.preventDefault(); if (password) run(() => authApi.googleLink(ticket, password)); };
  const submitProfile = (e) => {
    e.preventDefault();
    if (!profile.username.trim() || !profile.first_name.trim() || !profile.last_name.trim()) { setError("Please fill in your name and a username."); return; }
    if (!profile.country || !profile.state.trim()) { setError("Please select your country and enter a state / province."); return; }
    run(() => authApi.googleComplete({
      ticket,
      username: profile.username.trim(),
      first_name: profile.first_name.trim(),
      last_name: profile.last_name.trim(),
      phone_number: profile.phone_number.trim() || null,
      country: profile.country,
      state: profile.state.trim(),
      city: profile.city.trim() || null,
      postal_code: profile.postal_code.trim() || null,
    }));
  };

  return (
    <div className="au-google">
      {error && <AuthAlert>{error}</AuthAlert>}

      {step === "button" && (
        <>
          <div ref={buttonRef} style={{ display: "flex", justifyContent: "center", minHeight: 44, opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0 6px", color: "#62728f", fontSize: 12, fontWeight: 600 }}>
            <span style={{ flex: 1, height: 1, background: "#dce7f8" }} /> OR <span style={{ flex: 1, height: 1, background: "#dce7f8" }} />
          </div>
        </>
      )}

      {step === "link" && (
        <form onSubmit={submitLink} noValidate>
          <p style={{ fontSize: 14, margin: "0 0 12px" }}>
            An SFMS account already exists for <b>{emailHint}</b>. Enter its password once to connect your Google account.
          </p>
          <Field label="SFMS password" icon="lock" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" loading={busy}>Connect Google and sign in</Button>
          <Button type="button" variant="secondary" className="w-full" style={{ marginTop: 8 }} onClick={() => { setStep("button"); setError(""); setPassword(""); }}>Cancel</Button>
        </form>
      )}

      {step === "profile" && (
        <form onSubmit={submitProfile} noValidate>
          <p style={{ fontSize: 14, margin: "0 0 12px" }}>Almost there: a few details to finish creating your SFMS account.</p>
          <div className="au-grid">
            <Field label="First name" icon="user" required maxLength={80} value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
            <Field label="Last name" icon="user" required maxLength={80} value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
          </div>
          <Field label="Username" icon="at" required minLength={3} maxLength={50} hint="Start with a letter; letters, numbers and underscores only." value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
          <Field label="Phone number" icon="phone" type="tel" maxLength={30} hint="Optional." value={profile.phone_number} onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })} />
          <LocationFields required idPrefix="google-location" country={profile.country} state={profile.state} city={profile.city} postalCode={profile.postal_code} onChange={(u) => setProfile((p) => ({ ...p, ...u }))} />
          <p className="au-hint" style={{ margin: "-4px 0 16px" }}>Your country sets the currency you will see.</p>
          <Button type="submit" className="w-full" loading={busy}>Create account</Button>
          <Button type="button" variant="secondary" className="w-full" style={{ marginTop: 8 }} onClick={() => { setStep("button"); setError(""); }}>Cancel</Button>
        </form>
      )}
    </div>
  );
}
