// ==========================================
// useBeritaList.js
// Filter berita (search judul saja, tanpa filter status) + pagination
// + tambah, edit, hapus (mutasi langsung ke dummy array).
// ==========================================

import { useState, useMemo } from 'react';
import { dummyBerita } from '../data/dummyBerita';

const ITEMS_PER_PAGE = 5;

export function useBeritaList() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [version, setVersion] = useState(0);

  const filtered = useMemo(() => {
    let result = dummyBerita;
    if (search) result = result.filter((b) => b.judul.toLowerCase().includes(search.toLowerCase()));
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, version]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const deleteBerita = (id) => {
    const index = dummyBerita.findIndex((b) => b.id === id);
    if (index !== -1) dummyBerita.splice(index, 1);
    setVersion((v) => v + 1);
  };

  const addBerita = (formData) => {
    dummyBerita.unshift({
      id: dummyBerita.length + 1,
      judul: formData.judul,
      konten: formData.konten,
      thumbnail: formData.thumbnail,
      status: formData.status,
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      penulis: 'Rina S.h', // sementara statis, nanti dari user login
    });
    setVersion((v) => v + 1);
  };

  const updateBerita = (id, formData) => {
    const berita = dummyBerita.find((b) => b.id === id);
    if (berita) Object.assign(berita, formData);
    setVersion((v) => v + 1);
  };

  return {
    data: paginatedData,
    search,
    setSearch: (val) => { setSearch(val); setCurrentPage(1); },
    currentPage,
    setCurrentPage,
    totalPages,
    deleteBerita,
    addBerita,
    updateBerita,
  };
}