// ==========================================
// useSuratSiapCetak.js
// Dipakai bareng Petugas Desa, Kasi, Kaur — semuanya sekarang fungsinya
// sama: lihat & cetak surat yang sudah rw_approved (final approve RT+RW).
// ==========================================

import { useState, useMemo } from 'react';
import { dummySurat } from '@/features/approval/data/dummySurat';

export function useSuratSiapCetak() {
  const [search, setSearch] = useState('');

  const data = useMemo(() => {
    let result = dummySurat.filter((s) => s.status === 'rw_approved');
    if (search) result = result.filter((s) => s.pemohon.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [search]);

  return { data, search, setSearch };
}