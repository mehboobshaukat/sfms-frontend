import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { contactsApi } from "../../api/contacts";
import { groupsApi } from "../../api/groups";
import { apiErrorMessage } from "../../api/client";

import { SettingsIntro, SettingsPanel } from "../../components/settings/SettingsKit";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DeleteGuardDialog from "../../components/ui/DeleteGuardDialog";
import { useDeleteGuard } from "../../hooks/useDeleteGuard";
import { Input } from "../../components/ui/Input";

const emptyForm = { name: "", phone: "", email: "", group_slugs: [] };

export default function Contacts() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [groups, setGroups] = useState([]);
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
      const ct = await contactsApi.listPaged({ page, page_size: pageSize });
      setItems(ct.items);
      setTotal(ct.total);
      if (page > Math.max(1, Math.ceil(ct.total / pageSize))) setPage(Math.max(1, Math.ceil(ct.total / pageSize)));

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

  const deleteGuard = useDeleteGuard(contactsApi.remove, load);
  const groupName = (slug) => groups.find((g) => g.slug === slug)?.name || slug;

  const ensureLookupChoices = async () => {
    if (groups.length > 0) return;
    try {
      setGroups(await groupsApi.list({ active_only: true }));
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
    setForm({ name: item.name, phone: item.phone || "", email: item.email || "", group_slugs: [] });
    setModalOpen(true);
  };

  const toggleGroup = (slug) => {
    setForm((f) => ({
      ...f,
      group_slugs: f.group_slugs.includes(slug) ? f.group_slugs.filter((s) => s !== slug) : [...f.group_slugs, slug],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await contactsApi.update(editing.slug, { name: form.name, phone: form.phone || null, email: form.email || null });
        toast.success("Contact updated.");
      } else {
        await contactsApi.create({ name: form.name, phone: form.phone || null, email: form.email || null, group_slugs: form.group_slugs });
        toast.success("Contact created.");
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
        await contactsApi.unlink(linksTarget.slug, typeSlug);
      } else {
        await contactsApi.link(linksTarget.slug, typeSlug);
      }
      const updatedPage = await contactsApi.listPaged({ page, page_size: pageSize });
      const updated = updatedPage.items;
      setItems(updated);
      setLinksTarget(updated.find((ct) => ct.slug === linksTarget.slug));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLinkBusy(null);
    }
  };

  const handleDeactivate = async () => {
    try {
      await contactsApi.update(deactivateTarget.slug, { is_active: false });
      toast.success("Deactivated.");
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };
  const handleActivate = async () => {
    try {
      await contactsApi.update(activateTarget.slug, { is_active: true });
      toast.success("Activated.");
      setActivateTarget(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <SettingsIntro icon="profile" title="Contacts" description={"Contacts are reusable \u2014 link the same contact to multiple groups instead of recreating it. Names must be unique, so use a distinguishing name for two different people (e.g. \"Ahmed Cousin\" vs \"Ahmed Friend\")."} action={<Button variant="luxury" onClick={openCreate}>+ Add Contact</Button>} />

      <SettingsPanel
        items={items} total={total} page={page} pageSize={pageSize} loading={loading}
        onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }}
        emptyTitle="No contacts yet" emptyAction={<Button variant="luxury" onClick={openCreate}>Add Contact</Button>}
        renderItem={(c) => (
<div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-ink">{c.name}</h4>
                    {!c.is_active && <Badge tone="neutral">Inactive</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {c.group_slugs.length === 0 ? (
                      <span className="text-xs text-muted">Not linked to any group yet</span>
                    ) : (
                      c.group_slugs.map((s) => (
                        <Badge key={s} tone="gold">{c.group_labels?.[s] || groupName(s)}</Badge>
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
                  <Button size="sm" variant="danger" onClick={() => deleteGuard.request(c.slug, `contact "${c.name}"`)}>Delete</Button>
                </div>
              </div>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Contact" : "Add Contact"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="luxury" onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {!editing && (
            <div>
              <span className="block text-sm font-medium text-ink mb-1.5">Link to group(s)</span>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <label
                    key={g.slug}
                    className={`cursor-pointer text-sm px-3 py-1.5 rounded-full border ${
                      form.group_slugs.includes(g.slug) ? "border-primary-border bg-primary-soft text-primary" : "border-cardBorder text-muted"
                    }`}
                  >
                    <input type="checkbox" className="hidden" checked={form.group_slugs.includes(g.slug)} onChange={() => toggleGroup(g.slug)} />
                    {g.name}
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
          {groups.map((g) => {
            const linked = linksTarget?.group_slugs.includes(g.slug);
            return (
              <div key={g.slug} className="flex items-center justify-between border-b border-itemBorder last:border-0 py-2.5">
                <span className="text-sm text-ink">{g.name}</span>
                <Button
                  size="sm"
                  variant={linked ? "dangerGhost" : "luxury"}
                  loading={linkBusy === g.slug}
                  onClick={() => toggleLink(g.slug, linked)}
                >
                  {linked ? "Unlink" : "Link"}
                </Button>
              </div>
            );
          })}
        </div>
      </Modal>

      <ConfirmDialog open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirm={handleDeactivate} title="Deactivate this contact?" description="Hidden from new transactions, existing history unaffected." confirmLabel="Deactivate" />
      <ConfirmDialog open={!!activateTarget} onClose={() => setActivateTarget(null)} onConfirm={handleActivate} tone="neutral" title="Activate this contact?" description="It becomes available again." confirmLabel="Activate" />
      <DeleteGuardDialog guard={deleteGuard} itemNoun="contact" />
    </div>
  );
}
