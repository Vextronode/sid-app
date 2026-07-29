// ==========================================
// QuickNavButtons.jsx
// 4 tombol navigasi cepat (Menunggu/Disetujui/Ditolak/Semua), pengganti
// RiwayatVerifikasiTable di halaman Beranda. Klik tombol -> pindah ke
// halaman list dengan filter status yang sesuai otomatis terpasang.
// ==========================================

import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuickNavButtons({ items, basePath }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-4">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => navigate(`${basePath}?status=${item.key}`)}
          className="flex-1 flex flex-col items-center justify-center gap-2 border rounded-xl px-6 py-4 hover:bg-gray-50 hover:border-green-400 transition-colors"
        >
          <X size={18} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{item.label}</span>
        </button>
      ))}
    </div>
  );
}