import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { paymentMethodsApi } from "../../api/paymentMethods";
import { accountsApi } from "../../api/accounts";
import { apiErrorMessage } from "../../api/client";

import { SettingsIntro, SettingsPanel } from "../../components/settings/SettingsKit";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Input } from "../../components/ui/Input";
import Select from "../../components/ui/Select";

const emptyForm = { account_slug: "", name: "" };

export default function PaymentMethods() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [activateTarget, setActivateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const pm = await paymentMethodsApi.listPaged({ page, page_size: pageSize });
      setItems(pm.items);
      setTotal(pm.total);
      if (page > Math.max(1, Math.ceil(pm.total / pageSize))) setPage(Math.max(1, Math.ceil(pm.total / pageSize)));

    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // Keep selected page and page size synchronized with the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const accountName = (slug) => accounts.find((a) => a.slug === slug)?.name || "—";

  const openCreate = async () => {
    try {
      // Fetch account choices only when the creation form needs them.
      const activeAccounts = await accountsApi.list({ active_only: true });
      setAccounts(activeAccounts);
      if (activeAccounts.length === 0) {
        toast.error("Add an account before creating a payment method.");
        return;
      }
      setEditing(null);
      setForm({ account_slug: activeAccounts[0].slug, name: "" });
      setModalOpen(true);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ account_slug: item.account_slug, name: item.name });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await paymentMethodsApi.update(editing.slug, { name: form.name });
        toast.success("Payment method updated.");
      } else {
        await paymentMethodsApi.create(form);
        toast.success("Payment method created.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await paymentMethodsApi.update(deactivateTarget.slug, { is_active: false });
      toast.success("Deactivated.");
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };
  const handleActivate = async () => {
    try {
      await paymentMethodsApi.update(activateTarget.slug, { is_active: true });
      toast.success("Activated.");
      setActivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await paymentMethodsApi.remove(deleteTarget.slug);
      toast.success("Payment method deleted.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "account", header: "Account", render: (r) => <Badge tone="neutral">{r.account_label || accountName(r.account_slug)}</Badge> },
    { key: "status", header: "Status", render: (r) => (r.is_active ? <Badge tone="emerald">Active</Badge> : <Badge tone="neutral">Inactive</Badge>) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="sfms-actions justify-end">
          {r.is_active && (
            <>
              <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
              <Button size="sm" variant="dangerGhost" onClick={() => setDeactivateTarget(r)}>Deactivate</Button>
            </>
          )}
          {!r.is_active && (
            <Button size="sm" variant="luxury" onClick={() => setActivateTarget(r)}>Activate</Button>
          )}
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <SettingsIntro icon="credit" title="Payment methods" description={"Payment methods are tied to one account \u2014 cards, wallets, or channels you use to move money through it."} action={<Button variant="luxury" onClick={openCreate}> + Add Payment Method </Button>} />

      <SettingsPanel
        items={items} total={total} page={page} pageSize={pageSize} loading={loading}
        onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }}
        columns={columns} emptyTitle="No payment methods yet" emptyDescription={accounts.length === 0 ? "Add an account first." : undefined}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Payment Method" : "Add Payment Method"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="luxury" onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editing && (
            <Select label="Account" required value={form.account_slug} onChange={(e) => setForm({ ...form, account_slug: e.target.value })}>
              {accounts.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </Select>
          )}
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Visa Debit Card" />
        </form>
      </Modal>

      <ConfirmDialog open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirm={handleDeactivate} title="Deactivate this payment method?" description="It will be hidden from new transactions." confirmLabel="Deactivate" />
      <ConfirmDialog open={!!activateTarget} onClose={() => setActivateTarget(null)} onConfirm={handleActivate} tone="neutral" title="Activate this payment method?" description="It will become available again." confirmLabel="Activate" />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} title="Delete this payment method?" description="Blocked if any transaction still uses it. This permanently removes it." confirmLabel="Delete" />
    </div>
  );
}
