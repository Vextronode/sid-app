// ==========================================
// useSuratDetail.js
// Ambil detail satu surat dari data GLOBAL berdasarkan id.
// ==========================================

import { useMemo } from 'react';
import { dummySurat } from '@/features/approval/data/dummySurat';

export function useSuratDetail(id) {
  const surat = useMemo(() => dummySurat.find((s) => String(s.id) === String(id)) ?? null, [id]);
  return { surat, isLoading: false, notFound: !surat };
}