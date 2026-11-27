import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  UserPlus,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatDateBn, toBn } from "../../../lib/global";
import { useDemo } from "../demoStore";
import type { PosNotification, PosNotificationType } from "../demoTypes";

const TYPE_META: Record<
  PosNotificationType,
  { label: string; badgeCls: string; toneCls: string; icon: typeof Bell }
> = {
  assignment: {
    label: "নতুন অ্যাসাইনমেন্ট",
    badgeCls: "dm-badge dm-badge-blue",
    toneCls: "dm-tone-blue",
    icon: UserPlus,
  },
  new_entry: {
    label: "নতুন সার্ভিসিং এন্ট্রি",
    badgeCls: "dm-badge dm-badge-emerald",
    toneCls: "dm-tone-emerald",
    icon: Wrench,
  },
  status_update: {
    label: "স্ট্যাটাস আপডেট",
    badgeCls: "dm-badge dm-badge-slate",
    toneCls: "dm-tone-indigo",
    icon: Clock,
  },
  pending_task: {
    label: "পেন্ডিং কাজ",
    badgeCls: "dm-badge dm-badge-amber",
    toneCls: "dm-tone-amber",
    icon: AlertTriangle,
  },
  deadline: {
    label: "ডেলিভারি সময়সীমা",
    badgeCls: "dm-badge dm-badge-rose",
    toneCls: "dm-tone-rose",
    icon: CalendarClock,
  },
  completed: {
    label: "সম্পন্ন কাজ",
    badgeCls: "dm-badge dm-badge-emerald",
    toneCls: "dm-tone-emerald",
    icon: CheckCircle2,
  },
};

