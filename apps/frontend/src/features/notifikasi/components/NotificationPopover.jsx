// ==========================================
// NotificationPopover.jsx
// Popup notifikasi, dibuka dari ikon lonceng di navbar. Ada tab
// Semua/Pelayanan/Informasi, tombol "Tandai Semua Dibaca", dan daftar
// notifikasi dikelompokkan per hari.
// ==========================================

import { useState } from 'react';
import { FileText, PenLine } from 'lucide-react';
import { dummyNotifikasi as initialData } from '../data/dummyNotifikasi';

const TABS = [
  { value: 'semua', label: 'Semua' },
  { value: 'pelayanan', label: 'Pelayanan' },
  { value: 'informasi', label: 'Informasi' },
];

const ICON_MAP = { document: FileText, signature: PenLine };
const WARNA_MAP = {
  green: 'bg-green-100 text-green-600',
  blue: 'bg-blue-100 text-blue-600',
  gray: 'bg-gray-100 text-gray-400',
};

export default function NotificationPopover({ open, onClose }) {
  const [activeTab, setActiveTab] = useState('semua');
  const [items, setItems] = useState(initialData);

  if (!open) return null;

  const filtered = activeTab === 'semua' ? items : items.filter((n) => n.kategori === activeTab);
  const hariIni = filtered.filter((n) => !n.hari);
  const kemarin = filtered.filter((n) => n.hari === 'Kemarin');

  const handleTandaiSemua = () => setItems((prev) => prev.map((n) => ({ ...n, dibaca: true })));

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

        <div className="px-5 pb-5 flex flex-col gap-3">
          {hariIni.map((n) => (
            <NotifItem key={n.id} data={n} />
          ))}
          {kemarin.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 mt-2">KEMARIN</p>
              {kemarin.map((n) => (
                <NotifItem key={n.id} data={n} />
              ))}
            </>
          )}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Tidak ada notifikasi.</p>
          )}
        </div>
      </div>
    </>
  );
}

function NotifItem({ data }) {
  const Icon = ICON_MAP[data.icon] ?? FileText;
  return (
    <div className={`rounded-xl p-3 flex gap-3 ${data.dibaca ? 'bg-white' : 'bg-gray-50'}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${WARNA_MAP[data.warna]}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-green-700 font-medium truncate">Warga: {data.warga}</p>
          <span className="text-[10px] text-gray-400 shrink-0">{data.waktu}</span>
        </div>
        <p className="text-sm text-gray-800 font-medium mt-0.5">{data.judul}</p>
        <p className="text-xs text-gray-500 mt-0.5">{data.deskripsi}</p>
      </div>
    </div>
  );
}