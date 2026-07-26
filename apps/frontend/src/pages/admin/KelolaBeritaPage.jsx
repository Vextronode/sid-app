// ==========================================
// KelolaBeritaPage.jsx
// Halaman Kelola Berita sesuai desain: breadcrumb, tombol Tambah Berita,
// hero berita utama (gambar besar + badge kategori + judul), sidebar
// "Terbaru" (3 berita terkini), grid "Kelola Berita" (card dengan
// tombol edit pensil di pojok). Tambah/Edit lewat modal yang sama.
// ==========================================

import { useState } from 'react';
import { Plus, Pencil, ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { useBeritaList } from '@/features/kelola-berita/hooks/useBeritaList';
import BeritaFormModal from '@/features/kelola-berita/components/BeritaFormModal';
import { FooterDesa } from '@/components/layout/FooterDesa';

export default function KelolaBeritaPage() {
  const { beritaUtama, beritaTerbaru, data, currentPage, setCurrentPage, totalPages, addBerita, updateBerita } = useBeritaList();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBerita, setEditingBerita] = useState(null);

  const handleOpenAdd = () => {
    setEditingBerita(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (berita) => {
    setEditingBerita(berita);
    setModalOpen(true);
  };

  const handleSubmitForm = (formData) => {
    if (editingBerita) {
      updateBerita(editingBerita.id, formData);
    } else {
      addBerita(formData);
    }
    setModalOpen(false);
  };

  return (
    <div>
      <div className="p-6">
        {/* Breadcrumb */}
        <p className="text-xs text-gray-400 mb-4">Admin &gt; Dashboard &gt; <span className="text-gray-600 font-medium">Kelola Berita</span></p>

        <div className="flex justify-end mb-6">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-green-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-green-700"
          >
            <Plus size={16} /> Tambah Berita
          </button>
        </div>

        {/* Hero + Sidebar Terbaru */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="col-span-2 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="relative h-64 bg-gray-800">
              {beritaUtama?.gambar ? (
                <img src={beritaUtama.gambar} alt={beritaUtama.judul} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center">
                  <Newspaper size={48} className="text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30" />
              <div className="relative p-6 flex flex-col justify-end h-full text-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white/90 text-gray-800 text-[10px] font-semibold px-3 py-1 rounded-full uppercase">{beritaUtama?.kategori}</span>
                  <span className="text-xs text-white/80">{beritaUtama?.tanggal}</span>
                </div>
                <h2 className="text-2xl font-bold leading-snug">{beritaUtama?.judul}</h2>
              </div>
            </div>
            <div className="p-5">
              <button onClick={() => handleOpenEdit(beritaUtama)} className="text-green-600 text-sm font-medium hover:underline">
                Baca Selengkapnya
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 border-l-4 border-green-600 pl-3 mb-4">Terbaru</h3>
            <div className="flex flex-col gap-4 mb-4">
              {beritaTerbaru.map((b) => (
                <button key={b.id} onClick={() => handleOpenEdit(b)} className="flex gap-3 text-left">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {b.gambar ? <img src={b.gambar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-green-100" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-green-600 font-semibold uppercase">{b.kategori}</p>
                    <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{b.judul}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{b.tanggal}</p>
                  </div>
                </button>
              ))}
            </div>
            <button className="w-full border border-green-500 text-green-600 rounded-lg py-2.5 text-sm font-medium hover:bg-green-50">
              Lihat Semua Berita
            </button>
          </div>
        </div>

        {/* Kelola Berita grid */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Kelola Berita</h2>
            <p className="text-sm text-gray-500">Manajemen konten berita dan pengumuman Desa Cibenda</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5 mt-6">
          {data.length === 0 ? (
            <p className="col-span-3 text-center text-gray-400 py-10">Belum ada berita.</p>
          ) : (
            data.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="relative h-40 bg-gray-100">
                  {b.gambar ? (
                    <img src={b.gambar} alt={b.judul} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                      <Newspaper size={28} className="text-green-400" />
                    </div>
                  )}
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-green-600 hover:bg-green-50"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-1 rounded uppercase">{b.kategori}</span>
                    <span className="text-[10px] text-gray-400">{b.tanggal}</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 leading-snug mb-1">{b.judul}</h3>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{b.ringkasan}</p>
                  <button onClick={() => handleOpenEdit(b)} className="text-green-600 text-xs font-medium hover:underline">
                    Selengkapnya →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <FooterDesa />

      <BeritaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={editingBerita}
      />
    </div>
  );
}