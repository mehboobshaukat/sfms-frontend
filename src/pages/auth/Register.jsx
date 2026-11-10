import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { apiErrorMessage } from "../../api/client";
import Button from "../../components/ui/Button";
import AuthShell, { AuthAlert, Field } from "../../components/auth/AuthShell";
import { Ic } from "../public/sfmsUi";
import Seo from "../../components/Seo";
import LocationFields from "../../components/location/LocationFields";

const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{2,49}$/;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PROFILE_IMAGE_BYTES = 1 * 1024 * 1024;

const STRENGTH = ["", "Too weak", "Fair", "Good", "Strong"];
function strengthOf(p) {
  if (!p) return 0;
  let n = 0;
  if (p.length >= 8) n++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++;
  if (/\d/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) n++;
  return Math.max(n, 1);
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    phone_number: "",
    country: "",
    state: "",
    city: "",
    postal_code: "",
    password: "",
    confirm: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => (profileImage ? URL.createObjectURL(profileImage) : ""), [profileImage]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const level = strengthOf(form.password);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setError("");
    if (!file) {
      setProfileImage(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      e.target.value = "";
      setProfileImage(null);
      setError("Profile image must be JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      e.target.value = "";
      setProfileImage(null);
      setError("Profile image must be 1 MB or smaller.");
      return;
    }
    setProfileImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (!USERNAME_RE.test(form.username)) {
      setError("Username must start with a letter and contain only letters, numbers, and underscores (3-50 characters). No spaces are allowed.");
      return;
    }
    if (!form.country || !form.state.trim()) {
      setError("Please select your country and enter a state / province.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      username: form.username,
      email: form.email.trim(),
      phone_number: form.phone_number.trim() || null,
      country: form.country,
      state: form.state.trim(),
      city: form.city.trim() || null,
      postal_code: form.postal_code.trim() || null,
      password: form.password,
    };

    let requestBody = payload;
    if (profileImage) {
      const multipart = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) multipart.append(key, value);
      });
      multipart.append("profile_image", profileImage);
      requestBody = multipart;
    }

    setLoading(true);
    try {
      await register(requestBody);
      toast.success("Account created. Please verify your email before logging in.");
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Seo title="Create Your Account" description="Create a free SFMS account and start tracking income, expenses, loans, budgets, and savings goals in one place." path="/register" />
      <AuthShell
        side="register" icon="user" wide title="Create your account" subtitle="Start tracking your finances in a couple of minutes."
        footer={<>Already have an account? <Link to="/login">Log in</Link></>}
      >
        <form onSubmit={handleSubmit} noValidate>
          {error && <AuthAlert>{error}</AuthAlert>}

          <div className="au-sec"><i>1</i>About you</div>
          <div className="au-grid">
            <Field label="First name" icon="user" required maxLength={80} autoComplete="given-name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Field label="Last name" icon="user" required maxLength={80} autoComplete="family-name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            <Field label="Username" icon="at" required minLength={3} maxLength={50} autoComplete="username" hint="3-50 characters. Start with a letter; use only letters, numbers, and underscores." value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Field label="Email" icon="mail" type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Field label="Phone number" icon="phone" type="tel" maxLength={30} autoComplete="tel" hint="Optional. You can add or update it later." value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />

          <div className="au-sec"><i>2</i>Where you are</div>
          <LocationFields
            required
            idPrefix="register-location"
            country={form.country}
            state={form.state}
            city={form.city}
            postalCode={form.postal_code}
            onChange={(updates) => setForm((previous) => ({ ...previous, ...updates }))}
          />
          <p className="au-hint" style={{ margin: "-4px 0 16px" }}>Your country sets the currency you will see.</p>

          <div className="au-sec"><i>3</i>Profile photo <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0, color: "#62728f" }}>(optional)</span></div>
          <label className="au-file">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
            <span className="au-thumb">{previewUrl ? <img src={previewUrl} alt="Selected profile" /> : <Ic n="image" s={22} />}</span>
            <span><b>{profileImage ? profileImage.name : "Choose a photo"}</b><small>JPEG, PNG, or WebP up to 1 MB.</small></span>
          </label>
          <div style={{ height: 16 }} />

          <div className="au-sec"><i>4</i>Secure your account</div>
          <div className="au-grid">
            <div>
              <Field label="Password" icon="lock" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              {form.password && (
                <div style={{ margin: "-8px 0 16px" }}>
                  <div className={"au-meter l" + level} aria-hidden="true"><i /><i /><i /><i /></div>
                  <span className="au-meter-t">Strength: {STRENGTH[level]}. Use at least 8 characters.</span>
                </div>
              )}
            </div>
            <Field label="Confirm password" icon="lock" type="password" required autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>

          <Button type="submit" className="w-full" loading={loading}>Create account</Button>
        </form>
      </AuthShell>
    </>
  );
}
