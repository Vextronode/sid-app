// ==========================================
// DataWargaPage.jsx
// Halaman kelola data warga: search, filter RT/RW, tabel, pagination,
// aksi edit & hapus. Data masih dummy, siap diganti fetch API nanti.
// ==========================================

import { useState } from 'react';
import { Search, Pencil, Trash2, Plus } from 'lucide-react';
import { useWargaList } from '@/features/data-warga/hooks/useWargaList';

export default function DataWargaPage() {
  const { data, setSearch, filterWilayah, setFilterWilayah, currentPage, setCurrentPage, totalPages, deleteWarga } = useWargaList();
  const [keyword, setKeyword] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(keyword);
  };

  const handleDelete = (id) => {
    if (confirm('Yakin mau hapus data warga ini?')) deleteWarga(id);
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="font-medium text-gray-800 text-lg mb-4">Data Warga</h2>

      <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Cari Nama atau NIK..."
          className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <button type="submit" className="bg-green-600 text-white px-4 rounded-md flex items-center justify-center">
          <Search size={16} />
        </button>
        <select
          value={filterWilayah}
          onChange={(e) => setFilterWilayah(e.target.value)}
          className="border border-green-500 text-green-600 rounded-md px-3 text-sm"
        >
          <option value="">Semua RT/RW</option>
          <option value="001/001">001/001</option>
        </select>
        <button className="border border-green-500 text-green-600 rounded-md px-4 text-sm flex items-center gap-1">
          <Plus size={14} /> Tambah
        </button>
      </form>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-3 px-4 font-medium">Nama</th>
            <th className="py-3 px-4 font-medium">NIK</th>
            <th className="py-3 px-4 font-medium">RT/RW</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-gray-400 py-8">Belum ada data warga.</td>
            </tr>
          ) : (
            data.map((warga) => (
              <tr key={warga.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{warga.nama}</td>
                <td className="py-3 px-4">{warga.nik}</td>
                <td className="py-3 px-4">{warga.rt}/{warga.rw}</td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${warga.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {warga.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-600" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(warga.id)} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600" title="Hapus">
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
    </div>
  );
}