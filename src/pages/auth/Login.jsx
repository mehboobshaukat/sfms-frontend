import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import Button from "../../components/ui/Button";
import AuthShell, { AuthAlert, AuthLink, Field } from "../../components/auth/AuthShell";
import Seo from "../../components/Seo";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      const message = apiErrorMessage(err, "Invalid email or password.");
      const unverified = err?.response?.status === 403 && /verify your email/i.test(message);
      setNeedsVerification(unverified);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!form.email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerification(form.email.trim());
      toast.success("If this account is awaiting verification, a new verification link has been sent.");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not resend the verification email."));
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Seo title="Log In" description="Log in to your SFMS account to track income, expenses, loans, budgets, and savings goals." path="/login" />
      <AuthShell
        side="login" icon="lock" title="Welcome back" subtitle="Log in to your SFMS account."
        footer={<>Don't have an account? <Link to="/register">Create one</Link></>}
      >
        <form onSubmit={handleSubmit} noValidate>
          {error && <AuthAlert>{error}</AuthAlert>}
          <Field
            label="Email" icon="mail" type="email" required autoComplete="email" placeholder="you@example.com"
            value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); setNeedsVerification(false); }}
          />
          <Field
            label="Password" icon="lock" type="password" required autoComplete="current-password" placeholder="Your password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Link to="/forgot-password" className="au-forgot">Forgot password?</Link>
          {needsVerification && (
            <Button type="button" variant="secondary" className="w-full" loading={resending} onClick={handleResendVerification}>
              Resend verification email
            </Button>
          )}
          <Button type="submit" className="w-full" loading={loading}>Log in</Button>
        </form>
      </AuthShell>
    </>
  );
}
