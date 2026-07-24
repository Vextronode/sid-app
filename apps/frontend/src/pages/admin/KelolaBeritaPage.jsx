// ==========================================
// KelolaBeritaPage.jsx
// Halaman kelola berita & pengumuman: search (tanpa filter status),
// tabel, pagination, tambah/edit lewat modal, hapus.
// ==========================================

import { useState } from 'react';
import { Search, Pencil, Trash2, Plus } from 'lucide-react';
import { useBeritaList } from '@/features/kelola-berita/hooks/useBeritaList';
import BeritaFormModal from '@/features/kelola-berita/components/BeritaFormModal';

const STATUS_BADGE = {
  draft: 'bg-yellow-100 text-yellow-700',
  publikasi: 'bg-green-100 text-green-700',
};

export default function KelolaBeritaPage() {
  const { data, setSearch, currentPage, setCurrentPage, totalPages, deleteBerita, addBerita, updateBerita } = useBeritaList();
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBerita, setEditingBerita] = useState(null); // null = mode tambah baru

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(keyword);
  };

  const handleDelete = (id) => {
    if (confirm('Yakin mau hapus berita ini?')) deleteBerita(id);
  };

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

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="font-medium text-gray-800 text-lg mb-4">Berita &amp; informasi </h2>

      <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Cari Berita..."
          className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <button type="submit" className="bg-green-600 text-white px-4 rounded-md flex items-center justify-center">
          <Search size={16} />
        </button>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="border border-green-500 text-green-600 rounded-md px-4 text-sm flex items-center gap-1"
        >
          <Plus size={14} /> Tambah berita
        </button>
      </form>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-3 px-4 font-medium">Judul</th>
            <th className="py-3 px-4 font-medium">Tanggal</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium">Penulis</th>
            <th className="py-3 px-4 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-gray-400 py-8">Belum ada berita.</td>
            </tr>
          ) : (
            data.map((berita) => (
              <tr key={berita.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{berita.judul}</td>
                <td className="py-3 px-4">{berita.tanggal}</td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[berita.status]}`}>
                    {berita.status === 'draft' ? 'draft' : 'Publikasi'}
                  </span>
                </td>
                <td className="py-3 px-4">{berita.penulis}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(berita)}
                      className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-600"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(berita.id)}
                      className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex justify-end mt-4">
        <div className="flex gap-2">
          {pages.map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-9 h-9 rounded-md border text-sm font-medium ${
                page === currentPage ? 'bg-green-600 border-green-600 text-white' : 'border-green-500 text-green-600 hover:bg-green-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>

      <BeritaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={editingBerita}
      />
    </div>
  );
}