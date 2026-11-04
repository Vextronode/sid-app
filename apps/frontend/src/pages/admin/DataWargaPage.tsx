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
  RefreshCw,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/contexts/AuthContext'

import { useWargaList } from '../../features/data-warga/hooks/useWargaList'
import { useFamilyList } from '../../features/data-warga/hooks/useFamilyList'
import FamilyManagementPanel from '../../features/data-warga/components/FamilyManagementPanel'
import { WilayahFilterSelects } from '../../features/data-warga/components/WilayahFilterSelects'
import { WilayahCascadeFields } from '@/features/kelola-wilayah/components/WilayahCascadeFields'
import { EMPTY_WILAYAH_CASCADE } from '@/features/kelola-wilayah/hooks/useWilayahCascade'
import type { WilayahCascadeValue } from '@/features/kelola-wilayah/hooks/useWilayahCascade'
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
import { revealCitizenNik } from '@/shared/lib/identityApi'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { EMPTY_CITIZEN_FORM, citizenToForm } from '@/features/data-warga/utils/citizenForm'
import type { CitizenForm } from '@/features/data-warga/utils/citizenForm'
import type {
  CitizenImportConflict,
  CitizenImportPreview,
  CitizenImportResult,
} from '@/features/data-warga/hooks/useWargaList'
import { ImportConflictDialog } from '@/features/data-warga/components/ImportConflictDialog'
import { ImportPreviewSummary } from '@/features/data-warga/components/ImportPreviewSummary'
import { ImportProgressOverlay } from '@/features/data-warga/components/ImportProgressOverlay'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { Citizen, Occupation } from '@/types'
import { FamilyNumberValue } from '@/features/data-warga/components/FamilyNumberValue'
import type { FamilyManagementPanelHandle } from '@/features/data-warga/components/FamilyManagementPanel'

const formatResidencyType = (type: string | null | undefined) => {
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
  borderRadius: 'var(--sid-radius-control)',
  border: '1px solid var(--sid-border)',
  background: 'var(--sid-surface-card)',
  color: 'var(--sid-text-primary)',
  fontFamily: 'inherit',
}

type ImportStatus = {
  loading: boolean
  success: string | null
  error: string | null
  result: CitizenImportResult | null
}

const emptyImportStatus: ImportStatus = { loading: false, success: null, error: null, result: null }

// Tahap yang sedang berjalan; selama itu halaman diblokir ImportProgressOverlay.
type ImportPhase = 'template' | 'checking' | 'importing'

const IMPORT_PHASE_TEXT: Record<ImportPhase, { title: string; description: string }> = {
  template: {
    title: 'Menyiapkan template...',
    description:
      'Template dibuat dari data dusun, RW, RT, dan Katalog Pekerjaan desa terbaru. Unduhan dimulai otomatis setelah selesai.',
  },
  checking: {
    title: 'Memeriksa file impor...',
    description:
      'Setiap baris dicek: format, wilayah RT/RW, dan NIK yang sudah terdaftar. Belum ada data yang disimpan.',
  },
  importing: {
    title: 'Mengimpor data warga...',
    description:
      'Data sedang disimpan dan dicatat di Log Aktivitas. File berisi ribuan warga bisa memakan beberapa menit.',
  },
}

// Konfirmasi "Timpa" memuat perbandingan sebanyak ini; sisanya diringkas.
const OVERWRITE_DETAIL_LIMIT = 30

function importSummaryText(result: CitizenImportResult) {
  const parts = [`${result.success_count} warga baru ditambahkan`]
  if (result.updated_count) parts.push(`${result.updated_count} ditimpa`)
  if (result.skipped_count) parts.push(`${result.skipped_count} dilewati`)
  if (result.error_count) parts.push(`${result.error_count} baris gagal`)

  return `${parts.join(', ')}.`
}

// Sama dengan ImportCitizensRequest (max:25600) dan upload_max_filesize PHP.
const IMPORT_MAX_MB = 25
const IMPORT_MAX_BYTES = IMPORT_MAX_MB * 1024 * 1024

