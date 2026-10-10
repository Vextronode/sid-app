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
import { useFamilyList } from '../../features/data-warga/hooks/useFamilyList'
import FamilyManagementPanel from '../../features/data-warga/components/FamilyManagementPanel'
import { FooterOperator } from '../../components/layout/FooterOperator'

const formatResidencyType = (type) => {
  if (!type) return '-'
  const lower = String(type).toLowerCase()
  if (lower === 'lokal' || lower === 'permanent' || lower === 'tetap') return 'Lokal'
  if (lower === 'pendatang' || lower === 'temporary' || lower === 'kontrak') return 'Pendatang'
  return type
}

const labelStyle = {
  display: 'block',
  color: 'var(--sid-text-secondary)',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '4px',
}
const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--sid-border)',
  background: 'var(--sid-surface-card)',
  color: 'var(--sid-text-primary)',
  fontFamily: 'inherit',
}

const emptyForm = {
  nik: '',
  name: '',
  date_of_birth: '',
  place_of_birth: '',
  gender: 'L',
  address: '',
  rt_id: '',
  family_id: '',
  family_role: '',
  residency_type: 'lokal',
  origin_region: '',
  blood_type: '',
  father_name_text: '',
  mother_name_text: '',
  marital_status: '',
  religion: '',
  last_education: '',
  domicile_status: 'menetap',
  current_domicile: '',
}

const emptyImportStatus = { loading: false, success: null, error: null, result: null }

