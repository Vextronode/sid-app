// ==========================================
// useSuratListkades.js
// Filter daftar surat khusus Kades: search + dropdown status,
// TANPA fungsi hapus (Kades cuma monitoring, tidak boleh mengubah data).
// ==========================================

import { useState, useMemo } from 'react';
import { dummySurat } from '@/features/approval/data/dummySurat';
import { RELEVANT_STATUSES } from '../constants/roleConfigkades';

export function useSuratList({ initialStatus = '' } = {}) {
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialStatus);

  const data = useMemo(() => {
    let result = dummySurat.filter((s) => RELEVANT_STATUSES.includes(s.status));

    if (filterJenis) result = result.filter((s) => s.jenis === filterJenis);
    if (filterStatus) result = result.filter((s) => s.status === filterStatus);
    if (search) result = result.filter((s) => s.pemohon.toLowerCase().includes(search.toLowerCase()));

    return result;
  }, [search, filterJenis, filterStatus]);

  return { data, search, setSearch, filterStatus, setFilterStatus, setFilterJenis };
}