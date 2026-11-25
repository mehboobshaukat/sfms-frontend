import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import AuthShell from "../../components/auth/AuthShell";
import Seo from "../../components/Seo";
import { Input } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useNoReferrer, useUrlToken } from "../../lib/oneTimeToken";

/**
 * Opening the e-mail link only shows a confirmation page. The e-mail is verified when the user clicks
 * "Verify email" (an explicit POST), so mail scanners, link previews and prefetchers that merely open
 * the link cannot consume the one-time token.
 */
export default function VerifyEmail() {
  useNoReferrer();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useUrlToken(searchParams);
  const emailFromUrl = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [status, setStatus] = useState(token ? "ready" : "idle"); // idle | ready | verifying | success | error
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  const verify = async () => {
    setStatus("verifying");
    setError("");
    try {
      await authApi.verifyEmail(token);
      setStatus("success");
    } catch {
      // Tokens are opaque: invalid, expired, already-used and unknown links share one message.
      setError("This verification link is invalid, expired, or has already been used. Request a new verification email below.");
      setStatus("error");
    }
  };

  const resend = async () => {
    if (!email.trim()) {
      setError("Enter the email address used for registration.");
      return;
    }
    setResending(true);
    setError("");
    try {
      await authApi.resendVerification(email.trim());
      toast.success("If this account is awaiting verification, a new verification link has been sent.");
      setStatus("idle");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not resend the verification email. Please try again."));
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Seo title="Verify Your Email" description="Confirm your email address to finish setting up your SFMS account." path="/verify-email" noindex />
      <AuthShell side="recover" icon="mail" title="Verify your email" subtitle="Confirm your address to finish setting up your account."
        footer={status !== "success" ? <Link to="/login">Back to log in</Link> : null}
      >
        {status === "success" && (
          <div className="space-y-5 text-center">
            <div className="bg-emerald-glow border border-emerald/30 text-emerald text-sm rounded-lg px-4 py-4" role="status">
              <p className="font-semibold text-base">Email verified successfully</p>
              <p className="mt-1">Your SFMS account is ready. You can now sign in.</p>
            </div>
            <Button type="button" className="w-full" onClick={() => navigate("/login", { replace: true })}>
              Continue to log in
            </Button>
          </div>
        )}

        {(status === "ready" || status === "verifying") && (
          <div className="space-y-5 text-center">
            <div className="bg-primary-soft border border-primary-border text-ink text-sm rounded-lg px-4 py-4">
              One last step: confirm that this email address is yours.
            </div>
            <Button type="button" className="w-full" loading={status === "verifying"} onClick={verify}>
              Verify email
            </Button>
          </div>
        )}

        {(status === "idle" || status === "error") && (
          <div className="space-y-5">
            {status === "error" && error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3" role="alert">
                <p className="font-medium">Verification link expired or invalid</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {status === "idle" && (
              <div className="bg-primary-soft border border-primary-border text-ink text-sm rounded-lg px-4 py-3">
                {emailFromUrl ? (
                  <>We sent a verification link to <span className="font-medium">{emailFromUrl}</span>. Open the email and click <span className="font-medium">Verify email</span> before logging in.</>
                ) : (
                  <>Open the verification email we sent you and click <span className="font-medium">Verify email</span>. If you need a new link, enter your email below.</>
                )}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                hint="Use this only if you need a new verification link."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="button" variant="secondary" className="w-full" loading={resending} onClick={resend}>
                Resend verification email
              </Button>
            </div>
          </div>
        )}
      </AuthShell>
    </>
  );
}
