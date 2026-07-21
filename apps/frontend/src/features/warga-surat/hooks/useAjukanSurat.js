// ==========================================
// useAjukanSurat.js
// Hook untuk Warga mengajukan surat baru. Surat baru masuk ke data GLOBAL
// dengan status awal "pending", otomatis masuk antrian RT.
// Field spesifik tiap jenis surat (jenisUsaha, namaAyah, dll) disimpan
// dalam objek "detail" supaya tidak nyampur dengan field umum.
// ==========================================

import { useState } from 'react';
import { dummySurat } from '@/features/approval/data/dummySurat';

export function useAjukanSurat({ userId }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ajukan = ({ jenis, jenisLabel, detail, dokumenNama, catatan, user }) => {
    setIsSubmitting(true);
    const newSurat = {
      id: dummySurat.length + 1,
      no_surat: null,
      pemohon: user?.nama ?? 'Budi Santoso',
      pemohon_user_id: userId,
      nik: user?.nik ?? '****-****-0042',
      alamat: user?.alamat ?? 'Alamat',
      jenis,
      jenis_label: jenisLabel,
      keperluan: detail.keperluan ?? '',
      tanggal: new Date().toLocaleDateString('id-ID'),
      diajukan_at: new Date().toLocaleString('id-ID'),
      terakhir_diproses_at: new Date().toLocaleString('id-ID'),
      ip_aktor: '-',
      status: 'pending', // otomatis masuk antrian RT
      wilayah: user?.wilayah_label ?? 'RT 000/RW 000',
      dokumen: dokumenNama ?? null,
      catatan: catatan ?? '',
      detail, // semua field spesifik jenis surat (jenisUsaha, namaAyah, dll)
      riwayat: [],
    };
    dummySurat.push(newSurat);
    setIsSubmitting(false);
    return newSurat;
  };

  return { ajukan, isSubmitting };
}