/* eslint-disable no-unused-vars */
// ==========================================
// useUserList.js
// Filter user: search (nama/email) + filter status, plus pagination.
// ==========================================

import { useState, useMemo } from 'react';
import { dummyUser } from '../data/dummyUser';

const ITEMS_PER_PAGE = 3;

export function useUserList() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [version, setVersion] = useState(0);

  const filtered = useMemo(() => {
    let result = dummyUser;
    if (filterStatus) result = result.filter((u) => u.status === filterStatus);
    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter((u) => u.nama.toLowerCase().includes(keyword) || u.email.toLowerCase().includes(keyword));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStatus, version]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Toggle status aktif/nonaktif langsung di data dummy
  const toggleStatus = (id) => {
    const user = dummyUser.find((u) => u.id === id);
    if (user) user.status = user.status === 'aktif' ? 'nonaktif' : 'aktif';
    setVersion((v) => v + 1);
  };

  // Tambah user baru ke dummy data (nanti diganti call API POST waktu backend siap)
    const addUser = (formData) => {
        dummyUser.push({
            id: dummyUser.length + 1,
            nama: formData.nama,
            email: formData.email,
            role: formData.role,
            wilayah: formData.wilayah || '-',
            status: formData.status,
        });
        setVersion((v) => v + 1);
     };

  return {
    data: paginatedData,
    search,
    setSearch: (val) => { setSearch(val); setCurrentPage(1); },
    filterStatus,
    setFilterStatus: (val) => { setFilterStatus(val); setCurrentPage(1); },
    currentPage,
    setCurrentPage,
    totalPages,
    toggleStatus,
  };
}