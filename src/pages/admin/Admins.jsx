import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { adminApi } from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useAdmin } from "../../components/layout/AdminLayout";
import { SuperAdminOnly } from "../../components/layout/AdminRoute";
import PageHeader from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import Table from "../../components/ui/Table";
import EmptyState from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { formatDate } from "../../lib/formatters";
import { ROLE_SUPER_ADMIN, roleLabel } from "../../lib/roles";
import { USER_STATUS, StatusBadge, fullName } from "./adminUi";

/** One modal for both "make admin" (needs a username) and "remove admin" (username is fixed). Both re-check the super admin's password. */
function PasswordModal({ mode, target, onClose, onDone }) {
  const adding = mode === "add";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (adding) {
        await adminApi.promoteAdmin(username.trim().replace(/^@/, ""), password);
        toast.success("Admin added.");
      } else {
        await adminApi.removeAdmin(target.username, password);
        toast.success("Admin access removed.");
      }
      onDone();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={adding ? "Add an admin" : "Remove admin access"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="admin-role-form" variant={adding ? "primary" : "danger"} loading={busy} disabled={!password || (adding && !username.trim())}>
            {adding ? "Make admin" : "Remove access"}
          </Button>
        </>
      }
    >
      <form id="admin-role-form" onSubmit={submit} className="space-y-4">
        {adding ? (
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus autoComplete="off"
            hint="The person must already have a verified, active SFMS account." />
        ) : (
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{fullName(target)}</span> (@{target.username}) keeps their account but loses all admin access immediately.
          </p>
        )}
        <Input label="Your password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
          hint="Role changes need your password as confirmation." />
      </form>
    </Modal>
  );
}

function AdminsContent() {
  const { me } = useAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: "add" } | { mode: "remove", target }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await adminApi.listAdmins());
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      key: "user", header: "Admin",
      render: (u) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{fullName(u)}</p>
          <p className="truncate text-xs text-muted">@{u.username}</p>
        </div>
      ),
    },
    { key: "email", header: "Email", render: (u) => <span className="break-all text-muted">{u.email}</span> },
    { key: "role", header: "Role", render: (u) => <Badge tone={u.role === ROLE_SUPER_ADMIN ? "gold" : "primary"}>{roleLabel(u.role)}</Badge> },
    { key: "status", header: "Status", render: (u) => <StatusBadge map={USER_STATUS} value={u.status} /> },
    { key: "created_at", header: "Joined", render: (u) => <span className="whitespace-nowrap text-muted">{formatDate(u.created_at)}</span> },
    {
      key: "actions", header: "", className: "text-right",
      render: (u) => (u.role === ROLE_SUPER_ADMIN || u.username.toLowerCase() === me.username.toLowerCase() ? null : (
        <Button size="sm" variant="dangerGhost" onClick={() => setModal({ mode: "remove", target: u })}>Remove admin</Button>
      )),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Super admin"
        title="Admins"
        subtitle="Only you can add or remove admins. Admins can handle messages and block or unblock regular users, nothing else."
        actions={<Button onClick={() => setModal({ mode: "add" })}><Icon name="plus" size={16} /> Add admin</Button>}
      />

      <Card>
        {loading ? (
          <div className="flex justify-center py-14"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState title="No admins yet" />
        ) : (
          <Table columns={columns} rows={items} rowKey="username" />
        )}
      </Card>

      {modal && <PasswordModal mode={modal.mode} target={modal.target} onClose={() => setModal(null)} onDone={load} />}
    </div>
  );
}

export default function Admins() {
  const { me } = useAdmin();
  return (
    <SuperAdminOnly me={me}>
      <AdminsContent />
    </SuperAdminOnly>
  );
}
