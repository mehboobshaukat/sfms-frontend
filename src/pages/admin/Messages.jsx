import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { adminApi } from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useAdmin } from "../../components/layout/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Input, TextArea } from "../../components/ui/Input";
import { formatDateTime } from "../../lib/formatters";
import { FilterSelect, MESSAGE_STATUS, SearchBox, StatusBadge, shortDate, useDebounced } from "./adminUi";

const PAGE_SIZE = 20;
const VIEWS = [
  ["inbox", "Inbox"],
  ["archived", "Archived"],
  ["trash", "Trash"],
];
const BULK_ACTIONS = {
  inbox: [["read", "Mark read"], ["unread", "Mark unread"], ["archive", "Archive"], ["delete", "Delete"]],
  archived: [["unarchive", "Move to inbox"], ["delete", "Delete"]],
  trash: [["restore", "Restore"]],
};
// Actions after which the open message no longer belongs to the current view.
const LEAVES_VIEW = new Set(["archive", "unarchive", "delete", "restore"]);

/* ----------------------------------------------------------------- reply box */
function ReplyBox({ message, onSent }) {
  const [subject, setSubject] = useState(/^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`);
  const [body, setBody] = useState("");
  const [resolve, setResolve] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const updated = await adminApi.replyToMessage(message.slug, { subject: subject.trim() || undefined, body, mark_resolved: resolve });
      toast.success("Reply sent by email.");
      setBody("");
      setResolve(false);
      onSent(updated);
    } catch (err) {
      toast.error(apiErrorMessage(err, "The reply could not be sent."));
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={send} className="mt-6 rounded-2xl border border-cardBorder bg-hover/30 p-4">
      <p className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-ink">
        <Icon name="send" size={16} /> Reply to {message.name} by email
      </p>
      <div className="space-y-3">
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
        <TextArea label="Message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={5} required placeholder="Write your reply…" />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} className="h-4 w-4 rounded border-cardBorder" />
          Mark as resolved after sending
        </label>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-subtle">Sent to {message.email}</p>
          <Button type="submit" loading={sending} disabled={!body.trim()}>Send reply</Button>
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------- message pane */
function MessageDetail({ message, onPatch, onTrash, onRestore, onSent, onBack }) {
  const trashed = message.is_trashed;
  return (
    <Card className="!p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-itemBorder p-5">
        <div className="min-w-0">
          <button onClick={onBack} className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary lg:hidden">
            <Icon name="arrowLeft" size={14} /> Back to list
          </button>
          <h3 className="break-words font-display text-lg font-extrabold tracking-[-0.02em] text-ink">{message.subject}</h3>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-ink">{message.name}</span> · {message.email}
          </p>
          <p className="mt-0.5 text-xs text-subtle">{formatDateTime(message.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {trashed ? <Badge tone="danger">In trash</Badge> : message.is_archived && <Badge tone="neutral">Archived</Badge>}
          <StatusBadge map={MESSAGE_STATUS} value={message.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-itemBorder px-5 py-3">
        {trashed ? (
          <Button size="sm" variant="secondary" onClick={onRestore}><Icon name="undo" size={14} /> Restore</Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={() => onPatch({ is_read: !message.is_read })}>
              <Icon name="mail" size={14} /> {message.is_read ? "Mark unread" : "Mark read"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onPatch({ is_archived: !message.is_archived }, true)}>
              <Icon name="archive" size={14} /> {message.is_archived ? "Move to inbox" : "Archive"}
            </Button>
            <select
              aria-label="Status"
              value={message.status}
              onChange={(e) => onPatch({ status: e.target.value })}
              className="rounded-xl border border-cardBorder bg-btnSec px-3 py-2 text-xs font-bold text-ink outline-none focus:border-primary"
            >
              {Object.entries(MESSAGE_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <Button size="sm" variant="dangerGhost" className="ml-auto" onClick={onTrash}><Icon name="trash" size={14} /> Delete</Button>
          </>
        )}
      </div>

      <div className="p-5">
        {/* Visitor-written text: always rendered as plain text, NEVER as HTML (no dangerouslySetInnerHTML). */}
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{message.message}</div>

        {message.replies.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-nav">Replies ({message.replies.length})</p>
            {message.replies.map((reply, i) => (
              <div key={i} className="rounded-xl border border-cardBorder bg-primary-soft/40 p-3.5">
                <p className="text-xs text-muted">
                  <span className="font-bold text-ink">{reply.admin_name}</span> · {formatDateTime(reply.created_at)} · {reply.subject}
                </p>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-ink">{reply.body}</div>
              </div>
            ))}
          </div>
        )}

        {!trashed && <ReplyBox key={message.slug} message={message} onSent={onSent} />}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------------- page */
export default function Messages() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { stats, refreshStats } = useAdmin();

  const [view, setView] = useState("inbox");
  const [statusFilter, setStatusFilter] = useState("");
  const [readFilter, setReadFilter] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.listMessages({
        view,
        status: statusFilter || undefined,
        is_read: readFilter === "all" ? undefined : readFilter === "read",
        q: debouncedSearch.trim() || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
      const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
      if (page > lastPage) setPage(lastPage);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [view, statusFilter, readFilter, debouncedSearch, page]);

  useEffect(() => { loadList(); }, [loadList]);

  const afterChange = useCallback(() => { loadList(); refreshStats(); }, [loadList, refreshStats]);

  // Open message: load it, and quietly mark it read the first time it is opened.
  useEffect(() => {
    if (!slug) { setDetail(null); return undefined; }
    let alive = true;
    setDetailLoading(true);
    (async () => {
      try {
        let data = await adminApi.getMessage(slug);
        if (!alive) return;
        if (!data.is_read && !data.is_trashed) {
          data = await adminApi.updateMessage(slug, { is_read: true });
          if (!alive) return;
          afterChange();
        }
        setDetail(data);
      } catch (err) {
        if (!alive) return;
        toast.error(apiErrorMessage(err, "Message not found."));
        navigate("/admin/messages", { replace: true });
      } finally {
        if (alive) setDetailLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const resetTo = (setter) => (value) => { setter(value); setPage(1); setSelected(new Set()); };
  const changeView = (next) => { resetTo(setView)(next); if (slug) navigate("/admin/messages"); };
  const closeDetail = () => navigate("/admin/messages");

  const patchDetail = async (patch, leaves = false) => {
    try {
      const updated = await adminApi.updateMessage(detail.slug, patch);
      setDetail(updated);
      afterChange();
      if (leaves) { toast.success(updated.is_archived ? "Archived." : "Moved to inbox."); closeDetail(); }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const trashDetail = async () => {
    setDeleting(true);
    try {
      await adminApi.trashMessage(detail.slug);
      toast.success("Moved to trash. It is deleted for good after 30 days.");
      setConfirmDelete(false);
      afterChange();
      closeDetail();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const restoreDetail = async () => {
    try {
      await adminApi.restoreMessage(detail.slug);
      toast.success("Restored.");
      afterChange();
      closeDetail();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const onReplySent = (updated) => { setDetail(updated); afterChange(); };

  const runBulk = async (action) => {
    setBulkBusy(true);
    try {
      const slugs = [...selected];
      const { updated } = await adminApi.bulkMessages(slugs, action);
      toast.success(`${updated} message${updated === 1 ? "" : "s"} updated.`);
      setSelected(new Set());
      if (slug && slugs.includes(slug) && LEAVES_VIEW.has(action)) closeDetail();
      afterChange();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  };

  const toggle = (itemSlug) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(itemSlug)) next.delete(itemSlug); else next.add(itemSlug);
    return next;
  });
  const allSelected = items.length > 0 && items.every((m) => selected.has(m.slug));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((m) => m.slug)));

  const tabCount = useMemo(() => ({
    inbox: stats?.unread || 0, archived: stats?.archived || 0, trash: stats?.trash || 0,
  }), [stats]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Contact messages"
        subtitle="Messages sent through the public contact form. Reply by email, archive them, or move them to the trash."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        {/* ------------ list pane ------------ */}
        <Card className={`!p-0 ${slug ? "hidden lg:block" : "block"}`}>
          <div className="flex gap-1 border-b border-itemBorder p-2">
            {VIEWS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => changeView(value)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${view === value ? "bg-primary-soft text-primary" : "text-muted hover:bg-hover hover:text-ink"}`}
              >
                {label}
                {tabCount[value] > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${value === "inbox" ? "bg-primary text-white" : "bg-hover text-muted"}`}>{tabCount[value]}</span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2.5 border-b border-itemBorder p-3">
            <SearchBox value={search} onChange={resetTo(setSearch)} placeholder="Search name, email, subject or text" />
            <div className="flex flex-wrap gap-2">
              <FilterSelect label="Status" value={statusFilter} onChange={resetTo(setStatusFilter)}
                options={[["", "Any status"], ["new", "New"], ["in_progress", "In progress"], ["resolved", "Resolved"]]} />
              <FilterSelect label="Read state" value={readFilter} onChange={resetTo(setReadFilter)}
                options={[["all", "Read & unread"], ["unread", "Unread only"], ["read", "Read only"]]} />
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-itemBorder px-4 py-2 text-xs">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all on this page" className="h-4 w-4 rounded border-cardBorder" />
            {selected.size === 0 ? (
              <span className="text-muted">{total} message{total === 1 ? "" : "s"}</span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-bold text-ink">{selected.size} selected</span>
                {BULK_ACTIONS[view].map(([action, label]) => (
                  <Button key={action} size="sm" variant={action === "delete" ? "dangerGhost" : "secondary"} loading={bulkBusy} onClick={() => runBulk(action)}>{label}</Button>
                ))}
              </div>
            )}
          </div>

          {loading && items.length === 0 ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : items.length === 0 ? (
            <EmptyState title={view === "trash" ? "Trash is empty" : "No messages here"} description={search || statusFilter || readFilter !== "all" ? "Try changing your filters." : "New messages from the contact form will show up here."} />
          ) : (
            <ul className="m-0 list-none p-0">
              {items.map((m) => (
                <li key={m.slug} className={`flex gap-3 border-b border-itemBorder px-4 py-3.5 transition-colors last:border-0 ${slug === m.slug ? "bg-primary-soft/70" : "hover:bg-hover/60"}`}>
                  <input type="checkbox" checked={selected.has(m.slug)} onChange={() => toggle(m.slug)} aria-label={`Select message from ${m.name}`} className="mt-1 h-4 w-4 shrink-0 rounded border-cardBorder" />
                  <button onClick={() => navigate(`/admin/messages/${m.slug}`)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${m.is_read ? "font-medium text-muted" : "font-extrabold text-ink"}`}>
                        {!m.is_read && <span aria-label="Unread" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary align-middle" />}
                        {m.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-subtle">{shortDate(m.created_at)}</span>
                    </div>
                    <p className={`truncate text-sm ${m.is_read ? "text-muted" : "font-semibold text-ink"}`}>{m.subject}</p>
                    <p className="truncate text-xs text-subtle">{m.preview}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusBadge map={MESSAGE_STATUS} value={m.status} />
                      {m.reply_count > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted"><Icon name="send" size={12} />{m.reply_count}</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-2 border-t border-itemBorder px-4 py-3">
              <span className="text-xs text-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>

        {/* ------------ detail pane ------------ */}
        <div className={slug ? "block" : "hidden lg:block"}>
          {detailLoading && !detail ? (
            <Card><div className="flex justify-center py-16"><Spinner /></div></Card>
          ) : detail && slug ? (
            <MessageDetail
              message={detail}
              onPatch={patchDetail}
              onTrash={() => setConfirmDelete(true)}
              onRestore={restoreDetail}
              onSent={onReplySent}
              onBack={closeDetail}
            />
          ) : (
            <Card><EmptyState title="Select a message" description="Pick a message on the left to read it and reply." /></Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={trashDetail}
        loading={deleting}
        title="Move to trash?"
        description="The message moves to the trash and is deleted permanently after 30 days. You can restore it until then."
        confirmLabel="Move to trash"
      />
    </div>
  );
}
