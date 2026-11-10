import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { adminApi } from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useAdmin } from "../../components/layout/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import Table from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { TextArea } from "../../components/ui/Input";
import { formatDate, formatDateTime } from "../../lib/formatters";
import { canManageUser, roleLabel } from "../../lib/roles";
import { FilterSelect, SearchBox, StatusBadge, USER_STATUS, fullName, useDebounced } from "./adminUi";

const ROLE_TONE = { super_admin: "gold", admin: "primary", user: "neutral" };

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-nav">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{children || <span className="text-subtle">—</span>}</dd>
    </div>
  );
}

/** Per-user actions. Each one maps to one /admin/users/{username}/... endpoint. */
function UserDetailModal({ username, me, onClose, onChanged }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(null); // "unblock" | "unlock" | "revoke" | "verify"

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi.getUser(username)
      .then((data) => { if (alive) setUser(data); })
      .catch((err) => { toast.error(apiErrorMessage(err)); onClose(); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const run = async (fn, okMessage) => {
    setBusy(true);
    try {
      const result = await fn();
      if (result && result.username) setUser(result);
      else setUser(await adminApi.getUser(username));
      toast.success(okMessage);
      setConfirm(null);
      setBlocking(false);
      setReason("");
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const check = user ? canManageUser(me, user) : { allowed: false, reason: "" };
  const confirmCopy = {
    unblock: { title: "Unblock this account?", text: "The user will be able to sign in again.", label: "Unblock", action: () => run(() => adminApi.unblockUser(username), "Account unblocked.") },
    unlock: { title: "Clear the login lock?", text: "Removes the temporary lock caused by failed sign-in attempts.", label: "Clear lock", action: () => run(() => adminApi.unlockUser(username), "Login lock cleared.") },
    revoke: { title: "Sign this user out everywhere?", text: "All their sessions end. They can sign in again with their password.", label: "Sign out everywhere", action: () => run(async () => { const r = await adminApi.revokeSessions(username); toast(`${r.revoked} session(s) ended.`); return null; }, "Done.") },
    verify: { title: "Resend the verification email?", text: "A new verification link is emailed to the user.", label: "Send email", action: () => run(() => adminApi.resendVerification(username).then(() => null), "Verification email sent.") },
  }[confirm];

  return (
    <>
      <Modal open onClose={onClose} title="User details" size="lg">
        {loading || !user ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <h4 className="mr-1 font-display text-lg font-extrabold text-ink">{fullName(user)}</h4>
              <Badge tone={ROLE_TONE[user.role] || "neutral"}>{roleLabel(user.role)}</Badge>
              <StatusBadge map={USER_STATUS} value={user.status} />
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Username">@{user.username}</Field>
              <Field label="Email">{user.email}{user.email_confirmed ? "" : " (not verified)"}</Field>
              <Field label="Country">{user.country_name || user.country}</Field>
              <Field label="Joined">{formatDate(user.created_at)}</Field>
              {user.is_blocked && <Field label="Blocked since">{formatDateTime(user.blocked_at)}</Field>}
              {user.is_blocked && <Field label="Block reason">{user.blocked_reason}</Field>}
              {user.status === "locked" && <Field label="Locked until">{formatDateTime(user.locked_until)}</Field>}
              {user.deletion_scheduled_at && <Field label="Deletion scheduled for">{formatDateTime(user.deletion_scheduled_at)}</Field>}
            </dl>

            <p className="mt-5 flex items-start gap-2 rounded-xl bg-primary-soft/60 p-3 text-xs text-muted">
              <Icon name="shield" size={15} className="mt-px shrink-0 text-primary" />
              Admins can manage access only. A user's financial records are never shown in the admin panel.
            </p>

            <div className="mt-5 border-t border-itemBorder pt-5">
              {!check.allowed ? (
                <p className="text-sm text-muted">{check.reason}</p>
              ) : blocking ? (
                <div className="space-y-3">
                  <TextArea label="Reason for blocking" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} required
                    hint="Saved with the block and in the admin audit trail. The user is signed out immediately." />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => { setBlocking(false); setReason(""); }} disabled={busy}>Cancel</Button>
                    <Button variant="danger" loading={busy} disabled={reason.trim().length < 3}
                      onClick={() => run(() => adminApi.blockUser(username, reason.trim()), "Account blocked.")}>Block account</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.is_blocked ? (
                    <Button variant="secondary" onClick={() => setConfirm("unblock")}><Icon name="check" size={15} /> Unblock</Button>
                  ) : (
                    <Button variant="dangerGhost" onClick={() => setBlocking(true)}><Icon name="ban" size={15} /> Block</Button>
                  )}
                  {user.status === "locked" && <Button variant="secondary" onClick={() => setConfirm("unlock")}><Icon name="key" size={15} /> Clear login lock</Button>}
                  {!user.email_confirmed && !user.deletion_scheduled_at && <Button variant="secondary" onClick={() => setConfirm("verify")}><Icon name="mail" size={15} /> Resend verification</Button>}
                  <Button variant="secondary" onClick={() => setConfirm("revoke")}><Icon name="logout" size={15} /> Sign out everywhere</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {confirmCopy && (
        <ConfirmDialog open onClose={() => setConfirm(null)} onConfirm={confirmCopy.action} loading={busy}
          title={confirmCopy.title} description={confirmCopy.text} confirmLabel={confirmCopy.label} tone="primary" />
      )}
    </>
  );
}

export default function Users() {
  const { me } = useAdmin();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openUser, setOpenUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.listUsers({
        q: debouncedSearch.trim() || undefined, status: status || undefined, role: role || undefined, page, page_size: pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
      const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
      if (page > lastPage) setPage(lastPage);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, role, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const filter = (setter) => (value) => { setter(value); setPage(1); };

  const columns = [
    {
      key: "user", header: "User",
      render: (u) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{fullName(u)}</p>
          <p className="truncate text-xs text-muted">@{u.username}</p>
        </div>
      ),
    },
    { key: "email", header: "Email", render: (u) => <span className="break-all text-muted">{u.email}</span> },
    { key: "role", header: "Role", render: (u) => <Badge tone={ROLE_TONE[u.role] || "neutral"}>{roleLabel(u.role)}</Badge> },
    { key: "status", header: "Status", render: (u) => <StatusBadge map={USER_STATUS} value={u.status} /> },
    { key: "created_at", header: "Joined", render: (u) => <span className="whitespace-nowrap text-muted">{formatDate(u.created_at)}</span> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Accounts"
        title="Users"
        subtitle="See account status and manage access. Financial records stay private and are never shown here."
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <SearchBox value={search} onChange={filter(setSearch)} placeholder="Search name, username or email" />
          <FilterSelect label="Status" value={status} onChange={filter(setStatus)}
            options={[["", "Any status"], ["active", "Active"], ["unverified", "Unverified"], ["blocked", "Blocked"], ["locked", "Locked"], ["pending_deletion", "Pending deletion"]]} />
          <FilterSelect label="Role" value={role} onChange={filter(setRole)}
            options={[["", "Any role"], ["user", "Members"], ["admin", "Admins"], ["super_admin", "Super admin"]]} />
        </div>

        {loading && items.length === 0 ? (
          <div className="flex justify-center py-14"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search or filter." />
        ) : (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <Table columns={columns} rows={items} rowKey="username" onRowClick={(u) => setOpenUser(u.username)} />
          </div>
        )}

        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
      </Card>

      {openUser && <UserDetailModal username={openUser} me={me} onClose={() => setOpenUser(null)} onChanged={load} />}
    </div>
  );
}
