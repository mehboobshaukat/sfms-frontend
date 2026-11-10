import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { categoriesApi } from "../../api/categories";
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

const emptyForm = { name: "", description: "", transaction_type_slugs: [] };

export default function Categories() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [linksTarget, setLinksTarget] = useState(null);
  const [linkBusy, setLinkBusy] = useState(null);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [activateTarget, setActivateTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const c = await categoriesApi.listPaged({ page, page_size: pageSize });
      setItems(c.items);
      setTotal(c.total);
      if (page > Math.max(1, Math.ceil(c.total / pageSize))) setPage(Math.max(1, Math.ceil(c.total / pageSize)));

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

  const deleteGuard = useDeleteGuard(categoriesApi.remove, load);
  const typeName = (slug) => types.find((t) => t.slug === slug)?.name || slug;

  const ensureLookupChoices = async () => {
    if (types.length > 0) return;
    try {
      setTypes(await transactionTypesApi.list({ active_only: true }));
    } catch (err) { toast.error(apiErrorMessage(err)); }
  };
  const openLinks = async (item) => {
    await ensureLookupChoices();
    setLinksTarget(item);
  };

  const openCreate = async () => {
    await ensureLookupChoices();
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description || "", transaction_type_slugs: [] });
    setModalOpen(true);
  };

  const toggleType = (slug) => {
    setForm((f) => ({
      ...f,
      transaction_type_slugs: f.transaction_type_slugs.includes(slug)
        ? f.transaction_type_slugs.filter((s) => s !== slug)
        : [...f.transaction_type_slugs, slug],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await categoriesApi.update(editing.slug, { name: form.name, description: form.description || null });
        toast.success("Category updated.");
      } else {
        await categoriesApi.create({ name: form.name, description: form.description || null, transaction_type_slugs: form.transaction_type_slugs });
        toast.success("Category created.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleLink = async (typeSlug, currentlyLinked) => {
    setLinkBusy(typeSlug);
    try {
      if (currentlyLinked) {
        await categoriesApi.unlink(linksTarget.slug, typeSlug);
      } else {
        await categoriesApi.link(linksTarget.slug, typeSlug);
      }
      const updatedPage = await categoriesApi.listPaged({ page, page_size: pageSize });
      const updated = updatedPage.items;
      setItems(updated);
      setLinksTarget(updated.find((c) => c.slug === linksTarget.slug));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLinkBusy(null);
    }
  };

  const handleDeactivate = async () => {
    try {
      await categoriesApi.update(deactivateTarget.slug, { is_active: false });
      toast.success("Deactivated.");
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };
  const handleActivate = async () => {
    try {
      await categoriesApi.update(activateTarget.slug, { is_active: true });
      toast.success("Activated.");
      setActivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <SettingsIntro icon="dashboard" title="Categories" description={"Categories are reusable \u2014 link the same category to multiple transaction types instead of recreating it. Click \"Links\" on any category to manage which types it's used under."} action={<Button variant="luxury" onClick={openCreate}>+ Add Category</Button>} />

      <SettingsPanel
        items={items} total={total} page={page} pageSize={pageSize} loading={loading}
        onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }}
        emptyTitle="No categories yet" emptyAction={<Button variant="luxury" onClick={openCreate}>Add Category</Button>}
        renderItem={(c) => (
<div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-ink">{c.name}</h4>
                    {!c.is_active && <Badge tone="neutral">Inactive</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {c.transaction_type_slugs.length === 0 ? (
                      <span className="text-xs text-muted">Not linked to any type yet</span>
                    ) : (
                      c.transaction_type_slugs.map((s) => (
                        <Badge key={s} tone="gold">{c.transaction_type_labels?.[s] || typeName(s)}</Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => openLinks(c)}>Links</Button>
                  {c.is_active ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Edit</Button>
                      <Button size="sm" variant="dangerGhost" onClick={() => setDeactivateTarget(c)}>Deactivate</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="luxury" onClick={() => setActivateTarget(c)}>Activate</Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => deleteGuard.request(c.slug, `category "${c.name}"`)}>Delete</Button>
                </div>
              </div>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Category" : "Add Category"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="luxury" onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {!editing && (
            <div>
              <span className="block text-sm font-medium text-ink mb-1.5">Link to transaction type(s)</span>
              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <label
                    key={t.slug}
                    className={`cursor-pointer text-sm px-3 py-1.5 rounded-full border ${
                      form.transaction_type_slugs.includes(t.slug) ? "border-primary-border bg-primary-soft text-primary" : "border-cardBorder text-muted"
                    }`}
                  >
                    <input type="checkbox" className="hidden" checked={form.transaction_type_slugs.includes(t.slug)} onChange={() => toggleType(t.slug)} />
                    {t.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted mt-1.5">Optional — you can link it later from the Links button instead.</p>
            </div>
          )}
        </form>
      </Modal>

      <Modal open={!!linksTarget} onClose={() => setLinksTarget(null)} title={`Links for "${linksTarget?.name}"`} size="sm">
        <div className="space-y-2">
          {types.map((t) => {
            const linked = linksTarget?.transaction_type_slugs.includes(t.slug);
            return (
              <div key={t.slug} className="flex items-center justify-between border-b border-itemBorder last:border-0 py-2.5">
                <span className="text-sm text-ink">{t.name}</span>
                <Button
                  size="sm"
                  variant={linked ? "dangerGhost" : "luxury"}
                  loading={linkBusy === t.slug}
                  onClick={() => toggleLink(t.slug, linked)}
                >
                  {linked ? "Unlink" : "Link"}
                </Button>
              </div>
            );
          })}
        </div>
      </Modal>

      <ConfirmDialog open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirm={handleDeactivate} title="Deactivate this category?" description="Hidden from new transactions, existing history unaffected." confirmLabel="Deactivate" />
      <ConfirmDialog open={!!activateTarget} onClose={() => setActivateTarget(null)} onConfirm={handleActivate} tone="neutral" title="Activate this category?" description="It becomes available again." confirmLabel="Activate" />
      <DeleteGuardDialog guard={deleteGuard} itemNoun="category" />
    </div>
  );
}
