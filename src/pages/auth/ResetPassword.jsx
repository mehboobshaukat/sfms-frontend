import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { Input } from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import AuthShell from "../../components/auth/AuthShell";
import Seo from "../../components/Seo";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get("token") || "";
  const [form, setForm] = useState({ token: tokenFromUrl, new_password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.new_password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token: form.token, new_password: form.new_password });
      toast.success("Password reset. Please log in.");
      navigate("/login");
    } catch (err) {
      setError(apiErrorMessage(err, "This reset link is invalid or has expired."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo title="Set a New Password" description="Choose a new password for your SFMS account." path="/reset-password" noindex />
      <AuthShell side="recover" icon="lock" title="Set a new password" subtitle="Enter the reset token from your email and choose a new password."
        footer={<Link to="/login">Back to log in</Link>}
      >
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3" role="alert">
                {error}
              </div>
            )}
            <Input
              label="Reset token"
              required
              hint="Paste the token you received by email."
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
            />
            <Input
              label="New password"
              type="password"
              required
              minLength={8}
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            />
            <Input
              label="Confirm new password"
              type="password"
              required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
            <Button type="submit" className="w-full" loading={loading}>
              Reset password
            </Button>
          </form>
        
      </AuthShell>
    </>
  );
}
