// ==========================================
// useDashboardMobileData.js
// Olah data dari dummySurat (yang sudah ada, global) jadi bentuk yang
// dibutuhkan chart statistik & riwayat verifikasi di dashboard mobile.
// Tidak ada dummy data baru — semua diturunkan dari dummySurat.
// ==========================================

import { useMemo } from 'react';
import { dummySurat } from '@/features/approval/data/dummySurat';

export function useDashboardMobileData() {
  // Distribusi jumlah surat per jenis, buat chart
  const chartData = useMemo(() => {
    const grouped = {};
    dummySurat.forEach((s) => {
      grouped[s.jenis] = (grouped[s.jenis] ?? 0) + 1;
    });
    return Object.entries(grouped).map(([kategori, jumlah]) => ({ kategori, jumlah }));
  }, []);

  // Riwayat verifikasi terbaru, ambil dari surat yang sudah punya riwayat
  const riwayatVerifikasi = useMemo(() => {
    return dummySurat
      .filter((s) => s.riwayat && s.riwayat.length > 0)
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        nama: s.pemohon,
        nik: s.nik,
        jenisSurat: s.jenis_label,
        tanggal: s.tanggal,
      }));
  }, []);

  return { chartData, riwayatVerifikasi };
}