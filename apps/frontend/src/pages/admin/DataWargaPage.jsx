/* eslint-disable no-unused-vars */
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
  Edit,
  Trash2,
} from 'lucide-react'

import { useWargaList } from '../../features/data-warga/hooks/useWargaList'
import { FooterOperator } from '../../components/layout/FooterOperator'

const formatResidencyType = (type) => {
  if (!type) return '-'
  const lower = String(type).toLowerCase()
  if (lower === 'permanent' || lower === 'tetap') return 'Tetap'
  if (lower === 'temporary' || lower === 'pendatang' || lower === 'kontrak') return 'Pendatang'
  if (lower === 'moved' || lower === 'pindah') return 'Pindah'
  return type
}

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }
const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #ccc',
}

const emptyForm = {
  nik: '',
  name: '',
  date_of_birth: '',
  place_of_birth: '',
  gender: 'L',
  address: '',
  rt_id: '',
  residency_type: 'permanent',
}

const emptyImportStatus = { loading: false, success: null, error: null, result: null }

export default function DataWargaPage() {
  const {
    data,
    loading,
    error,
    totalItems,
    setSearch,
    filterWilayah,
    setFilterWilayah,
    wilayahOptions,
    currentPage,
    setCurrentPage,
    totalPages,
    addCitizen,
    editCitizen,
    deleteWarga,
    importWargaExcel,
  } = useWargaList()

  const [keyword, setKeyword] = useState('')

  // Modal Impor Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [importStatus, setImportStatus] = useState(emptyImportStatus)

  // Modal Form CRUD (Tambah / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCitizen, setEditingCitizen] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(keyword)
  }

  const handleOpenAddModal = () => {
    setEditingCitizen(null)
    setFormData({
      ...emptyForm,
      rt_id: wilayahOptions[0]?.rt_id ? String(wilayahOptions[0].rt_id) : '',
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (warga) => {
    setEditingCitizen(warga)
    setFormData({
      nik: '',
      name: warga.name || '',
      date_of_birth: warga.date_of_birth ? String(warga.date_of_birth).slice(0, 10) : '',
      place_of_birth: warga.place_of_birth || '',
      gender: warga.gender || 'L',
      address: warga.address || '',
      rt_id: warga.rt_id ? String(warga.rt_id) : '',
      residency_type: warga.residency_type || 'permanent',
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError(null)

    try {
      if (editingCitizen) {
        // NIK tidak boleh diubah saat edit, jadi tidak dikirim.
        const { nik, ...updatePayload } = formData
        await editCitizen(editingCitizen.id, updatePayload)
      } else {
        await addCitizen(formData)
      }
      setIsFormModalOpen(false)
    } catch (err) {
      const errs = err?.response?.data?.errors
      setFormError(
        (errs && Object.values(errs)[0]?.[0]) ||
          err?.response?.data?.message ||
          'Gagal menyimpan data warga.',
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDeleteWarga = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data warga: ${name}?`)) {
      try {
        await deleteWarga(id)
      } catch {
        alert('Gagal menghapus data warga')
      }
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setSelectedFile(file)
        setImportStatus(emptyImportStatus)
      } else {
        setImportStatus({
          ...emptyImportStatus,
          error: 'Format file harus berupa Excel (.xlsx, .xls) atau CSV (.csv)',
        })
      }
    }
  }

  const closeImportModal = () => {
    setIsImportModalOpen(false)
    setSelectedFile(null)
    setImportStatus(emptyImportStatus)
  }

  const handleImportSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) return

    setImportStatus({ ...emptyImportStatus, loading: true })

    try {
      const result = await importWargaExcel(selectedFile)
      const failed = result?.error_count ?? 0

      setImportStatus({
        loading: false,
        success: `${result?.success_count ?? 0} baris berhasil diimpor${
          failed ? `, ${failed} baris gagal` : ''
        }.`,
        error: null,
        result,
      })

      // Tutup otomatis hanya kalau semua baris berhasil.
      if (!failed) {
        setTimeout(closeImportModal, 1200)
      }
    } catch (err) {
      setImportStatus({
        ...emptyImportStatus,
        error:
          err?.response?.data?.message || 'Gagal mengimpor data. Periksa kembali format file Anda.',
      })
    }
  }

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <p className="sid-operator-breadcrumb">
          Admin / <span>Data Penduduk</span>
        </p>

        <div className="sid-operator-header">
          <h1>Data Penduduk</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
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

            <button
              type="button"
              className="sid-operator-primary"
              onClick={handleOpenAddModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#106D20',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <UserPlus size={16} />
              Tambah Warga
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="sid-operator-filter-card">
          <form onSubmit={handleSearchSubmit} className="sid-operator-filter-grid warga-filter">
            <div className="sid-operator-filter-field">
              <p>Pencarian Cepat</p>
              <div className="sid-operator-search">
                <Search size={16} />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari nama warga..."
                />
              </div>
            </div>

            <div className="sid-operator-filter-field">
              <p>Wilayah</p>
              <select value={filterWilayah} onChange={(e) => setFilterWilayah(e.target.value)}>
                <option value="">Semua RT/RW</option>
                {wilayahOptions.map((item) => (
                  <option key={item.rt_id} value={String(item.rt_id)}>
                    RT {item.rt?.number ?? '-'} / RW {item.rw?.number ?? '-'}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {/* Tabel Data */}
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
                  <th className="center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Memuat data...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="empty" style={{ color: '#d32f2f' }}>
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Belum ada data warga.
                    </td>
                  </tr>
                ) : (
                  data.map((warga) => (
                    <tr key={warga.id}>
                      <td className="primary-text">{warga.name}</td>
                      <td className="center">{warga.nik_masked ?? '-'}</td>
                      <td className="center">
                        RT {warga.rt?.number ?? '-'} / RW {warga.rw?.number ?? '-'}
                      </td>
                      <td className="center">
                        {warga.gender === 'L'
                          ? 'Laki-Laki'
                          : warga.gender === 'P'
                            ? 'Perempuan'
                            : '-'}
                      </td>
                      <td className="center">{formatResidencyType(warga.residency_type)}</td>
                      <td className="center">
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => handleOpenEditModal(warga)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#f59e0b',
                              padding: 0,
                            }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            title="Hapus"
                            onClick={() => handleDeleteWarga(warga.id, warga.name)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                              padding: 0,
                            }}
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
          </div>

          {/* Pagination */}
          <div className="sid-operator-pagination">
            <p>
              Menampilkan {data.length} dari {totalItems} data
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

      {/* Modal Tambah / Edit Warga */}
      {isFormModalOpen && (
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
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                {editingCitizen ? 'Edit Data Warga' : 'Tambah Warga Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label style={labelStyle}>NIK</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required={!editingCitizen}
                  disabled={!!editingCitizen}
                  minLength={16}
                  maxLength={16}
                  pattern="\d{16}"
                  title="NIK harus 16 digit angka"
                  value={editingCitizen ? editingCitizen.nik_masked || '' : formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  placeholder="Masukkan 16 digit NIK"
                  style={{ ...inputStyle, backgroundColor: editingCitizen ? '#f3f3f3' : '#fff' }}
                />
                {editingCitizen && (
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
                    NIK tidak dapat diubah.
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Nama Lengkap</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Tempat Lahir</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formData.place_of_birth}
                    onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                    placeholder="Opsional"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tanggal Lahir</label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Jenis Kelamin</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="L">Laki-Laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Status Domisili</label>
                  <select
                    value={formData.residency_type}
                    onChange={(e) => setFormData({ ...formData, residency_type: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="permanent">Tetap</option>
                    <option value="temporary">Pendatang</option>
                    <option value="moved">Pindah</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Alamat</label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Masukkan alamat lengkap"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Wilayah RT / RW</label>
                <select
                  required
                  value={formData.rt_id}
                  onChange={(e) => setFormData({ ...formData, rt_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Pilih RT/RW</option>
                  {wilayahOptions.map((item) => (
                    <option key={item.rt_id} value={String(item.rt_id)}>
                      RT {item.rt?.number ?? '-'} / RW {item.rw?.number ?? '-'}
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <div
                  style={{
                    color: '#d32f2f',
                    backgroundColor: '#fde8e8',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                >
                  {formError}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#106D20',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {formSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impor Excel */}
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
                onClick={closeImportModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <X size={20} />
              </button>
            </div>

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

            <form onSubmit={handleImportSubmit}>
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

              {importStatus.result?.errors?.length > 0 && (
                <ul
                  style={{
                    maxHeight: 120,
                    overflowY: 'auto',
                    fontSize: 12,
                    color: '#d32f2f',
                    margin: '0 0 16px',
                    paddingLeft: 18,
                  }}
                >
                  {importStatus.result.errors.map((item, i) => (
                    <li key={i}>
                      Baris {item.row}: {item.message}
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={closeImportModal}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {importStatus.result ? 'Tutup' : 'Batal'}
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
