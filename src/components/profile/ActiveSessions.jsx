import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardBody } from "../ui/Card";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { Input } from "../ui/Input";
import Modal from "../ui/Modal";

const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "-");

function label(s) {
  if (s.client_type === "mobile") return s.device_label ? `SFMS app (${s.device_label})` : "SFMS mobile app";
  return s.browser ? `Website: ${s.browser}` : "Website (browser)";
}

/** "Active sessions & devices": see where the account is signed in and end any session other than this one. */
export default function ActiveSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null); // { kind: "one" | "others", id? }
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const hasPassword = user?.password_set !== false;

  const load = useCallback(async () => {
    try {
      setSessions(await authApi.sessions());
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load your sessions."));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirm = async (e) => {
    e?.preventDefault();
    if (!password) return;
    setBusy(true);
    try {
      const token = await authApi.reauth(password);
      if (pending.kind === "others") {
        const { revoked } = await authApi.revokeOtherSessions(token);
        toast.success(revoked ? `Signed out ${revoked} other session${revoked === 1 ? "" : "s"}.` : "No other sessions were signed in.");
      } else {
        await authApi.revokeSession(pending.id, token);
        toast.success("Session signed out.");
      }
      setPending(null);
      setPassword("");
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const others = (sessions || []).filter((s) => !s.is_current);

  return (
    <Card>
      <CardHeader title="Active Sessions & Devices" />
      <CardBody>
        {error && <p className="text-sm text-danger mb-3">{error}</p>}
        {!sessions && !error && <p className="text-sm text-muted">Loading...</p>}
        <ul className="divide-y divide-itemBorder">
          {(sessions || []).map((s) => (
            <li key={s.public_id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink flex items-center gap-2">
                  {label(s)} {s.is_current && <Badge tone="emerald">This device</Badge>}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Last active {when(s.last_seen_at)} {s.approx_ip ? `· ${s.approx_ip}` : ""} · signed in {when(s.created_at)} · ends by {when(s.absolute_expires_at)}
                </p>
              </div>
              {!s.is_current && (
                <Button variant="secondary" size="sm" onClick={() => { setPending({ kind: "one", id: s.public_id }); setPassword(""); }}>
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
        {others.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button variant="danger" onClick={() => { setPending({ kind: "others" }); setPassword(""); }}>
              Sign out all other devices
            </Button>
          </div>
        )}
      </CardBody>

      <Modal
        open={!!pending}
        onClose={() => !busy && setPending(null)}
        title="Confirm it's you"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
            <Button onClick={confirm} loading={busy} disabled={!password || !hasPassword}>Confirm</Button>
          </>
        }
      >
        {hasPassword ? (
          <form onSubmit={confirm} className="space-y-3">
            <p className="text-sm text-muted">
              {pending?.kind === "others" ? "Enter your password to sign out every other device." : "Enter your password to sign out this session."}
            </p>
            <Input label="Password" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </form>
        ) : (
          <p className="text-sm text-muted">
            Your account signs in with Google and has no password yet. Use &ldquo;Forgot password&rdquo; on the login page to choose one, then come back here.
          </p>
        )}
      </Modal>
    </Card>
  );
}
