/* eslint-disable react-hooks/exhaustive-deps */
// ==========================================
// useBeritaList.js
// CRUD berita + helper ambil berita utama (hero) dan 3 berita terbaru
// (buat sidebar "Terbaru").
// ==========================================

import { useState, useMemo } from 'react';
import { dummyBerita } from '../data/dummyBerita';

const ITEMS_PER_PAGE = 3;

export function useBeritaList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [version, setVersion] = useState(0);

  const semua = useMemo(() => [...dummyBerita], [version]);

  const beritaUtama = useMemo(() => semua.find((b) => b.utama) ?? semua[0], [semua]);
  const beritaTerbaru = useMemo(() => semua.filter((b) => b.id !== beritaUtama?.id).slice(0, 3), [semua, beritaUtama]);

  // Grid "Kelola Berita" — semua kecuali yang jadi hero
  const kelolaList = useMemo(() => semua.filter((b) => b.id !== beritaUtama?.id), [semua, beritaUtama]);

  const totalPages = Math.max(1, Math.ceil(kelolaList.length / ITEMS_PER_PAGE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return kelolaList.slice(start, start + ITEMS_PER_PAGE);
  }, [kelolaList, currentPage]);

  const deleteBerita = (id) => {
    const index = dummyBerita.findIndex((b) => b.id === id);
    if (index !== -1) dummyBerita.splice(index, 1);
    setVersion((v) => v + 1);
  };

  const addBerita = (formData) => {
    dummyBerita.push({
      id: dummyBerita.length + 1,
      judul: formData.judul,
      kategori: formData.kategori || 'Umum',
      konten: formData.konten,
      gambar: formData.gambar,
      ringkasan: formData.konten.slice(0, 100),
      status: formData.status,
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      penulis: 'Admin Desa',
      utama: false,
    });
    setVersion((v) => v + 1);
  };

  const updateBerita = (id, formData) => {
    const berita = dummyBerita.find((b) => b.id === id);
    if (berita) {
      berita.judul = formData.judul;
      berita.kategori = formData.kategori || berita.kategori;
      berita.konten = formData.konten;
      berita.gambar = formData.gambar;
      berita.ringkasan = formData.konten.slice(0, 100);
      berita.status = formData.status;
    }
    setVersion((v) => v + 1);
  };

  return {
    beritaUtama,
    beritaTerbaru,
    data: paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
    deleteBerita,
    addBerita,
    updateBerita,
  };
}