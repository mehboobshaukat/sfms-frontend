import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { Input } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import AuthShell from "../../components/auth/AuthShell";
import Seo from "../../components/Seo";
import { useNoReferrer, useUrlToken } from "../../lib/oneTimeToken";

export default function ResetPassword() {
  useNoReferrer();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // The e-mail button opens this page with the token in the link. It is read once, removed from the
  // address bar, and kept only in memory: the user just chooses a new password.
  const linkToken = useUrlToken(searchParams);
  const [manualToken, setManualToken] = useState("");
  const [showManual, setShowManual] = useState(!linkToken); // opened without a link: manual entry is the only way
  const token = showManual && manualToken.trim() ? manualToken.trim() : linkToken;

  const [form, setForm] = useState({ new_password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("This page needs the reset link from your email. Open the link again, or enter your reset token manually below.");
      setShowManual(true);
      return;
    }
    if (form.new_password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (form.new_password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, new_password: form.new_password });
      toast.success("Password changed. Please log in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "This reset link is invalid or has expired."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo title="Set a New Password" description="Choose a new password for your SFMS account." path="/reset-password" noindex />
      <AuthShell side="recover" icon="lock" title="Reset password" subtitle="Choose a new password for your SFMS account."
        footer={<Link to="/login">Back to log in</Link>}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3" role="alert">
              {error}{" "}
              <Link to="/forgot-password" className="underline font-medium">Request a new link</Link>
            </div>
          )}
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />

          {showManual && (
            <Input
              label="Reset token"
              hint="Only needed if the link from your email did not work. Paste the token from the email."
              autoComplete="off"
              spellCheck={false}
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Reset password
          </Button>

          {!showManual && (
            <p className="text-center text-sm text-muted">
              Having trouble?{" "}
              <button type="button" className="text-primary font-medium hover:underline" onClick={() => setShowManual(true)}>
                Enter your reset token manually
              </button>
            </p>
          )}
        </form>
      </AuthShell>
    </>
  );
}
