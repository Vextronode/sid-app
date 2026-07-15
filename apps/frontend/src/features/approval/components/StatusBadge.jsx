// ==========================================
// Menampilkan label status surat dengan warna berbeda sesuai jenisnya
// (pending = kuning, approved = hijau, rejected = merah, review = biru).
// ==========================================

import { STATUS_BADGE } from '../constants/statusConfig';

export default function StatusBadge({ status }) {
  // Ambil konfigurasi warna & label dari statusConfig.js.
  // Kalau status belum terdaftar, tampilkan fallback abu-abu supaya tidak error.
  const config = STATUS_BADGE[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}