import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { prioritiesApi } from "../../api/priorities";
import { apiErrorMessage } from "../../api/client";

import { SettingsIntro, SettingsPanel } from "../../components/settings/SettingsKit";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DeleteGuardDialog from "../../components/ui/DeleteGuardDialog";
import { useDeleteGuard } from "../../hooks/useDeleteGuard";
import { Input } from "../../components/ui/Input";

const emptyForm = { name: "" };

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
      const data = await prioritiesApi.listPaged({ page, page_size: pageSize });
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

  const deleteGuard = useDeleteGuard(prioritiesApi.remove, load);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await prioritiesApi.update(editing.slug, { name: form.name });
        toast.success("Priority updated.");
      } else {
        await prioritiesApi.create(form);
        toast.success("Priority created.");
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
      await prioritiesApi.update(deactivateTarget.slug, { is_active: false });
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
      await prioritiesApi.update(activateTarget.slug, { is_active: true });
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
            <Button size="sm" variant="danger" onClick={() => deleteGuard.request(r.slug, `priority "${r.name}"`)}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <SettingsIntro icon="goal" title="Priorities" description={"The 3 system defaults (Emergency, Necessary, Wish) are shared by every user and can't be edited or removed. Add your own custom priorities below."} action={<Button variant="luxury" onClick={openCreate}> + Add Priority </Button>} />

      <SettingsPanel
        items={items} total={total} page={page} pageSize={pageSize} loading={loading}
        onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }}
        columns={columns} emptyTitle="Nothing here yet"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Priority" : "Add Priority"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="luxury" onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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

      <DeleteGuardDialog guard={deleteGuard} itemNoun="priority" />
    </div>
  );
}
