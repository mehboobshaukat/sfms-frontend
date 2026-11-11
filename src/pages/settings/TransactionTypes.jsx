import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { transactionTypesApi } from "../../api/transactionTypes";
import { apiErrorMessage } from "../../api/client";

import { SettingsIntro, SettingsPanel } from "../../components/settings/SettingsKit";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DeleteGuardDialog from "../../components/ui/DeleteGuardDialog";
import { useDeleteGuard } from "../../hooks/useDeleteGuard";
import { Input } from "../../components/ui/Input";
import Select from "../../components/ui/Select";

const emptyForm = { name: "", nature: "outflow" };

export default function TransactionTypes() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [activateTarget, setActivateTarget] = useState(null);
  const [activating, setActivating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await transactionTypesApi.listPaged({ page, page_size: pageSize });
      setItems(data.items);
      setTotal(data.total);
      if (page > Math.max(1, Math.ceil(data.total / pageSize))) setPage(Math.max(1, Math.ceil(data.total / pageSize)));
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

  const deleteGuard = useDeleteGuard(transactionTypesApi.remove, load);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, nature: item.nature });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await transactionTypesApi.update(editing.slug, { name: form.name, nature: form.nature });
        toast.success("Transaction type updated.");
      } else {
        await transactionTypesApi.create(form);
        toast.success("Transaction type created.");
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
      await transactionTypesApi.update(deactivateTarget.slug, { is_active: false });
      toast.success("Deactivated.");
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };
  const handleActivate = async () => {
    setActivating(true);
    try {
      await transactionTypesApi.update(activateTarget.slug, { is_active: true });
      toast.success("Activated.");
      setActivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setActivating(false);
    }
  };

  const columns = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "nature", header: "Nature", render: (r) => <Badge tone={r.nature === "inflow" ? "emerald" : r.nature === "outflow" ? "danger" : "gold"}>{r.nature}</Badge> },
    { key: "owner", header: "Owner", render: (r) => (r.is_default ? <Badge tone="neutral">System default</Badge> : <Badge tone="gold">Custom</Badge>) },
    { key: "status", header: "Status", render: (r) => (r.is_active ? <Badge tone="emerald">Active</Badge> : <Badge tone="neutral">Inactive</Badge>) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="sfms-actions justify-end">
          {!r.is_default && r.is_active && (
            <>
              <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                Edit
              </Button>
              <Button size="sm" variant="dangerGhost" onClick={() => setDeactivateTarget(r)}>
                Deactivate
              </Button>
            </>
          )}
          {!r.is_default && !r.is_active && (
            <Button size="sm" variant="luxury" onClick={() => setActivateTarget(r)}>
              Activate
            </Button>
          )}
          {!r.is_default && (
            <Button size="sm" variant="danger" onClick={() => deleteGuard.request(r.slug, `transaction type "${r.name}"`)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <SettingsIntro icon="transactions" title="Transaction types" description={"The 15 system defaults (Income, Expense, Transfer, Withdraw, Deposit, Support, the 4 loan types, Charges, Refund, the 2 Item Payment types, Other) are shared by every user and can't be edited or removed. Add your own custom types below."} action={<Button variant="luxury" onClick={openCreate}> + Add Type </Button>} />

      <SettingsPanel
        items={items} total={total} page={page} pageSize={pageSize} loading={loading}
        onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }}
        columns={columns} emptyTitle="Nothing here yet"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Transaction Type" : "Add Transaction Type"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="luxury" onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Nature" required value={form.nature} onChange={(e) => setForm({ ...form, nature: e.target.value })}>
            <option value="inflow">Inflow</option>
            <option value="outflow">Outflow</option>
            <option value="transfer">Transfer (neutral, between your own accounts)</option>
          </Select>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate this type?"
        description="It will be hidden from new transactions but existing history is unaffected."
        confirmLabel="Deactivate"
      />
      <ConfirmDialog
        open={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivate}
        loading={activating}
        tone="neutral"
        title="Activate this type?"
        description="It will become available again when adding transactions."
        confirmLabel="Activate"
      />

      <DeleteGuardDialog guard={deleteGuard} itemNoun="transaction type" />
    </div>
  );
}
