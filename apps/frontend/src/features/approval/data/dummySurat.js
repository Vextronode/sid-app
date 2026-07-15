// ==========================================
// dummySurat.js
// Dataset dummy permohonan surat, dipakai sementara oleh hooks sampai
// backend endpoint aslinya siap. Ganti sumber ini dengan hasil fetch API nanti.
// ==========================================

import { STATUS } from '../constants/statusConfig';

// Rotasi 4 status berbeda supaya tiap tab (pending/approved/rejected/semua) ada isinya
const STATUS_ROTATION = [STATUS.PENDING, STATUS.RT_APPROVED, STATUS.RT_REJECTED, STATUS.RW_REVIEW];

export const dummySurat = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  no_surat: null, // baru terisi otomatis setelah disetujui final (tahap Kasi/Kaur)
  pemohon: 'Budi Santoso',
  nik: '****-****-0042',
  alamat: 'Kp. Cibenda RT 001/RW 001',
  jenis: 'SKD',
  jenis_label: 'SKD — Keterangan Domisili',
  keperluan: 'Pembuatan SKCK',
  tanggal: '19 mei 2026',
  diajukan_at: '19 Mei 2026, 09:10',
  terakhir_diproses_at: '19 Mei 2026, 10:23',
  ip_aktor: '192.168.1.12',
  status: STATUS_ROTATION[i % STATUS_ROTATION.length],
  wilayah: 'RT 001, RW001 - Desa Cibenda',
  // Riwayat keputusan tiap tahap, dipakai di halaman detail
  riwayat: [
    { tahap: 'RT', status: 'approved', catatan: null, waktu: '19 Mei 2026, 10:23' },
  ],
}));