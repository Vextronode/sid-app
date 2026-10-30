import { useEffect, useRef, useState } from 'react'
import {
  Plus,
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
  History,
  Trash2,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'

import { useWargaList } from '../../features/data-warga/hooks/useWargaList'
import { useFamilyList } from '../../features/data-warga/hooks/useFamilyList'
import FamilyManagementPanel from '../../features/data-warga/components/FamilyManagementPanel'
import { WilayahFilterSelects } from '../../features/data-warga/components/WilayahFilterSelects'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { getOccupations } from '../../features/pekerjaan/api'
import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { downloadErrorMessage, downloadFile } from '@/lib/downloadFile'
import {
  BLOOD_TYPE_LABELS,
  DATA_SOURCE_LABELS,
  DOMICILE_STATUS_LABELS,
  FAMILY_ROLE_LABELS,
  LAST_EDUCATION_LABELS,
  MARITAL_STATUS_LABELS,
  RELIGION_LABELS,
  SYNC_STATUS_LABELS,
  labelOf,
  optionsOf,
} from '@/shared/lib/labels'
import { alertDialog, confirmDialog } from '@/shared/lib/dialog'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { isFormDirty } from '@/shared/lib/isFormDirty'
import { notifySuccess } from '@/shared/lib/toast'
import { RevealableValue } from '@/components/ui/RevealableValue'
import { revealCitizenNik, revealFamilyNumber } from '@/shared/lib/identityApi'

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
  occupation_id: '',
  religion: '',
  last_education: '',
  domicile_status: 'menetap',
  current_domicile: '',
  // Dokumen & keterangan tambahan (Formulir Biodata Keluarga F-1.01).
  title_front: '',
  title_back: '',
  birth_certificate_number: '',
  marriage_certificate_number: '',
  marriage_date: '',
  divorce_certificate_number: '',
  divorce_date: '',
  has_disorder: false,
  disability: '',
}

const emptyImportStatus = { loading: false, success: null, error: null, result: null }

// Dua bagian halaman, ditampilkan sebagai tab seperti halaman Lembaga
// Kemasyarakatan. Tab aktif disimpan di ?tab= agar tetap saat kembali
// dari halaman lain.
const SECTIONS = [
  { value: 'penduduk', label: 'Data Penduduk' },
  { value: 'kk', label: 'Kartu Keluarga' },
]

