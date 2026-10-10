// ==========================================
// NotificationPopover.jsx
// Popup notifikasi, dibuka dari ikon lonceng di navbar.
// Styling mengikuti SID Global Theme.
// ==========================================

import { useState } from 'react'
import { Bell, FileText, PenLine } from 'lucide-react'
import WebPushControls from './WebPushControls'

const TABS = [
  { value: "semua", label: "Semua" },
  { value: "pelayanan", label: "Pelayanan" },
  { value: "informasi", label: "Informasi" },
];

const ICON_MAP = {
  document: FileText,
  signature: PenLine,
  bell: Bell,
};

const WARNA_MAP = {
  green: "sid-notification-icon sid-notification-icon-green",
  blue: "sid-notification-icon sid-notification-icon-blue",
  red: "sid-notification-icon sid-notification-icon-red",
  gray: "sid-notification-icon sid-notification-icon-gray",
};

function getDayLabel(dateString) {
  const notifDate = new Date(dateString);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(notifDate);
  target.setHours(0, 0, 0, 0);

  const diff =
    Math.floor((today - target) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Hari Ini";
  if (diff === 1) return "Kemarin";
  if (diff === 2) return "2 Hari yang Lalu";
  if (diff === 3) return "3 Hari yang Lalu";

  return target.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function NotificationPopover({
  open,
  onClose,
  notifications,
  unreadCount,
  loading,
  error,
  markingIds,
  markingAll,
  markAsRead,
  markAllAsRead,
}) {
  const [activeTab, setActiveTab] = useState("semua");

  if (!open) return null;

  const filtered =
    activeTab === "semua"
      ? notifications
      : notifications.filter(
          (n) => n.category === activeTab
        );

  const groupedNotifications = filtered.reduce(
    (groups, notif) => {
      const label = getDayLabel(notif.created_at);

      if (!groups[label]) {
        groups[label] = [];
      }

      groups[label].push(notif);

      return groups;
    },
    {}
  );

  const handleTandaiSemua = async () => {
    await markAllAsRead();
  };

  return (
    <>
      <div
        className="sid-notification-overlay"
        onClick={onClose}
      />

      <div className="sid-notification-popover">
        {/* HEADER */}
        <div className="sid-notification-header">
          <h2 className="sid-notification-title">
            Notifikasi
          </h2>

          <button
            type="button"
            onClick={handleTandaiSemua}
            disabled={markingAll || unreadCount === 0}
            className="sid-notification-mark-all"
          >
            {markingAll ? 'Menyimpan...' : 'Tandai Semua Dibaca'}
          </button>
        </div>

        <WebPushControls />

        {/* Tabs */}
        <div className="sid-notification-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`sid-notification-tab ${
                activeTab === tab.value
                  ? "sid-notification-tab-active"
                  : "sid-notification-tab-inactive"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="sid-notification-content">
          {error && (
            <p role="alert" className="sid-notification-empty">
              {error}
            </p>
          )}

          {loading && (
            <p className="sid-notification-empty">Memuat notifikasi...</p>
          )}

          {Object.entries(groupedNotifications).map(
            ([label, items]) => (
              <div
                key={label}
                className="sid-notification-group"
              >
                <p className="sid-notification-day">
                  {label}
                </p>

                <div className="sid-notification-list">
                  {items.map((n) => (
                    <NotifItem
                      key={n.id}
                      data={n}
                      onRead={() => markAsRead(n.id)}
                      disabled={n.read || markingIds.includes(n.id)}
                    />
                  ))}
                </div>
              </div>
            )
          )}

          {!loading && filtered.length === 0 && !error && (
            <p className="sid-notification-empty">
              Tidak ada notifikasi.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function NotifItem({ data, onRead, disabled }) {
  const Icon = ICON_MAP[data.icon] ?? FileText;

  return (
    <div
      onClick={disabled ? undefined : onRead}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onRead()
        }
      }}
      className={`sid-notification-item ${
        data.read
          ? "sid-notification-item-read"
          : "sid-notification-item-unread"
      }`}
    >
      <div
        className={
          WARNA_MAP[data.color] ??
          WARNA_MAP.gray
        }
      >
        <Icon size={16} />
      </div>

      <div className="sid-notification-item-content">
        <div className="sid-notification-item-header">
          <p className="sid-notification-item-title">
            {data.title}
          </p>

          <span className="sid-notification-item-time">
            {data.time ??
              new Date(data.created_at).toLocaleTimeString('id-ID', {
              hour: "2-digit",
              minute: "2-digit",
              })}
          </span>
        </div>

        {data.context?.applicant && (
          <p className="sid-notification-item-message">Dari: {data.context.applicant}</p>
        )}
        <p className="sid-notification-item-message">{data.message}</p>
      </div>
    </div>
  );
}