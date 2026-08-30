/* eslint-disable react-hooks/set-state-in-effect */

// ==========================================
// NotificationPopover.jsx
// Popup notifikasi dari ikon lonceng navbar.
// Styling mengikuti SID Global Theme.
// Logic/API tidak diubah.
// ==========================================

import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useState } from "react";
import { FileText, PenLine } from "lucide-react";
import useNotifications from "@/features/notifikasi/hooks/useNotifications";

const TABS = [
  { value: "semua", label: "Semua" },
  { value: "pelayanan", label: "Pelayanan" },
  { value: "informasi", label: "Informasi" },
];

const ICON_MAP = {
  document: FileText,
  signature: PenLine,
};

const WARNA_MAP = {
  green: "sid-notification-icon-green",
  blue: "sid-notification-icon-blue",
  red: "sid-notification-icon-red",
  gray: "sid-notification-icon-gray",
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

export default function NotificationPopover({ open, onClose }) {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("semua");

  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

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
      {/* Overlay */}
      <div
        className="sid-notification-overlay"
        onClick={onClose}
      />

      {/* Popover */}
      <div className="sid-notification-popover">
        {/* Header */}
        <div className="sid-notification-header">
          <h2 className="sid-notification-title">
            Notifikasi
          </h2>

          <button
            onClick={handleTandaiSemua}
            className="sid-notification-mark-all"
          >
            Tandai Semua Dibaca
          </button>
        </div>

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

        {/* List */}
        <div className="sid-notification-content">
          {Object.entries(groupedNotifications).map(
            ([label, items]) => (
              <div
                key={label}
                className="sid-notification-day"
              >
                <p className="sid-notification-day-label">
                  {label}
                </p>

                <div className="sid-notification-list">
                  {items.map((n) => (
                    <NotifItem
                      key={n.id}
                      data={n}
                      user={user}
                      onRead={() => markAsRead(n.id)}
                    />
                  ))}
                </div>
              </div>
            )
          )}

          {filtered.length === 0 && (
            <p className="sid-notification-empty">
              Tidak ada notifikasi.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function NotifItem({ data, onRead, user }) {
  const Icon = ICON_MAP[data.icon] ?? FileText;

  return (
    <div
      onClick={onRead}
      className={`sid-notification-item ${
        data.read_at
          ? "sid-notification-item-read"
          : "sid-notification-item-unread"
      }`}
    >
      {/* Icon */}
      <div
        className={`sid-notification-icon ${
          WARNA_MAP[data.color] ??
          WARNA_MAP.gray
        }`}
      >
        <Icon size={16} />
      </div>

      {/* Content */}
      <div className="sid-notification-item-content">
        <div className="sid-notification-item-header">
          <p className="sid-notification-item-title">
            {data.title}
          </p>

          <span className="sid-notification-time">
            {new Date(
              data.created_at
            ).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <p className="sid-notification-applicant">
          Dari: {data.applicant}
        </p>

        <p className="sid-notification-message">
          {data.message}
        </p>
      </div>
    </div>
  );
}