export default function DataWargaPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // Log Aktivitas hanya dapat dibuka Staf SIDUTama.
  const canViewHistory = user?.role === 'staf_sid'
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection = searchParams.get('tab') === 'kk' ? 'kk' : 'penduduk'
  const switchSection = (value) =>
    setSearchParams(value === 'penduduk' ? {} : { tab: value }, { replace: true })
  const familyList = useFamilyList()
  // Tombol Tambah KK di header membuka form milik panel KK.
  const familyPanelRef = useRef(null)
  const {
    data,
    loading,
    error,
    totalItems,
    reload,
    setSearch,
    filters,
    setFilter,
    hamletOptions,
    rwOptions,
    rtOptions,
    wilayahOptions,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
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

  // Katalog pekerjaan untuk pilihan di form warga. Yang nonaktif ikut
  // dimuat agar pekerjaan lama warga tetap tampil saat diedit.
  const [occupations, setOccupations] = useState([])

  useEffect(() => {
    let active = true

    getOccupations({ includeInactive: true })
      .then((response) => {
        if (active) setOccupations(response.data?.data ?? [])
      })
      .catch(() => {
        if (active) setOccupations([])
      })

    return () => {
      active = false
    }
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(keyword)
  }

  // Isian saat modal dibuka, pembanding untuk peringatan "Buang perubahan?".
  const [formBaseline, setFormBaseline] = useState(null)

  const openForm = (initial) => {
    setFormData(initial)
    setFormBaseline(initial)
  }

  const closeFormModal = () => setIsFormModalOpen(false)

  const requestCloseForm = useConfirmDiscard(
    isFormModalOpen && isFormDirty(formData, formBaseline),
    { disabled: formSubmitting, escapeClose: isFormModalOpen ? closeFormModal : null },
  )

  const handleOpenAddModal = () => {
    setEditingCitizen(null)
    openForm({
      ...emptyForm,
      rt_id: wilayahOptions[0]?.id ? String(wilayahOptions[0].id) : '',
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (warga) => {
    setEditingCitizen(warga)
    openForm({
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
      occupation_id: warga.occupation_id ? String(warga.occupation_id) : '',
      religion: warga.religion || '',
      last_education: warga.last_education || '',
      domicile_status: warga.domicile_status || 'menetap',
      current_domicile: warga.current_domicile || '',
      title_front: warga.title_front || '',
      title_back: warga.title_back || '',
      birth_certificate_number: warga.birth_certificate_number || '',
      marriage_certificate_number: warga.marriage_certificate_number || '',
      marriage_date: warga.marriage_date ? String(warga.marriage_date).slice(0, 10) : '',
      divorce_certificate_number: warga.divorce_certificate_number || '',
      divorce_date: warga.divorce_date ? String(warga.divorce_date).slice(0, 10) : '',
      has_disorder: Boolean(warga.has_disorder),
      disability: warga.disability || '',
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
        occupation_id: formData.occupation_id ? Number(formData.occupation_id) : null,
        religion: formData.religion || null,
        last_education: formData.last_education || null,
        domicile_status: formData.domicile_status || null,
        current_domicile: formData.current_domicile || null,
        title_front: formData.title_front || null,
        title_back: formData.title_back || null,
        birth_certificate_number: formData.birth_certificate_number || null,
        marriage_certificate_number: formData.marriage_certificate_number || null,
        marriage_date: formData.marriage_date || null,
        divorce_certificate_number: formData.divorce_certificate_number || null,
        divorce_date: formData.divorce_date || null,
        has_disorder: Boolean(formData.has_disorder),
        disability: formData.has_disorder ? formData.disability || null : null,
      }

      if (editingCitizen) {
        // NIK tidak boleh diubah saat edit, jadi tidak dikirim.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dibuang dari payload
        const { nik, ...updatePayload } = citizenFields
        await editCitizen(editingCitizen.id, updatePayload)
      } else {
        await addCitizen(citizenFields)
      }
      notifySuccess(
        editingCitizen
          ? `Data warga ${formData.name} berhasil diperbarui.`
          : `Warga ${formData.name} berhasil ditambahkan.`,
      )
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
    if (
      await confirmDialog({
        title: `Hapus data warga ${name}?`,
        message: 'Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Hapus',
      })
    ) {
      try {
        await deleteWarga(id)
        notifySuccess(`Data warga ${name} berhasil dihapus.`)
      } catch {
        alertDialog({ title: 'Terjadi kesalahan', message: 'Gagal menghapus data warga.' })
      }
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadFile('/api/citizens/import-template', 'template_impor_warga.xlsx')
    } catch (err) {
      alertDialog({
        title: 'Unduhan gagal',
        message: await downloadErrorMessage(err, 'Gagal mengunduh templat Excel.'),
      })
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

  // Berkas sudah dipilih tetapi belum diimpor: tanya dulu sebelum menutup.
  const requestCloseImport = useConfirmDiscard(
    isImportModalOpen && Boolean(selectedFile) && !importStatus.result,
    {
      disabled: importStatus.loading,
      escapeClose: isImportModalOpen ? closeImportModal : null,
    },
  )

  const handleImportSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) return

    const confirmed = await confirmDialog({
      title: `Impor data dari ${selectedFile.name}?`,
      message:
        'Setiap baris yang valid langsung ditambahkan sebagai data warga baru dan baris yang gagal dilewati. Impor tidak dapat dibatalkan sekaligus.',
      confirmLabel: 'Mulai Impor',
      tone: 'primary',
    })

    if (!confirmed) return

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
        notifySuccess(`${result?.success_count ?? 0} data warga berhasil diimpor.`)
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
            {/* Memuat ulang tab yang sedang dibuka. */}
            <RefreshButton
              onRefresh={() => (activeSection === 'kk' ? familyList.reload() : reload())}
            />

            {activeSection === 'penduduk' && (
              <>
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
              </>
            )}

            {activeSection === 'kk' && (
              <button
                type="button"
                className="sid-operator-primary"
                onClick={() => familyPanelRef.current?.openCreate()}
              >
                <Plus size={16} />
                Tambah KK
              </button>
            )}
          </div>
        </div>

        <div className="sid-wilayah-tabs" role="tablist" aria-label="Pilih bagian data">
          {SECTIONS.map((section) => (
            <button
              key={section.value}
              id={`data-tab-${section.value}`}
              type="button"
              role="tab"
              aria-selected={section.value === activeSection}
              aria-controls={`data-panel-${section.value}`}
              className={`sid-wilayah-tab${section.value === activeSection ? ' sid-wilayah-tab-active' : ''}`}
              onClick={() => switchSection(section.value)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {activeSection === 'kk' && (
          <div id="data-panel-kk" role="tabpanel" aria-labelledby="data-tab-kk">
            <FamilyManagementPanel
              ref={familyPanelRef}
              familyList={familyList}
              canViewHistory={canViewHistory}
            />
          </div>
        )}

        {activeSection === 'penduduk' && (
          <section
            id="data-panel-penduduk"
            role="tabpanel"
            className="sid-operator-table-card sid-admin-section-panel"
            aria-labelledby="citizens-heading"
          >
            <div className="sid-operator-header">
              <div>
                <h2 id="citizens-heading">Data Penduduk</h2>
                <p>Kelola data individu warga beserta status domisili dan keanggotaan KK.</p>
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
                      placeholder="Cari NIK (16 digit) atau nama warga..."
                    />
                  </div>
                </div>

                <WilayahFilterSelects
                  filters={filters}
                  setFilter={setFilter}
                  hamletOptions={hamletOptions}
                  rwOptions={rwOptions}
                  rtOptions={rtOptions}
                />
              </form>
            </div>

            {/* Tabel Data */}
            <div>
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
                          <td className="center">
                            <RevealableValue
                              masked={warga.nik_masked}
                              reveal={() => revealCitizenNik(warga.id)}
                            />
                          </td>
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
                            <RevealableValue
                              masked={warga.family?.no_kk_masked}
                              reveal={() => revealFamilyNumber(warga.family.id)}
                              label="No. KK"
                            />
                          </td>
                          <td className="center">
                            {labelOf(FAMILY_ROLE_LABELS, warga.family_role)}
                          </td>
                          <td className="center">
                            {labelOf(SYNC_STATUS_LABELS, warga.sync_status)}
                            {warga.data_source && (
                              <small className="sid-admin-cell-meta">
                                {labelOf(DATA_SOURCE_LABELS, warga.data_source)}
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
                              {canViewHistory && (
                                <button
                                  type="button"
                                  title="Riwayat perubahan"
                                  className="sid-operator-action detail"
                                  onClick={() =>
                                    navigate(
                                      `/admin/log-aktivitas?tab=penduduk&type=citizen&subject=${encodeURIComponent(warga.id)}`,
                                    )
                                  }
                                >
                                  <History size={16} />
                                </button>
                              )}
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
                <div className="sid-pagination-meta">
                  <p>{formatPageRange(currentPage, pageSize, totalItems)}</p>
                  <PageSizeSelect value={pageSize} onChange={setPageSize} />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Sebelumnya
                  </button>
                  <PageNumbers
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onChange={setCurrentPage}
                  />
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
          </section>
        )}
      </div>

      {/* Modal Tambah / Edit Warga */}
      {isFormModalOpen && (
        <div className="sid-modal-overlay sid-admin-modal-overlay">
          <div className="sid-modal sid-admin-citizen-modal">
            <div className="sid-admin-modal-header">
              <h2>{editingCitizen ? 'Edit Data Warga' : 'Tambah Warga Baru'}</h2>
              <button
                type="button"
                onClick={() => requestCloseForm(closeFormModal)}
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
                  {familyList.options.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.no_kk_masked} - {family.head_of_family?.name ?? family.family_address}
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
                    {optionsOf(FAMILY_ROLE_LABELS).map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
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
                      {optionsOf(BLOOD_TYPE_LABELS).map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
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
                      {optionsOf(MARITAL_STATUS_LABELS).map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Pekerjaan</label>
                    <select
                      value={formData.occupation_id}
                      onChange={(e) => setFormData({ ...formData, occupation_id: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Pilih</option>
                      {occupations
                        .filter(
                          (item) => item.is_active || String(item.id) === formData.occupation_id,
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                            {item.is_active ? '' : ' (Nonaktif)'}
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
                      {optionsOf(RELIGION_LABELS).map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
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
                      {optionsOf(LAST_EDUCATION_LABELS).map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
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
                      {optionsOf(DOMICILE_STATUS_LABELS).map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
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

              <details className="sid-admin-form-details">
                <summary>Dokumen &amp; Keterangan Tambahan</summary>
                <p className="sid-admin-file-hint">
                  Dipakai untuk Formulir Biodata Keluarga (F-1.01). Kosongkan bila tidak ada.
                </p>
                <div className="sid-admin-form-grid">
                  <div>
                    <label style={labelStyle} htmlFor="warga-title_front">
                      Gelar Depan
                    </label>
                    <input
                      id="warga-title_front"
                      value={formData.title_front}
                      onChange={(e) => setFormData({ ...formData, title_front: e.target.value })}
                      placeholder="Contoh: Dr."
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="warga-title_back">
                      Gelar Belakang
                    </label>
                    <input
                      id="warga-title_back"
                      value={formData.title_back}
                      onChange={(e) => setFormData({ ...formData, title_back: e.target.value })}
                      placeholder="Contoh: S.Pd."
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="warga-birth_certificate_number">
                      No. Akta Lahir
                    </label>
                    <input
                      id="warga-birth_certificate_number"
                      value={formData.birth_certificate_number}
                      onChange={(e) =>
                        setFormData({ ...formData, birth_certificate_number: e.target.value })
                      }
                      placeholder="Kosongkan bila belum punya"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="warga-marriage_certificate_number">
                      No. Akta/Buku Nikah
                    </label>
                    <input
                      id="warga-marriage_certificate_number"
                      value={formData.marriage_certificate_number}
                      onChange={(e) =>
                        setFormData({ ...formData, marriage_certificate_number: e.target.value })
                      }
                      placeholder="Kosongkan bila tidak ada"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="warga-marriage_date">
                      Tanggal Perkawinan
                    </label>
                    <input
                      id="warga-marriage_date"
                      type="date"
                      value={formData.marriage_date}
                      onChange={(e) => setFormData({ ...formData, marriage_date: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="warga-divorce_certificate_number">
                      No. Akta Cerai
                    </label>
                    <input
                      id="warga-divorce_certificate_number"
                      value={formData.divorce_certificate_number}
                      onChange={(e) =>
                        setFormData({ ...formData, divorce_certificate_number: e.target.value })
                      }
                      placeholder="Kosongkan bila tidak ada"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="warga-divorce_date">
                      Tanggal Perceraian
                    </label>
                    <input
                      id="warga-divorce_date"
                      type="date"
                      value={formData.divorce_date}
                      onChange={(e) => setFormData({ ...formData, divorce_date: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="warga-has_disorder">
                      Kelainan Fisik &amp; Mental
                    </label>
                    <select
                      id="warga-has_disorder"
                      value={formData.has_disorder ? 'ada' : 'tidak'}
                      onChange={(e) =>
                        setFormData({ ...formData, has_disorder: e.target.value === 'ada' })
                      }
                      style={inputStyle}
                    >
                      <option value="tidak">Tidak ada</option>
                      <option value="ada">Ada</option>
                    </select>
                  </div>
                  {formData.has_disorder && (
                    <div>
                      <label style={labelStyle} htmlFor="warga-disability">
                        Penyandang Cacat
                      </label>
                      <input
                        id="warga-disability"
                        required
                        value={formData.disability}
                        onChange={(e) => setFormData({ ...formData, disability: e.target.value })}
                        placeholder="Contoh: Tuna netra"
                        style={inputStyle}
                      />
                    </div>
                  )}
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
                  onClick={() => requestCloseForm(closeFormModal)}
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
                onClick={() => requestCloseImport(closeImportModal)}
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
              <button
                type="button"
                className="sid-admin-template-link"
                onClick={handleDownloadTemplate}
              >
                <Download size={14} /> Templat
              </button>
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
                  onClick={() => requestCloseImport(closeImportModal)}
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

      <SiteFooter />
    </div>
  )
}
