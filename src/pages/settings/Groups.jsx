import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { groupsApi } from "../../api/groups";
import { categoriesApi } from "../../api/categories";
import { apiErrorMessage } from "../../api/client";

import { SettingsIntro, SettingsPanel } from "../../components/settings/SettingsKit";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DeleteGuardDialog from "../../components/ui/DeleteGuardDialog";
import { useDeleteGuard } from "../../hooks/useDeleteGuard";
import { Input } from "../../components/ui/Input";

const emptyForm = { name: "", description: "", category_slugs: [] };

export default function Groups() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [categories, setCategories] = useState([]);
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
      const g = await groupsApi.listPaged({ page, page_size: pageSize });
      setItems(g.items);
      setTotal(g.total);
      if (page > Math.max(1, Math.ceil(g.total / pageSize))) setPage(Math.max(1, Math.ceil(g.total / pageSize)));

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

  const deleteGuard = useDeleteGuard(groupsApi.remove, load);
  const categoryName = (slug) => categories.find((c) => c.slug === slug)?.name || slug;

  const ensureLookupChoices = async () => {
    if (categories.length > 0) return;
    try {
      setCategories(await categoriesApi.list({ active_only: true }));
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
    setForm({ name: item.name, description: item.description || "", category_slugs: [] });
    setModalOpen(true);
  };

  const toggleCategory = (slug) => {
    setForm((f) => ({
      ...f,
      category_slugs: f.category_slugs.includes(slug) ? f.category_slugs.filter((s) => s !== slug) : [...f.category_slugs, slug],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await groupsApi.update(editing.slug, { name: form.name, description: form.description || null });
        toast.success("Group updated.");
      } else {
        await groupsApi.create({ name: form.name, description: form.description || null, category_slugs: form.category_slugs });
        toast.success("Group created.");
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
        await groupsApi.unlink(linksTarget.slug, typeSlug);
      } else {
        await groupsApi.link(linksTarget.slug, typeSlug);
      }
      const updatedPage = await groupsApi.listPaged({ page, page_size: pageSize });
      const updated = updatedPage.items;
      setItems(updated);
      setLinksTarget(updated.find((g) => g.slug === linksTarget.slug));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLinkBusy(null);
    }
  };

  const handleDeactivate = async () => {
    try {
      await groupsApi.update(deactivateTarget.slug, { is_active: false });
      toast.success("Deactivated.");
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };
  const handleActivate = async () => {
    try {
      await groupsApi.update(activateTarget.slug, { is_active: true });
      toast.success("Activated.");
      setActivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <SettingsIntro icon="reports" title="Groups" description={"Groups are reusable \u2014 link the same group to multiple categories instead of recreating it. Click \"Links\" on any group to manage which categories it's used under."} action={<Button variant="luxury" onClick={openCreate}>+ Add Group</Button>} />

      <SettingsPanel
        items={items} total={total} page={page} pageSize={pageSize} loading={loading}
        onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }}
        emptyTitle="No groups yet" emptyAction={<Button variant="luxury" onClick={openCreate}>Add Group</Button>}
        renderItem={(c) => (
<div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-ink">{c.name}</h4>
                    {!c.is_active && <Badge tone="neutral">Inactive</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {c.category_slugs.length === 0 ? (
                      <span className="text-xs text-muted">Not linked to any category yet</span>
                    ) : (
                      c.category_slugs.map((s) => (
                        <Badge key={s} tone="gold">{c.category_labels?.[s] || categoryName(s)}</Badge>
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
                  <Button size="sm" variant="danger" onClick={() => deleteGuard.request(c.slug, `group "${c.name}"`)}>Delete</Button>
                </div>
              </div>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Group" : "Add Group"}
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
              <span className="block text-sm font-medium text-ink mb-1.5">Link to categories(s)</span>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <label
                    key={c.slug}
                    className={`cursor-pointer text-sm px-3 py-1.5 rounded-full border ${
                      form.category_slugs.includes(c.slug) ? "border-primary-border bg-primary-soft text-primary" : "border-cardBorder text-muted"
                    }`}
                  >
                    <input type="checkbox" className="hidden" checked={form.category_slugs.includes(c.slug)} onChange={() => toggleCategory(c.slug)} />
                    {c.name}
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
          {categories.map((c) => {
            const linked = linksTarget?.category_slugs.includes(c.slug);
            return (
              <div key={c.slug} className="flex items-center justify-between border-b border-itemBorder last:border-0 py-2.5">
                <span className="text-sm text-ink">{c.name}</span>
                <Button
                  size="sm"
                  variant={linked ? "dangerGhost" : "luxury"}
                  loading={linkBusy === c.slug}
                  onClick={() => toggleLink(c.slug, linked)}
                >
                  {linked ? "Unlink" : "Link"}
                </Button>
              </div>
            );
          })}
        </div>
      </Modal>

      <ConfirmDialog open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirm={handleDeactivate} title="Deactivate this group?" description="Hidden from new transactions, existing history unaffected." confirmLabel="Deactivate" />
      <ConfirmDialog open={!!activateTarget} onClose={() => setActivateTarget(null)} onConfirm={handleActivate} tone="neutral" title="Activate this group?" description="It becomes available again." confirmLabel="Activate" />
      <DeleteGuardDialog guard={deleteGuard} itemNoun="group" />
    </div>
  );
}