export default function DataWargaPage() {
  const familyList = useFamilyList()
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
      rt_id: wilayahOptions[0]?.id ? String(wilayahOptions[0].id) : '',
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
      residency_type: warga.residency_type || 'lokal',
      family_id: warga.family_id ? String(warga.family_id) : '',
      family_role: warga.family_role || '',
      origin_region: warga.origin_region || '',
      blood_type: warga.blood_type || '',
      father_name_text: warga.father_name_text || '',
      mother_name_text: warga.mother_name_text || '',
      marital_status: warga.marital_status || '',
      religion: warga.religion || '',
      last_education: warga.last_education || '',
      domicile_status: warga.domicile_status || 'menetap',
      current_domicile: warga.current_domicile || '',
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError(null)

    try {
      const citizenFields = {
        ...formData,
        family_id: formData.family_id || null,
        family_role: formData.family_id ? formData.family_role || null : null,
        origin_region:
          formData.residency_type === 'pendatang' ? formData.origin_region || null : null,
        blood_type: formData.blood_type || null,
        father_name_text: formData.father_name_text || null,
        mother_name_text: formData.mother_name_text || null,
        marital_status: formData.marital_status || null,
        religion: formData.religion || null,
        last_education: formData.last_education || null,
        domicile_status: formData.domicile_status || null,
        current_domicile: formData.current_domicile || null,
      }

      if (editingCitizen) {
        // NIK tidak boleh diubah saat edit, jadi tidak dikirim.
        const { nik, ...updatePayload } = citizenFields
        await editCitizen(editingCitizen.id, updatePayload)
      } else {
        await addCitizen(citizenFields)
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
    <div className="sid-operator-page sid-admin-data-page">
      <div className="sid-operator-content">
        <p className="sid-operator-breadcrumb">
          Admin / <span>Data Penduduk</span>
        </p>

        <div className="sid-operator-header">
          <h1>Data Penduduk &amp; Kartu Keluarga</h1>
          <div className="sid-admin-page-actions">
            <button
              type="button"
              className="sid-operator-secondary"
              onClick={() => setIsImportModalOpen(true)}
            >
              <FileSpreadsheet size={16} />
              Impor Excel
            </button>

            <button type="button" className="sid-operator-primary" onClick={handleOpenAddModal}>
              <UserPlus size={16} />
              Tambah Warga
            </button>
          </div>
        </div>

        <FamilyManagementPanel familyList={familyList} />

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
                  <option key={item.id} value={String(item.id)}>
                    {item.label}
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
                  <th className="center">No. KK</th>
                  <th className="center">Peran KK</th>
                  <th className="center">Sinkronisasi</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="empty">
                      Memuat data...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="empty sid-admin-error">
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty">
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
                      <td className="center">{warga.family?.no_kk_masked ?? '-'}</td>
                      <td className="center">{warga.family_role?.replaceAll('_', ' ') ?? '-'}</td>
                      <td className="center">
                        {warga.sync_status ? warga.sync_status.replaceAll('_', ' ') : '-'}
                        {warga.data_source && (
                          <small className="sid-admin-cell-meta">
                            {warga.data_source.replaceAll('_', ' ')}
                          </small>
                        )}
                        {warga.last_verified_at && (
                          <small className="sid-admin-cell-meta">
                            Diverifikasi{' '}
                            {new Date(warga.last_verified_at).toLocaleDateString('id-ID')}
                          </small>
                        )}
                      </td>
                      <td className="center">
                        <div className="sid-operator-actions">
                          <button
                            type="button"
                            title="Edit"
                            className="sid-operator-action edit"
                            onClick={() => handleOpenEditModal(warga)}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            title="Hapus"
                            className="sid-operator-action delete"
                            onClick={() => handleDeleteWarga(warga.id, warga.name)}
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
        <div className="sid-modal-overlay sid-admin-modal-overlay">
          <div className="sid-modal sid-admin-citizen-modal">
            <div className="sid-admin-modal-header">
              <h2>{editingCitizen ? 'Edit Data Warga' : 'Tambah Warga Baru'}</h2>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="sid-admin-icon-button"
                aria-label="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="sid-admin-form">
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

              <div className="sid-admin-form-grid">
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

              <div className="sid-admin-form-grid">
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
                    <option value="lokal">Lokal</option>
                    <option value="pendatang">Pendatang</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Kartu Keluarga</label>
                <select
                  value={formData.family_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      family_id: e.target.value,
                      family_role: e.target.value ? formData.family_role : '',
                    })
                  }
                  style={inputStyle}
                >
                  <option value="">Belum terhubung ke KK</option>
                  {familyList.families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.no_kk_masked} — {family.head_of_family?.name ?? family.family_address}
                    </option>
                  ))}
                </select>
              </div>

              {formData.family_id && (
                <div>
                  <label style={labelStyle}>Peran dalam KK</label>
                  <select
                    value={formData.family_role}
                    onChange={(e) => setFormData({ ...formData, family_role: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Pilih peran</option>
                    {['kepala_keluarga', 'istri', 'suami', 'anak', 'famili_lain'].map((role) => (
                      <option key={role} value={role}>
                        {role.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.residency_type === 'pendatang' && (
                <div>
                  <label style={labelStyle}>Daerah Asal</label>
                  <input
                    value={formData.origin_region}
                    onChange={(e) => setFormData({ ...formData, origin_region: e.target.value })}
                    placeholder="Masukkan daerah asal"
                    style={inputStyle}
                  />
                </div>
              )}

              <details className="sid-admin-form-details">
                <summary>Data Pribadi Tambahan</summary>
                <div className="sid-admin-form-grid">
                  <div>
                    <label style={labelStyle}>Golongan Darah</label>
                    <select
                      value={formData.blood_type}
                      onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Belum diketahui</option>
                      {['A', 'B', 'AB', 'O', 'tidak_tahu'].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Status Perkawinan</label>
                    <select
                      value={formData.marital_status}
                      onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Pilih</option>
                      {['belum_kawin', 'kawin', 'cerai_hidup', 'cerai_mati'].map((value) => (
                        <option key={value} value={value}>
                          {value.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Agama</label>
                    <select
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Pilih</option>
                      {['islam', 'kristen', 'katolik', 'hindu', 'buddha', 'konghucu'].map(
                        (value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Pendidikan Terakhir</label>
                    <select
                      value={formData.last_education}
                      onChange={(e) => setFormData({ ...formData, last_education: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Pilih</option>
                      {['tidak_sekolah', 'sd', 'smp', 'sma', 'diploma', 's1', 's2', 's3'].map(
                        (value) => (
                          <option key={value} value={value}>
                            {value.replaceAll('_', ' ').toUpperCase()}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Status Domisili</label>
                    <select
                      value={formData.domicile_status}
                      onChange={(e) =>
                        setFormData({ ...formData, domicile_status: e.target.value })
                      }
                      style={inputStyle}
                    >
                      {['menetap', 'merantau_dalam_negeri', 'merantau_luar_negeri', 'tki'].map(
                        (value) => (
                          <option key={value} value={value}>
                            {value.replaceAll('_', ' ')}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  {formData.domicile_status !== 'menetap' && (
                    <div>
                      <label style={labelStyle}>Domisili Saat Ini</label>
                      <input
                        value={formData.current_domicile}
                        onChange={(e) =>
                          setFormData({ ...formData, current_domicile: e.target.value })
                        }
                        style={inputStyle}
                      />
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Nama Ayah (jika tidak terdata sebagai warga)</label>
                    <input
                      value={formData.father_name_text}
                      onChange={(e) =>
                        setFormData({ ...formData, father_name_text: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Nama Ibu (jika tidak terdata sebagai warga)</label>
                    <input
                      value={formData.mother_name_text}
                      onChange={(e) =>
                        setFormData({ ...formData, mother_name_text: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </div>
                </div>
              </details>

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
                    <option key={item.id} value={String(item.id)}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <div className="sid-admin-alert sid-admin-alert-error" role="alert">
                  {formError}
                </div>
              )}

              <div className="sid-modal-actions">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="sid-button sid-button-outline"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="sid-button sid-button-primary"
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
        <div className="sid-modal-overlay sid-admin-modal-overlay">
          <div className="sid-modal sid-admin-import-modal">
            <div className="sid-admin-modal-header">
              <div className="sid-admin-import-heading">
                <FileSpreadsheet size={24} />
                <h2>Impor Data Warga</h2>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="sid-admin-icon-button"
                aria-label="Tutup impor"
              >
                <X size={20} />
              </button>
            </div>

            <div className="sid-admin-import-template">
              <div>
                <strong>Belum punya formatnya?</strong>
                <p>Unduh templat Excel standar di sini.</p>
              </div>
              <a
                href="/templates/template_impor_warga.xlsx"
                download
                className="sid-admin-template-link"
              >
                <Download size={14} /> Templat
              </a>
            </div>

            <form onSubmit={handleImportSubmit} className="sid-admin-import-form">
              <label className="sid-admin-file-dropzone">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="sid-admin-file-input"
                />

                {!selectedFile ? (
                  <>
                    <Upload size={36} className="sid-admin-file-icon" />
                    <p className="sid-admin-file-title">Klik atau seret file Excel / CSV ke sini</p>
                    <p className="sid-admin-file-hint">Format yang didukung: .xlsx, .xls, .csv</p>
                  </>
                ) : (
                  <div className="sid-admin-file-selected">
                    <FileText size={28} className="sid-admin-file-icon" />
                    <div>
                      <p className="sid-admin-file-title">{selectedFile.name}</p>
                      <p className="sid-admin-file-hint">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                )}
              </label>

              {importStatus.error && (
                <div className="sid-admin-import-alert sid-admin-alert-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{importStatus.error}</span>
                </div>
              )}

              {importStatus.success && (
                <div className="sid-admin-import-alert sid-admin-alert-success" role="status">
                  <CheckCircle size={16} />
                  <span>{importStatus.success}</span>
                </div>
              )}

              {importStatus.result?.errors?.length > 0 && (
                <ul className="sid-admin-import-errors">
                  {importStatus.result.errors.map((item, i) => (
                    <li key={i}>
                      Baris {item.row}: {item.message}
                    </li>
                  ))}
                </ul>
              )}

              <div className="sid-modal-actions">
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="sid-button sid-button-outline"
                >
                  {importStatus.result ? 'Tutup' : 'Batal'}
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || importStatus.loading}
                  className="sid-button sid-button-primary"
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
