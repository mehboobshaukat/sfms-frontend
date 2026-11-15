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
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { formatDateTime } from "../../lib/formatters";

const PAGE_SIZE = 15;
const SEVERITY = {
  critical: { label: "Critical", tone: "danger" },
  warning: { label: "Warning", tone: "gold" },
  info: { label: "Info", tone: "primary" },
};

/* ------------------------------------------------------------ email service */
function SenderLine({ role, endpoint, active }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${active ? "border-primary-border bg-primary-soft/50" : "border-cardBorder bg-hover/30"}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-nav">{role}</p>
        <p className="truncate text-sm font-semibold text-ink">{endpoint.address || "Not set"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!endpoint.configured && <Badge tone="gold">Not configured</Badge>}
        {active ? <Badge tone="emerald">Sending</Badge> : <Badge tone="neutral">Idle</Badge>}
      </div>
    </div>
  );
}

function ChannelCard({ channel, onActivate }) {
  const onFallback = channel.active === "fallback";
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-extrabold text-ink">{channel.label}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {onFallback ? "The primary failed. Emails are going out through the fallback." : "Everything is running on the primary sender."}
          </p>
        </div>
        <Badge tone={onFallback ? "danger" : "emerald"}>{onFallback ? "Fallback active" : "Primary active"}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        <SenderLine role="Primary" endpoint={channel.primary} active={!onFallback} />
        <SenderLine role="Fallback" endpoint={channel.fallback} active={onFallback} />
      </div>

      {onFallback && (
        <div className="mt-4 rounded-xl border border-danger/25 bg-danger-soft/60 p-3.5 text-sm text-ink">
          <p className="font-semibold">Why: <span className="font-normal text-muted">{channel.failover_reason || "unknown"}</span></p>
          {channel.failed_over_at && <p className="mt-1 text-xs text-muted">Since {formatDateTime(channel.failed_over_at)}</p>}
          <Button className="mt-3" size="sm" onClick={() => onActivate(channel)}>
            <Icon name="refresh" size={14} /> Re-activate primary
          </Button>
        </div>
      )}

      {!onFallback && channel.restored_at && (
        <p className="mt-3 text-xs text-subtle">
          Last restored {formatDateTime(channel.restored_at)}{channel.restored_by ? ` by ${channel.restored_by}` : ""}.
        </p>
      )}
    </Card>
  );
}

/* --------------------------------------------------------------------- page */
export default function Notifications() {
  const { refreshNotifications } = useAdmin();

  const [channels, setChannels] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [activating, setActivating] = useState(false);

  const loadChannels = useCallback(async () => {
    try {
      setChannels(await adminApi.emailServiceStatus());
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.listNotifications({ unread_only: unreadOnly || undefined, page, page_size: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, page]);

  useEffect(() => { loadChannels(); }, [loadChannels]);
  useEffect(() => { loadList(); }, [loadList]);

  const markRead = async (slug) => {
    try {
      await adminApi.markNotificationRead(slug);
      setItems((prev) => prev.map((n) => (n.slug === slug ? { ...n, is_read: true } : n)));
      refreshNotifications();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const markAll = async () => {
    try {
      await adminApi.markAllNotificationsRead();
      await loadList();
      refreshNotifications();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const activate = async () => {
    setActivating(true);
    try {
      await adminApi.activatePrimaryEmail(confirm.channel);
      toast.success("Primary email service is active again. The fallback is idle.");
      setConfirm(null);
      await Promise.all([loadChannels(), loadList()]);
      refreshNotifications();
    } catch (err) {
      toast.error(apiErrorMessage(err, "The primary service could not be re-activated."));
      setConfirm(null);
    } finally {
      setActivating(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasUnread = items.some((n) => !n.is_read);

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="Notifications"
        subtitle="Alerts about the platform itself. If a primary email service fails, the fallback takes over and you are told here."
        actions={hasUnread && <Button variant="secondary" size="sm" onClick={markAll}><Icon name="check" size={14} /> Mark all read</Button>}
      />

      <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-nav">Email service</h3>
      {!channels ? (
        <Card><div className="flex justify-center py-6"><Spinner /></div></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {channels.map((channel) => <ChannelCard key={channel.channel} channel={channel} onActivate={setConfirm} />)}
        </div>
      )}

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-nav">Alerts</h3>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }} className="h-4 w-4 rounded border-cardBorder" />
          Unread only
        </label>
      </div>

      <Card className="!p-0">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState title="No notifications" description={unreadOnly ? "You have read everything." : "Nothing to report. Failover alerts will show up here."} />
        ) : (
          <ul className="m-0 list-none divide-y divide-itemBorder p-0">
            {items.map((n) => {
              const sev = SEVERITY[n.severity] || SEVERITY.info;
              return (
                <li key={n.slug} className={`flex gap-3 p-4 ${n.is_read ? "" : "bg-primary-soft/30"}`}>
                  <span aria-hidden="true" className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={sev.tone}>{sev.label}</Badge>
                      <p className="break-words text-sm font-bold text-ink">{n.title}</p>
                    </div>
                    {/* plain text only: never rendered as HTML */}
                    <p className="mt-1.5 whitespace-pre-line break-words text-sm text-muted">{n.body}</p>
                    <p className="mt-1.5 text-xs text-subtle">{formatDateTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && <Button size="sm" variant="ghost" onClick={() => markRead(n.slug)}>Mark read</Button>}
                </li>
              );
            })}
          </ul>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-itemBorder p-3 text-sm text-muted">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirm}
        title="Re-activate the primary sender?"
        tone="primary"
        description={confirm ? `A test email will be sent through ${confirm.primary.address}. If it works, the primary takes over again and the fallback goes idle. If not, the fallback stays active.` : ""}
        confirmLabel="Send test & re-activate"
        loading={activating}
        onConfirm={activate}
        onClose={() => !activating && setConfirm(null)}
      />
    </div>
  );
}
