// ==========================================
// useSuratList.js
// Hook untuk ambil & filter daftar surat sesuai role (rt/rw) dan tab aktif
// (semua/pending/approved/rejected), plus search keyword.
// Sumber data masih dummySurat.js — nanti tinggal ganti bagian fetch-nya
// dengan call ke features/approval/api.js begitu backend siap.
// ==========================================

import { useState, useMemo } from 'react';
import { dummySurat } from '../data/dummySurat';
import { PENDING_STATUS_BY_ROLE } from '../constants/statusConfig';

export function useSuratList({ role, tab }) {
  // State pencarian & filter, dikontrol dari SearchFilterBar (tab "semua")
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const data = useMemo(() => {
    let result = dummySurat;

    // Filter berdasarkan tab yang sedang aktif.
    // "pending" artinya beda tergantung role: RT lihat status pending,
    // RW lihat status rt_approved (yang sudah lolos RT).
    if (tab === 'pending') {
      result = result.filter((s) => s.status === PENDING_STATUS_BY_ROLE[role]);
    } else if (tab === 'approved') {
      result = result.filter((s) => s.status.endsWith('_approved'));
    } else if (tab === 'rejected') {
      result = result.filter((s) => s.status.endsWith('_rejected'));
    }
    // tab === 'semua' -> tidak difilter status, tampilkan semua data

    // Filter tambahan (hanya efektif dipakai di tab "semua")
    if (filterJenis) result = result.filter((s) => s.jenis === filterJenis);
    if (filterStatus) result = result.filter((s) => s.status === filterStatus);
    if (search) {
      result = result.filter((s) => s.pemohon.toLowerCase().includes(search.toLowerCase()));
    }

    return result;
  }, [tab, role, search, filterJenis, filterStatus]);

  return { data, search, setSearch, setFilterJenis, setFilterStatus };
}