import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { usersApi } from "../api/users";
import { apiErrorMessage, backendAssetUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import LocationFields from "../components/location/LocationFields";
import Avatar from "../components/ui/Avatar";

const DELETION_OPTIONS = [
  {
    value: "scheduled",
    title: "Schedule deletion in 30 days",
    description:
      "Your account is deactivated immediately and permanently erased after 30 days. You can cancel any time before then from this page.",
  },
  {
    value: "instant",
    title: "Delete instantly",
    description: "Your account and everything in it are permanently erased right now. This cannot be undone or recovered.",
  },
];

const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{2,49}$/;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PROFILE_IMAGE_BYTES = 1 * 1024 * 1024;

function displayName(user) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return fullName || user?.username || "Your profile";
}

function initials(value) {
  if (!value) return "U";
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

export default function Profile() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username || "");
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || "");
  const [location, setLocation] = useState({
    country: user?.country || "",
    state: user?.state || "",
    city: user?.city || "",
    postal_code: user?.postal_code || "",
  });

  useEffect(() => {
    setUsername(user?.username || "");
    setFirstName(user?.first_name || "");
    setLastName(user?.last_name || "");
    setPhoneNumber(user?.phone_number || "");
    setLocation({
      country: user?.country || "",
      state: user?.state || "",
      city: user?.city || "",
      postal_code: user?.postal_code || "",
    });
  }, [user]);
  const [profileImage, setProfileImage] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionType, setDeletionType] = useState("scheduled");
  const [confirmText, setConfirmText] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const avatar = backendAssetUrl(user?.profile_image_url);
  const name = displayName(user);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setProfileImage(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      e.target.value = "";
      setProfileImage(null);
      toast.error("Profile image must be JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      e.target.value = "";
      setProfileImage(null);
      toast.error("Profile image must be 1 MB or smaller.");
      return;
    }
    setProfileImage(file);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and last name are required.");
      return;
    }
    if (!USERNAME_RE.test(username)) {
      toast.error("Username must start with a letter and use only letters, numbers, and underscores. No spaces are allowed.");
      return;
    }

    if (!location.country || !location.state.trim()) {
      toast.error("Please select your country and enter a state / province.");
      return;
    }

    setSavingProfile(true);
    try {
      await usersApi.updateMe({
        username,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || null,
        country: location.country,
        state: location.state.trim(),
        city: location.city.trim() || null,
        postal_code: location.postal_code.trim() || null,
      });
      if (profileImage) {
        await usersApi.uploadProfileImage(profileImage);
        setProfileImage(null);
      }
      await refreshProfile();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRemoveProfileImage = async () => {
    setRemovingImage(true);
    try {
      await usersApi.removeProfileImage();
      setProfileImage(null);
      await refreshProfile();
      toast.success("Profile image removed.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not remove profile image."));
    } finally {
      setRemovingImage(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await usersApi.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success("Password changed.");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  const openDeleteModal = () => {
    setDeletionType("scheduled");
    setConfirmText("");
    setDeleteOpen(true);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await usersApi.deleteMe(deletionType);
      if (deletionType === "instant") {
        toast.success("Account and all its data permanently deleted.");
        await logout();
        navigate("/");
        return;
      }
      toast.success(
        res?.deletion_scheduled_at
          ? "Account scheduled for deletion in 30 days. You can cancel below any time before then."
          : "Account scheduled for deletion."
      );
      setDeleteOpen(false);
      await refreshProfile();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setCancelling(true);
    try {
      await usersApi.cancelDeletion();
      toast.success("Deletion cancelled — your account is back to normal.");
      await refreshProfile();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const instantConfirmed = deletionType !== "instant" || confirmText.trim().toUpperCase() === "DELETE";

  return (
    <div className="max-w-4xl">
      <PageHeader title="Profile & Settings" subtitle="Manage your account details and security." />

      <div className="space-y-6">
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft border border-primary-border text-2xl font-bold text-primary">
              <Avatar src={avatar} alt="Profile" fallback={initials(name)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-ink truncate">{name}</h3>
                {user?.email_confirmed ? <Badge tone="emerald">Verified email</Badge> : <Badge tone="gold">Email not verified</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted truncate">@{user?.username || "user"} · {user?.email || "No email available"}</p>
              <p className="mt-3 text-xs text-muted leading-relaxed max-w-2xl">
                Your personal details, address and base currency are connected to your SFMS account.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Profile" />
          <CardBody>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <Input label="First name" required maxLength={80} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input label="Last name" required maxLength={80} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <Input
                label="Username"
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
                hint="Start with a letter; use only letters, numbers, and underscores. No spaces."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Input label="Email" value={user?.email || ""} disabled hint="Email cannot be changed here." />
              <Input
                label="Phone number"
                type="tel"
                maxLength={30}
                autoComplete="tel"
                hint="Optional. Used for future contact features."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <LocationFields
                required
                idPrefix="profile-location"
                country={location.country}
                state={location.state}
                city={location.city}
                postalCode={location.postal_code}
                onChange={(updates) => setLocation((previous) => ({ ...previous, ...updates }))}
              />
              <div className="rounded-lg border border-cardBorder bg-hover/40 px-4 py-3 text-sm text-muted">
                Current base currency: <strong className="text-ink">{user?.currency_symbol || "Rs"} ({user?.currency_code || "PKR"})</strong>.
                Changing to a country with another currency may be blocked if you have financial records.
                This setting does not perform currency conversion.
              </div>
              <Input
                disabled="true" // TEMPORARILY DISABLED AND WILL BE UPDATED LATER ###################
                label="Profile image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hint="Optional. JPEG, PNG, or WebP up to 1 MB."
                onChange={handleImageChange}
              />
              <p style={{ color: 'red', fontSize: '11px' }}>Right now image function is disabled and will be enabled later.</p>
              {user?.profile_image_url && (
                <div>
                  <Button disabled type="button" variant="secondary" size="sm" loading={removingImage} onClick={handleRemoveProfileImage}>
                    Remove profile image
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Email status:</span>
                {user?.email_confirmed ? <Badge tone="emerald">Verified</Badge> : <Badge tone="gold">Not verified</Badge>}
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={savingProfile}>
                  Save Profile
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Change Password" />
          <CardBody>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                required
                value={pwForm.current_password}
                onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              />
              <Input
                label="New Password"
                type="password"
                required
                minLength={8}
                value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              />
              <Input
                label="Confirm New Password"
                type="password"
                required
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              />
              <div className="flex justify-end">
                <Button type="submit" loading={savingPassword}>
                  Change Password
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="border-danger/30">
          <CardHeader title="Delete Account" />
          <CardBody>
            {user?.is_deleted ? (
              <div className="rounded-lg bg-gold/10 border border-gold/30 px-4 py-3.5">
                <p className="text-sm text-ink font-medium mb-1">Your account is scheduled for deletion</p>
                <p className="text-sm text-muted mb-3">
                  {user?.deletion_scheduled_at
                    ? `It will be permanently erased on ${new Date(user.deletion_scheduled_at).toLocaleDateString()}.`
                    : "It will be permanently erased soon."}{" "}
                  You can cancel any time before then.
                </p>
                <Button variant="secondary" onClick={handleCancelDeletion} loading={cancelling}>
                  Cancel Deletion
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted mb-4">
                  You can close your account with a 30-day recovery window, or erase it immediately. Choose when
                  you're ready below.
                </p>
                <Button variant="danger" onClick={openDeleteModal}>
                  Delete My Account
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount} loading={deleting} disabled={!instantConfirmed}>
              {deletionType === "instant" ? "Delete permanently, now" : "Schedule deletion"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {DELETION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`block rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                deletionType === opt.value ? "border-primary-border bg-primary-soft" : "border-cardBorder hover:border-primary-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="deletionType"
                  className="mt-1"
                  checked={deletionType === opt.value}
                  onChange={() => setDeletionType(opt.value)}
                />
                <div>
                  <p className="text-sm font-medium text-ink">{opt.title}</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{opt.description}</p>
                </div>
              </div>
            </label>
          ))}

          {deletionType === "instant" && (
            <div className="pt-1">
              <Input
                label={'Type "DELETE" to confirm'}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
