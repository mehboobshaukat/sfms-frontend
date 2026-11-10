import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { Input } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import AuthShell from "../../components/auth/AuthShell";
import Seo from "../../components/Seo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo title="Reset Your Password" description="Reset your SFMS account password via email link." path="/forgot-password" noindex />
      <AuthShell side="recover" icon="mail" title="Reset your password" subtitle="Enter your email and we'll send you a reset link."
        footer={<>Remembered it? <Link to="/login">Back to log in</Link></>}
      >
          {sent ? (
            <div className="bg-emerald-glow border border-emerald/30 text-emerald text-sm rounded-lg px-4 py-3">
              If that email exists in our system, a reset link is on its way. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3" role="alert">
                  {error}
                </div>
              )}
              <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" className="w-full" loading={loading}>
                Send reset link
              </Button>
            </form>
          )}
        
      </AuthShell>
    </>
  );
}
