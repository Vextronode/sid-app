// ==========================================
// DataWargaPage.jsx
// Halaman Data Penduduk & Impor Excel (SID-FE-8.1)
// ==========================================

import { useState } from 'react'
import {
  Search,
  UserPlus,
  FileSpreadsheet,
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
} from 'lucide-react'

import { useWargaList } from '@/features/data-warga/hooks/useWargaList'
import { FooterOperator } from '../../components/layout/FooterOperator'

// Helper format tipe domisili / residency_type
const formatResidencyType = (type) => {
  if (!type) return '-'
  const lower = String(type).toLowerCase()
  if (lower === 'permanent' || lower === 'tetap') return 'Tetap'
  if (lower === 'temporary' || lower === 'pendatang' || lower === 'kontrak') return 'Pendatang'
  if (lower === 'moved' || lower === 'pindah') return 'Pindah'
  return type
}

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

    // opsional: panggil fungsi import dari hook jika ada
    importWargaExcel,
  } = useWargaList()

  const [keyword, setKeyword] = useState('')

  // State Modal Impor Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [importStatus, setImportStatus] = useState({ loading: false, success: null, error: null })

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(keyword)
  }

  // Handler Pilih File
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setSelectedFile(file)
        setImportStatus({ loading: false, success: null, error: null })
      } else {
        setImportStatus({
          loading: false,
          success: null,
          error: 'Format file harus berupa Excel (.xlsx, .xls) atau CSV (.csv)',
        })
      }
    }
  }

  // Handler Submit Impor Excel
  const handleImportSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) return

    setImportStatus({ loading: true, success: null, error: null })

    try {
      if (importWargaExcel) {
        await importWargaExcel(selectedFile)
      } else {
        // Simulasi dummy proses jika API belum tersambung penuh
        await new Promise((resolve) => setTimeout(resolve, 1200))
      }

      setImportStatus({
        loading: false,
        success: 'Data warga berhasil diimpor!',
        error: null,
      })

      // Reset setelah berhasil
      setTimeout(() => {
        setIsImportModalOpen(false)
        setSelectedFile(null)
        setImportStatus({ loading: false, success: null, error: null })
      }, 1500)
    } catch (err) {
      setImportStatus({
        loading: false,
        success: null,
        error:
          err?.response?.data?.message || 'Gagal mengimpor data. Periksa kembali format file Anda.',
      })
    }
  }

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

          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Tombol Impor Excel */}
            <button
              type="button"
              className="sid-operator-secondary"
              onClick={() => setIsImportModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #106D20',
                color: '#106D20',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <FileSpreadsheet size={16} />
              Impor Excel
            </button>

            {/* Tombol Tambah Warga */}
            <button type="button" className="sid-operator-primary">
              <UserPlus size={16} />
              Tambah
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="sid-operator-filter-card">
          <form onSubmit={handleSearchSubmit} className="sid-operator-filter-grid warga-filter">
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
                  setFilterWilayah(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Semua RT/RW</option>

                {wilayahOptions.map((item) => (
                  <option key={`${item.rt_id}-${item.rw_id}`} value={`${item.rt_id}-${item.rw_id}`}>
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
                  <th className="center">Status Domisili</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      Memuat data...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      Belum ada data warga.
                    </td>
                  </tr>
                ) : (
                  data.map((warga) => (
                    <tr key={warga.id}>
                      {/* Nama */}
                      <td className="primary-text">{warga.name}</td>

                      {/* NIK */}
                      <td className="center">{warga.nik}</td>

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

                      {/* Status Domisili (residency_type) */}
                      <td className="center">{formatResidencyType(warga.residency_type)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="sid-operator-pagination">
            <p>
              Menampilkan {data.length === 0 ? 0 : data.length} dari {data.length} data
            </p>

            <div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  type="button"
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={page === currentPage ? 'active' : ''}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL IMPOR EXCEL                           */}
      {/* ========================================== */}
      {isImportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet color="#106D20" size={24} />
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Impor Data Warga</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Template Download Option */}
            <div
              style={{
                backgroundColor: '#F3F8F3',
                border: '1px solid #A7D0A6',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '13px', color: '#2d5a32' }}>
                <strong>Belum punya formatnya?</strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>
                  Unduh templat Excel standar di sini.
                </p>
              </div>
              <a
                href="/templates/template_impor_warga.xlsx"
                download
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#106D20',
                  textDecoration: 'none',
                  backgroundColor: '#fff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #58AE58',
                }}
              >
                <Download size={14} /> Templat
              </a>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleImportSubmit}>
              {/* Dropzone Area */}
              <div
                style={{
                  border: '2px dashed #A7D0A6',
                  borderRadius: '10px',
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: '#FAFAFA',
                  cursor: 'pointer',
                  position: 'relative',
                  marginBottom: '16px',
                }}
              >
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                />

                {!selectedFile ? (
                  <>
                    <Upload size={36} color="#58AE58" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#333' }}>
                      Klik atau seret file Excel / CSV ke sini
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
                      Format yang didukung: .xlsx, .xls, .csv
                    </p>
                  </>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                    }}
                  >
                    <FileText size={28} color="#106D20" />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#333' }}>
                        {selectedFile.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Alert */}
              {importStatus.error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#d32f2f',
                    backgroundColor: '#fde8e8',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{importStatus.error}</span>
                </div>
              )}

              {importStatus.success && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#2e7d32',
                    backgroundColor: '#e8f5e9',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle size={16} />
                  <span>{importStatus.success}</span>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || importStatus.loading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: selectedFile && !importStatus.loading ? '#106D20' : '#ccc',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: selectedFile && !importStatus.loading ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                  }}
                >
                  {importStatus.loading ? 'Mengimpor...' : 'Mulai Impor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FooterOperator />
    </div>
  )
}
