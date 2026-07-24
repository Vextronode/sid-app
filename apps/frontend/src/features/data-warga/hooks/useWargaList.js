// ==========================================
// useWargaList.js
// Filter data warga: search (nama/NIK) + filter RT/RW, plus pagination
// dan hapus data (mutasi langsung ke dummy array).
// ==========================================

import { useState, useMemo } from 'react';
import { dummyWarga } from '../data/dummyWarga';

const ITEMS_PER_PAGE = 4;

export function useWargaList() {
  const [search, setSearch] = useState('');
  const [filterWilayah, setFilterWilayah] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [version, setVersion] = useState(0);

  const filtered = useMemo(() => {
    let result = dummyWarga;
    if (filterWilayah) result = result.filter((w) => `${w.rt}/${w.rw}` === filterWilayah);
    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter((w) => w.nama.toLowerCase().includes(keyword) || w.nik.includes(keyword));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterWilayah, version]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const deleteWarga = (id) => {
    const index = dummyWarga.findIndex((w) => w.id === id);
    if (index !== -1) dummyWarga.splice(index, 1);
    setVersion((v) => v + 1);
  };

  return {
    data: paginatedData,
    search,
    setSearch: (val) => { setSearch(val); setCurrentPage(1); },
    filterWilayah,
    setFilterWilayah: (val) => { setFilterWilayah(val); setCurrentPage(1); },
    currentPage,
    setCurrentPage,
    totalPages,
    deleteWarga,
  };
}