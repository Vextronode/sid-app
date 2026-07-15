// ==========================================
// useSuratDetail.js
// Hook untuk ambil detail satu surat berdasarkan id, dipakai di ApprovalDetailPage.
// Masih baca dari dummySurat.js, nanti diganti fetch ke api.js.
// ==========================================

import { useMemo } from 'react';
import { dummySurat } from '../data/dummySurat';

export function useSuratDetail(id) {
  // Cari surat dengan id yang cocok dari dataset dummy.
  // useMemo supaya tidak nyari ulang tiap render kalau id-nya tidak berubah.
  const surat = useMemo(() => {
    return dummySurat.find((s) => String(s.id) === String(id)) ?? null;
  }, [id]);

  return { surat, isLoading: false, notFound: !surat };
}