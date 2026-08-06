// ==========================================
// NotificationPopover.jsx
// Popup notifikasi, dibuka dari ikon lonceng di navbar. Ada tab
// Semua/Pelayanan/Informasi, tombol "Tandai Semua Dibaca", dan daftar
// notifikasi dikelompokkan per hari.
// ==========================================
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useState } from 'react';
import { FileText, PenLine } from 'lucide-react';
import useNotifications from "@/features/notifikasi/hooks/useNotifications";
const TABS = [
  { value: 'semua', label: 'Semua' },
  { value: 'pelayanan', label: 'Pelayanan' },
  { value: 'informasi', label: 'Informasi' },
];

const ICON_MAP = { document: FileText, signature: PenLine };
const WARNA_MAP = {
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  red: "bg-red-100 text-red-600",
  gray: "bg-gray-100 text-gray-400",
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

  const [activeTab, setActiveTab] = useState('semua');
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
          const groupedNotifications = filtered.reduce((groups, notif) => {
  const label = getDayLabel(notif.created_at);

  if (!groups[label]) {
    groups[label] = [];
  }

  groups[label].push(notif);

  return groups;
}, {});

const handleTandaiSemua = async () => {

    await markAllAsRead();

};
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-4 top-16 w-full max-w-sm bg-white rounded-2xl shadow-xl z-50 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Notifikasi</h2>
          <button onClick={handleTandaiSemua} className="text-xs text-green-600 hover:underline">
            Tandai Semua Dibaca
          </button>
        </div>

        <div className="flex gap-2 px-5 py-3">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                activeTab === tab.value ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

<div className="px-5 pb-5">
  {Object.entries(groupedNotifications).map(([label, items]) => (
    <div key={label} className="mb-5">

      <p className="text-[10px] font-semibold uppercase text-gray-400 mb-2">
        {label}
      </p>

      <div className="flex flex-col gap-3">
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
  ))}

  {filtered.length === 0 && (
    <p className="text-sm text-center text-gray-400 py-6">
      Tidak ada notifikasi.
    </p>
  )}
</div>
      </div>
    </>
  );
}

function NotifItem({ data, onRead,user }) {
  const Icon = ICON_MAP[data.icon] ?? FileText;

  return (
    <div
      onClick={onRead}
      className={`
        rounded-xl
        p-3
        flex
        gap-3
        cursor-pointer
        transition
        hover:bg-green-50
        ${data.read_at ? "bg-white" : "bg-gray-50"}
      `}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          WARNA_MAP[data.color] ?? WARNA_MAP.gray
        }`}
      >
        <Icon size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-green-700 font-medium truncate">
            {user?.name}: {data.applicant}
          </p>

          <span className="text-[10px] text-gray-400">
            {new Date(data.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <p className="text-sm font-semibold text-gray-800 mt-1">
          {data.title}
        </p>

        <p className="text-xs text-gray-500 mt-1">
          {data.message}
        </p>
      </div>
    </div>
  );
}