export function NotificationsScreen() {
  const {
    currentUser,
    visibleNotifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    go,
  } = useDemo();

  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PosNotificationType>("all");

  const filtered = useMemo(() => {
    return visibleNotifications.filter((ntf) => {
      const isRead = ntf.readByUserIds.includes(currentUser.id);
      if (readFilter === "unread" && isRead) return false;
      if (readFilter === "read" && !isRead) return false;
      if (typeFilter !== "all" && ntf.type !== typeFilter) return false;
      return true;
    });
  }, [visibleNotifications, currentUser.id, readFilter, typeFilter]);

  const handleOpenJob = (ntf: PosNotification) => {
    markNotificationRead(ntf.id);
    if (ntf.serviceJobId) {
      go(`/servicing?jobId=${encodeURIComponent(ntf.serviceJobId)}`);
    } else {
      go("/servicing");
    }
  };

  return (
    <div className="dm-stack-md">
      <div className="dm-page-head">
        <div className="dm-page-head-left">
          <button
            type="button"
            aria-label="হোমে ফিরুন"
            onClick={() => go("/")}
            className="dm-back-btn"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <h1 className="dm-page-title">নোটিফিকেশন</h1>
            <p className="dm-page-sub">
              সার্ভিসিং অ্যাসাইনমেন্ট, স্ট্যাটাস আপডেট ও ডেলিভারি সময়সীমা সতর্কতা
            </p>
          </div>
        </div>

        <div className="dm-page-actions">
          {unreadNotificationsCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="dm-btn dm-btn-soft-emerald"
            >
              <CheckCheck size={17} aria-hidden="true" />
              <span>সব পঠিত করুন ({toBn(unreadNotificationsCount)})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="dm-kpi-grid-3">
        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-blue" aria-hidden="true">
            <Bell size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">মোট নোটিফিকেশন</span>
            <span className="dm-kpi-value dm-text-blue">
              {toBn(visibleNotifications.length)}টি
            </span>
          </span>
        </div>

        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-amber" aria-hidden="true">
            <Clock size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">অপঠিত (Unread)</span>
            <span className="dm-kpi-value dm-text-amber">
              {toBn(unreadNotificationsCount)}টি
            </span>
          </span>
        </div>

        <div className="dm-kpi-card" style={{ cursor: "default" }}>
          <span className="dm-kpi-icon dm-tone-emerald" aria-hidden="true">
            <CheckCircle2 size={19} />
          </span>
          <span className="dm-kpi-meta">
            <span className="dm-kpi-label">পঠিত (Read)</span>
            <span className="dm-kpi-value dm-text-emerald">
              {toBn(Math.max(0, visibleNotifications.length - unreadNotificationsCount))}টি
            </span>
          </span>
        </div>
      </div>

      {/* Read / Unread & Category Filters */}
      <div className="dm-pills dm-pills-scroll" role="group" aria-label="নোটিফিকেশন ফিল্টার">
        {[
          { id: "all" as const, label: `সব (${toBn(visibleNotifications.length)})` },
          { id: "unread" as const, label: `অপঠিত (${toBn(unreadNotificationsCount)})` },
          {
            id: "read" as const,
            label: `পঠিত (${toBn(Math.max(0, visibleNotifications.length - unreadNotificationsCount))})`,
          },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={readFilter === f.id}
            onClick={() => setReadFilter(f.id)}
            className={`dm-pill${readFilter === f.id ? " is-active" : ""}`}
            style={{ minHeight: 44 }}
          >
            {f.label}
          </button>
        ))}

        {(
          [
            { id: "all", label: "সব ধরন" },
            { id: "assignment", label: "অ্যাসাইনমেন্ট" },
            { id: "new_entry", label: "নতুন এন্ট্রি" },
            { id: "status_update", label: "স্ট্যাটাস" },
            { id: "pending_task", label: "পেন্ডিং" },
            { id: "deadline", label: "ডেলিভারি ডেডলাইন" },
            { id: "completed", label: "সম্পন্ন" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={typeFilter === t.id}
            onClick={() => setTypeFilter(t.id)}
            className={`dm-pill${typeFilter === t.id ? " is-dark" : ""}`}
            style={{ minHeight: 44 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <div className="dm-card dm-empty-state">
          <Bell size={30} aria-hidden="true" />
          <p>কোনো নোটিফিকেশন পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="dm-feed-list">
          {filtered.map((ntf) => {
            const isRead = ntf.readByUserIds.includes(currentUser.id);
            const meta = TYPE_META[ntf.type] || TYPE_META.new_entry;
            const Icon = meta.icon;

            return (
              <article
                key={ntf.id}
                className="dm-card"
                style={{
                  borderColor: isRead ? "var(--dm-line)" : "var(--dm-brand-200)",
                  background: isRead ? "#ffffff" : "var(--dm-brand-50)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: 1 }}>
                    <span className={`dm-kpi-icon ${meta.toneCls}`} aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span className={meta.badgeCls}>{meta.label}</span>
                        {ntf.jobNo && (
                          <span className="dm-badge dm-badge-slate">{ntf.jobNo}</span>
                        )}
                        <span
                          className={`dm-badge ${
                            isRead ? "dm-badge-slate" : "dm-badge-amber"
                          }`}
                        >
                          {isRead ? "পঠিত" : "নতুন / অপঠিত"}
                        </span>
                      </div>

                      <strong
                        style={{
                          display: "block",
                          fontSize: 15,
                          color: "var(--dm-ink)",
                        }}
                      >
                        {ntf.title}
                      </strong>
                      <p
                        style={{
                          marginTop: 4,
                          fontSize: 13.5,
                          color: "var(--dm-ink-700)",
                        }}
                      >
                        {ntf.message}
                      </p>
                      <small
                        className="dm-text-muted"
                        style={{ display: "block", marginTop: 6, fontSize: 12 }}
                      >
                        সময়: {formatDateBn(ntf.createdAt, true)}
                      </small>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(ntf.id)}
                        className="dm-btn dm-btn-outline dm-btn-sm"
                        style={{ minHeight: 40 }}
                      >
                        <CheckCircle2 size={15} aria-hidden="true" />
                        <span>পঠিত করুন</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenJob(ntf)}
                      className="dm-btn dm-btn-primary dm-btn-sm"
                      style={{ minHeight: 40 }}
                    >
                      <ExternalLink size={15} aria-hidden="true" />
                      <span>সার্ভিসিং দেখুন</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