// .xlsb (Excel Binary) tidak bisa dibaca server; pesan sama dengan backend.
const XLSB_IMPORT_MESSAGE =
  'File .xlsb belum didukung. Buka file di Excel, pilih Simpan Sebagai (Save As) "Excel Workbook (*.xlsx)", lalu unggah file .xlsx tersebut.'

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
  const switchSection = (value: string) =>
    setSearchParams(value === 'penduduk' ? {} : { tab: value }, { replace: true })
  const familyList = useFamilyList()
  // Tombol Tambah KK di header membuka form milik panel KK.
  const familyPanelRef = useRef<FamilyManagementPanelHandle>(null)
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
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    addCitizen,
    editCitizen,
    deleteWarga,
    previewWargaImport,
    importWargaFromPreview,
  } = useWargaList()

  const [keyword, setKeyword] = useState('')

  // Modal Impor Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileDragging, setFileDragging] = useState(false)
  const replaceFileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState(emptyImportStatus)
  const [importPhase, setImportPhase] = useState<ImportPhase | null>(null)
  // Hasil pemeriksaan file (ringkasan di modal impor) sebelum impor dijalankan.
  const [importPreview, setImportPreview] = useState<CitizenImportPreview | null>(null)
  // Pop-up Timpa/Lewati menggantikan modal impor selama terbuka.
  const [showConflicts, setShowConflicts] = useState(false)

  // Modal Form CRUD (Tambah / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCitizen, setEditingCitizen] = useState<Citizen | null>(null)
  const [formData, setFormData] = useState<CitizenForm>(EMPTY_CITIZEN_FORM)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // Dusun dan RW hanya penyaring pilihan RT; yang dikirim tetap rt_id.
  const [formArea, setFormArea] = useState<WilayahCascadeValue>(EMPTY_WILAYAH_CASCADE)

  // Katalog pekerjaan untuk pilihan di form warga. Yang nonaktif ikut
  // dimuat agar pekerjaan lama warga tetap tampil saat diedit.
  const [occupations, setOccupations] = useState<Occupation[]>([])

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

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSearch(keyword)
  }

  // Isian saat modal dibuka, pembanding untuk peringatan "Buang perubahan?".
  const [formBaseline, setFormBaseline] = useState<CitizenForm | null>(null)

  const openForm = (initial: CitizenForm) => {
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
    openForm(EMPTY_CITIZEN_FORM)
    setFormArea(EMPTY_WILAYAH_CASCADE)
    setFormError(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (warga: Citizen) => {
    setEditingCitizen(warga)
    openForm(citizenToForm(warga))
    setFormArea({
      hamletId: String(warga.rw?.hamlet_id ?? warga.hamlet_id ?? ''),
      rwId: warga.rw_id ? String(warga.rw_id) : '',
      rtId: warga.rt_id ? String(warga.rt_id) : '',
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
      setFormError(getApiErrorMessage(err, 'Gagal menyimpan data warga.'))
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDeleteWarga = async (id: string, name: string) => {
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

  // Template dibuat server dari data desa terbaru (beberapa detik): overlay
  // menandai prosesnya supaya tombol tidak terkesan diam.
  const handleDownloadTemplate = async () => {
    if (importPhase) return

    setImportPhase('template')
    try {
      await downloadFile('/api/citizens/import-template', 'template_impor_warga.xlsx')
    } catch (err) {
      alertDialog({
        title: 'Unduhan gagal',
        message: await downloadErrorMessage(err, 'Gagal mengunduh templat Excel.'),
      })
    } finally {
      setImportPhase(null)
    }
  }

  // Dipakai pilih file, seret-lepas, dan Ganti; isi input dikosongkan supaya
  // file yang sama bisa dipilih lagi setelah Hapus.
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    selectImportFile(e.target.files?.[0])
    e.target.value = ''
  }

  const clearImportFile = () => {
    setSelectedFile(null)
    setImportStatus(emptyImportStatus)
  }

  const handleFileCardDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setFileDragging(false)
    selectImportFile(e.dataTransfer.files?.[0])
  }

  const selectImportFile = (file: File | undefined) => {
    if (!file) return

    const name = file.name.toLowerCase()
    let error: string | null = null

    if (name.endsWith('.xlsb')) {
      error = XLSB_IMPORT_MESSAGE
    } else if (!['.xlsx', '.xls', '.csv'].some((ext) => name.endsWith(ext))) {
      error = 'Format file harus berupa Excel (.xlsx, .xls) atau CSV (.csv)'
    } else if (file.size > IMPORT_MAX_BYTES) {
      error = `Ukuran file maksimal ${IMPORT_MAX_MB} MB.`
    }

    if (error) {
      setSelectedFile(null)
      setImportStatus({ ...emptyImportStatus, error })
      return
    }

    setSelectedFile(file)
    setImportStatus(emptyImportStatus)
  }

  const closeImportModal = () => {
    setIsImportModalOpen(false)
    setSelectedFile(null)
    setImportStatus(emptyImportStatus)
    setImportPreview(null)
    setShowConflicts(false)
  }

  // Berkas sudah dipilih tetapi belum diimpor: tanya dulu sebelum menutup.
  const requestCloseImport = useConfirmDiscard(
    isImportModalOpen && Boolean(selectedFile) && !importStatus.result,
    {
      disabled: importStatus.loading,
      // Selama pop-up konflik tampil, Escape milik pop-up itu (kembali ke sini).
      escapeClose: isImportModalOpen && !showConflicts ? closeImportModal : null,
    },
  )

  // Tahap 2: impor file hasil preview; baris overwriteRows ditimpa.
  const runPreviewImport = async (token: string, overwriteRows: number[]) => {
    // Token sekali pakai: setelah ini modal kembali ke tampilan file + hasil.
    setImportPreview(null)
    setShowConflicts(false)
    setImportStatus({ ...emptyImportStatus, loading: true })
    setImportPhase('importing')

    try {
      const result = await importWargaFromPreview(token, overwriteRows)
      const failed = result.error_count

      setImportStatus({
        loading: false,
        success: importSummaryText(result),
        error: null,
        result,
      })

      // Tutup otomatis hanya kalau semua baris berhasil.
      if (!failed) {
        notifySuccess(importSummaryText(result))
        setTimeout(closeImportModal, 1200)
      }
    } catch (err) {
      setImportStatus({
        ...emptyImportStatus,
        error: getApiErrorMessage(err, 'Gagal mengimpor data. Periksa kembali format file Anda.'),
      })
    } finally {
      setImportPhase(null)
    }
  }

  // Tahap 1: periksa file tanpa menyimpan; hasilnya tampil sebagai ringkasan.
  const handleImportSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedFile) return

    setImportStatus({ ...emptyImportStatus, loading: true })
    setImportPhase('checking')

    try {
      const preview = await previewWargaImport(selectedFile)
      setImportStatus(emptyImportStatus)
      setImportPreview(preview)
    } catch (err) {
      setImportStatus({
        ...emptyImportStatus,
        error: getApiErrorMessage(err, 'Gagal memeriksa file. Periksa kembali format file Anda.'),
      })
    } finally {
      setImportPhase(null)
    }
  }

  // Dari ringkasan: konflik NIK dipilih dulu (Timpa/Lewati), tanpa konflik
  // langsung impor warga baru.
  const handlePreviewContinue = () => {
    if (!importPreview) return

    if (importPreview.conflict_count > 0) {
      setShowConflicts(true)
      return
    }

    void runPreviewImport(importPreview.token, [])
  }

  // Pilihan di ImportConflictDialog; "Timpa" dikonfirmasi sekali lagi dengan
  // perbandingan data lama dan baru.
  const handleConflictConfirm = async (overwriteRows: number[]) => {
    if (!importPreview) return

    if (overwriteRows.length > 0) {
      const selected = importPreview.conflicts.filter((conflict) =>
        overwriteRows.includes(conflict.row),
      )
      const hidden = selected.length - OVERWRITE_DETAIL_LIMIT
      const movesFamily = selected.filter((conflict) => conflict.moves_family).length

      const confirmed = await confirmDialog({
        title: `Timpa data ${selected.length} warga?`,
        message: [
          'Kolom berikut diganti dengan data dari file. Kolom yang tidak ada di file dan NIK tidak berubah.',
          movesFamily ? `${movesFamily} warga akan pindah KK.` : '',
          hidden > 0
            ? `Ditampilkan ${OVERWRITE_DETAIL_LIMIT} warga pertama; ${hidden} lainnya ikut ditimpa.`
            : '',
        ]
          .filter(Boolean)
          .join(' '),
        details: selected
          .slice(0, OVERWRITE_DETAIL_LIMIT)
          .map((conflict: CitizenImportConflict) => ({
            title: `Baris ${conflict.row} · ${conflict.name}`,
            rows: conflict.changes.map((change) => ({
              label: change.label,
              from: change.before,
              to: change.after,
            })),
          })),
        confirmLabel: 'Ya, timpa & impor',
        tone: 'danger',
      })

      if (!confirmed) return
    }

    await runPreviewImport(importPreview.token, overwriteRows)
  }

  return (
    <div className="sid-operator-page sid-admin-data-page">
      <div className="sid-operator-content">
        <div className="sid-operator-header">
          <div>
            <h1>Data Penduduk &amp; Kartu Keluarga</h1>
            <p>Kelola data penduduk dan Kartu Keluarga desa.</p>
          </div>
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
                      <th className="center">Dusun</th>
                      <th className="center">RT/RW</th>
                      <th className="center">Jenis Kelamin</th>
                      <th className="center">Agama</th>
                      <th className="center">Status Domisili</th>
                      <th className="center">No. KK</th>
                      <th className="center">Peran KK</th>
                      <th className="center">Pekerjaan</th>
                      <th className="center">Sinkronisasi</th>
                      <th className="center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="empty">
                          Memuat data...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={12} className="empty sid-admin-error">
                          {error}
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="empty">
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
                            {/* Dusun dari RW warga; sama dengan filter Dusun di atas. */}
                            {warga.rw?.hamlet?.name ?? warga.hamlet?.name ?? '-'}
                          </td>
                          <td className="center sid-nowrap">
                            {/* Judul kolom sudah "RT/RW": cukup nomornya, satu baris. */}
                            {warga.rt?.number ?? '-'}/{warga.rw?.number ?? '-'}
                          </td>
                          <td className="center">
                            {warga.gender === 'L'
                              ? 'Laki-Laki'
                              : warga.gender === 'P'
                                ? 'Perempuan'
                                : '-'}
                          </td>
                          <td className="center">{labelOf(RELIGION_LABELS, warga.religion)}</td>
                          <td className="center">{formatResidencyType(warga.residency_type)}</td>
                          <td className="center">
                            <FamilyNumberValue family={warga.family} />
                          </td>
                          <td className="center">
                            {labelOf(FAMILY_ROLE_LABELS, warga.family_role)}
                          </td>
                          <td className="center">{warga.occupation ?? '-'}</td>
                          <td className="center">
                            {/* "-" hanya bila status sinkronisasi dan sumber data kosong. */}
                            {warga.sync_status
                              ? labelOf(SYNC_STATUS_LABELS, warga.sync_status)
                              : !warga.data_source && '-'}
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

              <div className="grid gap-3 sm:grid-cols-3">
                <WilayahCascadeFields
                  depth="rt"
                  idPrefix="warga-wilayah"
                  required
                  value={formArea}
                  onChange={(area) => {
                    setFormArea(area)
                    setFormData({ ...formData, rt_id: area.rtId })
                  }}
                  selectStyle={inputStyle}
                  renderField={({ id, label, control }) => (
                    <div key={id}>
                      <label htmlFor={id} style={labelStyle}>
                        {label}
                      </label>
                      {control}
                    </div>
                  )}
                />
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
      {/* Diganti pop-up konflik selama pilihan Timpa/Lewati belum diambil;
          Batal di pop-up itu kembali ke ringkasan pemeriksaan. */}
      {isImportModalOpen && !showConflicts && (
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

            {importPreview && selectedFile ? (
              <ImportPreviewSummary
                preview={importPreview}
                fileName={selectedFile.name}
                onBack={() => setImportPreview(null)}
                onContinue={handlePreviewContinue}
              />
            ) : (
              <>
                <div className="sid-admin-import-template">
                  <div>
                    <strong>Belum punya formatnya?</strong>
                    <p>
                      Unduh templat Excel standar di sini. File data pemilih desa juga bisa langsung
                      diunggah; kolom yang tidak dikenali diabaikan.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="sid-admin-template-link"
                    onClick={handleDownloadTemplate}
                    disabled={importPhase !== null}
                  >
                    <Download size={14} /> Templat
                  </button>
                </div>

                <form onSubmit={handleImportSubmit} className="sid-admin-import-form">
                  {!selectedFile ? (
                    <label className="sid-admin-file-dropzone">
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        className="sid-admin-file-input"
                      />
                      <Upload size={36} className="sid-admin-file-icon" />
                      <p className="sid-admin-file-title">
                        Klik atau seret file Excel / CSV ke sini
                      </p>
                      <p className="sid-admin-file-hint">
                        Format yang didukung: .xlsx, .xls, .csv (maks. {IMPORT_MAX_MB} MB)
                      </p>
                    </label>
                  ) : (
                    // File lain juga bisa diseret ke kartu ini untuk mengganti.
                    <div
                      className={`sid-admin-file-card${fileDragging ? ' is-dragging' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setFileDragging(true)
                      }}
                      onDragLeave={() => setFileDragging(false)}
                      onDrop={handleFileCardDrop}
                    >
                      <div className="sid-admin-file-selected">
                        <FileText size={28} className="sid-admin-file-icon" />
                        <div>
                          <p className="sid-admin-file-title">{selectedFile.name}</p>
                          <p className="sid-admin-file-hint">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="sid-admin-file-actions">
                        <button
                          type="button"
                          className="sid-button sid-button-outline"
                          onClick={() => replaceFileInputRef.current?.click()}
                          disabled={importStatus.loading}
                        >
                          <RefreshCw size={14} /> Ganti
                        </button>
                        <button
                          type="button"
                          className="sid-button sid-button-outline sid-admin-file-remove"
                          onClick={clearImportFile}
                          disabled={importStatus.loading}
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      </div>
                      <input
                        ref={replaceFileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        hidden
                        aria-label="Ganti file impor"
                      />
                    </div>
                  )}

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

                  {importStatus.result && importStatus.result.errors.length > 0 && (
                    <ul className="sid-admin-import-errors">
                      {importStatus.result.errors.map((item, i) => (
                        <li key={i}>
                          Baris {item.row}: {item.message}
                        </li>
                      ))}
                    </ul>
                  )}

                  {importStatus.result && (importStatus.result.warnings?.length ?? 0) > 0 && (
                    <details className="sid-import-summary-messages">
                      <summary>
                        Peringatan: kolom dikosongkan ({importStatus.result.warnings?.length})
                      </summary>
                      <ul>
                        {importStatus.result.warnings?.map((item, i) => (
                          <li key={i}>
                            <strong>Baris {item.row}:</strong> {item.message}
                          </li>
                        ))}
                      </ul>
                    </details>
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
                      {importStatus.loading ? 'Memproses...' : 'Periksa File'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {importPreview && showConflicts && (
        <ImportConflictDialog
          conflicts={importPreview.conflicts}
          newCount={importPreview.new_count}
          errorCount={importPreview.error_count}
          onCancel={() => setShowConflicts(false)}
          onClose={() => {
            closeImportModal()
            notifySuccess('Tidak ada data baru atau perubahan untuk diimpor.')
          }}
          onConfirm={handleConflictConfirm}
        />
      )}

      {importPhase && <ImportProgressOverlay {...IMPORT_PHASE_TEXT[importPhase]} />}

      <SiteFooter />
    </div>
  )
}
