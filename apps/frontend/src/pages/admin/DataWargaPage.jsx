// ==========================================
// DataWargaPage.jsx
// Halaman Data Penduduk.
// Layout disamakan dengan OperatorSuratListPage.
// Logic/API tidak diubah.
// ==========================================

import { useState } from 'react';
import {
  Search,
  UserPlus,
} from 'lucide-react';

import { useWargaList } from '@/features/data-warga/hooks/useWargaList';
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
    if (confirm('Yakin mau hapus data warga ini?')) {
      deleteWarga(id);
    }
  };

  return (
    <div className="sid-operator-page">

      <div className="sid-operator-content">

        {/* Breadcrumb */}
        <p className="sid-operator-breadcrumb">
          Admin / <span>Data Penduduk</span>
        </p>

        {/* Header */}
        <div className="sid-operator-header">

          <h1>Data Penduduk</h1>

          <button
            type="button"
            className="sid-operator-primary"
          >
            <UserPlus size={16} />
            Tambah
          </button>

        </div>

        {/* Search & Filter */}
        <div className="sid-operator-filter-card">

          <form
            onSubmit={handleSearchSubmit}
            className="sid-operator-filter-grid warga-filter"
          >

            {/* Search */}
            <div className="sid-operator-filter-field">

              <p>Pencarian Cepat</p>

              <div className="sid-operator-search">

                <Search size={16} />

                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari Nama atau NIK..."
                />

              </div>

            </div>

            {/* Wilayah */}
            <div className="sid-operator-filter-field">

              <p>Wilayah</p>

              <select
                value={filterWilayah}
                onChange={(e) => {
                  setFilterWilayah(e.target.value);
                  setCurrentPage(1);
                }}
              >

                <option value="">
                  Semua RT/RW
                </option>

                {wilayahOptions.map((item) => (
                  <option
                    key={`${item.rt_id}-${item.rw_id}`}
                    value={`${item.rt_id}-${item.rw_id}`}
                  >
                    RT {item.rt?.number} / RW {item.rw?.number}
                  </option>
                ))}

              </select>

            </div>

          </form>

        </div>

        {/* Table */}
        <div className="sid-operator-table-card">

          <div className="sid-operator-table-wrapper">

            <table className="sid-operator-table">

              <thead>
                <tr>
                  <th>Nama</th>
                  <th className="center">NIK</th>
                  <th className="center">RT/RW</th>
                  <th className="center">Jenis Kelamin</th>
                </tr>
              </thead>

              <tbody>

                {loading ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      Memuat data...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      Belum ada data warga.
                    </td>
                  </tr>
                ) : (
                  data.map((warga) => (
                    <tr key={warga.id}>

                      {/* Nama */}
                      <td className="primary-text">
                        {warga.name}
                      </td>

                      {/* NIK */}
                      <td className="center">
                        {warga.nik}
                      </td>

                      {/* RT / RW */}
                      <td className="center">
                        RT {warga.rt?.number ?? '-'}
                        {' / '}
                        RW {warga.rw?.number ?? '-'}
                      </td>

                      {/* Gender */}
                      <td className="center">
                        {warga.gender === 'L'
                          ? 'Laki-Laki'
                          : warga.gender === 'P'
                            ? 'Perempuan'
                            : '-'}
                      </td>

                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>

          {/* Pagination */}
          <div className="sid-operator-pagination">

            <p>
              Menampilkan{' '}
              {data.length === 0 ? 0 : data.length}{' '}
              dari {data.length} data
            </p>

            <div>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.max(1, p - 1)
                  )
                }
                disabled={currentPage === 1}
              >
                Sebelumnya
              </button>

              {Array.from(
                { length: totalPages },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  type="button"
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={
                    page === currentPage
                      ? 'active'
                      : ''
                  }
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(totalPages, p + 1)
                  )
                }
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </button>

            </div>

          </div>

        </div>

      </div>

      <FooterOperator />

    </div>
  );
}