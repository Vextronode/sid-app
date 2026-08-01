// ==========================================
// QuickNavButtons.jsx
// Diperbaiki: grid 2 kolom di layar sempit (mobile), 4 kolom di layar
// lebar (desktop) — supaya nggak overflow/kepotong. Typography & warna
// dirapikan: label lebih tegas, ikon berwarna sesuai kategori.
// ==========================================

import { Clock, CheckCircle2, XCircle, ListFilter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Ikon & warna disesuaikan per kategori, bukan silang generik semua
const ICON_MAP = {
  Menunggu: { icon: Clock, className: 'text-yellow-500 bg-yellow-50' },
  Disetujui: { icon: CheckCircle2, className: 'text-green-600 bg-green-50' },
  Ditolak: { icon: XCircle, className: 'text-red-500 bg-red-50' },
  Semua: { icon: ListFilter, className: 'text-gray-500 bg-gray-100' },
};

export default function QuickNavButtons({ items, basePath }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => {
          const config = ICON_MAP[item.label] ?? ICON_MAP.Semua;
          const Icon = config.icon;

          return (
            <button
              key={item.label}
              onClick={() => navigate(`${basePath}?status=${item.key}`)}
              className="flex flex-col items-center justify-center gap-2 border rounded-xl px-3 py-4 hover:border-green-400 hover:shadow-sm transition-all"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${config.className}`}>
                <Icon size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-700">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}