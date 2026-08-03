// ==========================================
// DataWargaPage.jsx
// Halaman Data Penduduk, disamakan gayanya dengan ManajemenUserPage:
// card putih besar, search bulat, filter RT/RW, tombol "+ Tambah"
// hijau, tabel dengan badge status, pagination bulat, footer di bawah.
// ==========================================

import { useState } from 'react';
import { Search, Pencil, Trash2, UserPlus } from 'lucide-react';
import { useWargaList } from '@/features/data-warga/hooks/useWargaList';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { FooterOperator } from '../../components/layout/FooterOperator';

export default function DataWargaPage() {
  const {
    data,
    loading,

    setSearch,

    filterWilayah,
    setFilterWilayah,
    wilayahOptions,

    currentPage,
    setCurrentPage,

    totalPages,

    deleteWarga,
  } = useWargaList();  
  const [keyword, setKeyword] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(keyword);
  };

  const handleDelete = (id) => {
    if (confirm('Yakin mau hapus data warga ini?')) deleteWarga(id);
  };

  return (
    <div>
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Data Penduduk</h1>
          <p className="text-sm text-gray-500 mb-6">Kelola data warga dan wilayah administratif Desa Cibenda.</p>

          <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari Nama atau NIK..."
                className="w-full border rounded-full pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500"
              />
            </div>
            <select
              value={filterWilayah}
              onChange={(e) => setFilterWilayah(e.target.value)}
              className="border rounded-full px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-green-500"
            >
             <option value="">Semua RT/RW</option>

{wilayahOptions.map((item) => (
  <option
    key={`${item.rt_id}-${item.rw_id}`}
    value={`${item.rt_id}-${item.rw_id}`}
  >
    RT {item.rt?.number} / RW {item.rw?.number}
  </option>
))}
            </select>
            <button
              type="button"
              className="flex items-center gap-2 bg-green-600 text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-green-700 shrink-0"
            >
              <UserPlus size={16} /> Tambah
            </button>
          </form>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-400 text-xs">
                <th className="py-3 font-medium text-">Nama</th>
                <th className="py-3 font-medium text-center">NIK</th>
                <th className="py-3 font-medium text-center">RT/RW</th>
                <th className="py-3 font-medium text-center">Jenis Kelamin</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
  <tr>
    <td colSpan={5} className="text-center py-8">
      Memuat data...
    </td>
  </tr>
) : data.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">Belum ada data warga.</td></tr>
              ) : (
                data.map((warga) => (
                  <tr key={warga.id} className="border-b last:border-0">
                    <td className="py-4 font-semibold text-gray-800 text-">{warga.name}</td>
                    <td className="py-4 text-gray-600 text-center">{warga.nik}</td>
                    <td className="py-4 text-gray-600 text-center">RT {warga.rt?.number} / RW {warga.rw?.number}</td>
                    <td className="py-4 text-center">
                      {warga.gender}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-full text-sm font-medium border ${
                  page === currentPage ? 'bg-green-700 text-white border-green-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>

      <FooterOperator />
    </div>
  );
}