/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftRight,
  Camera,
  ImageOff,
  ListChecks,
  Trash2,
  UserRoundMinus,
  UserRoundPlus,
  Users,
} from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { getHamlets, getRts, getRws } from '@/features/kelola-wilayah/api'
import OfficialPositionTypeManager from '@/features/profil-desa-admin/components/OfficialPositionTypeManager'
import { TermEndBadge } from '@/features/profil-desa-admin/components/TermEndBadge'
import {
  demotePerangkatDesa,
  deleteOfficialPhoto,
  deletePerangkatDesa,
  findOfficialCandidate,
  getOfficialPositionTypes,
  getPerangkatDesa,
  promotePerangkatDesa,
  rotatePerangkatDesa,
  uploadOfficialPhoto,
} from '@/features/profil-desa-admin/api'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { StatusPill } from '@/components/ui/StatusPill'
import { confirmDialog } from '@/shared/lib/dialog'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { notifySuccess } from '@/shared/lib/toast'

// Tabel pejabat dipisah per tingkat. Jabatan yang bukan Kadus/RW/RT
// (Kades, Sekdes, Kasi, Kaur, staf, Petugas Desa) masuk tabel pertama,
// diurutkan sesuai DESA_ORDER lalu abjad.
const DESA_ORDER = ['kepala_desa', 'sekretaris_desa', 'kasi_pelayanan', 'kaur_tu_umum']

const areaNumber = (value) => Number(value) || 0

const OFFICIAL_GROUPS = [
  {
    key: 'desa',
    title: 'Perangkat Desa',
    hint: 'Kepala Desa, Sekretaris Desa, Kasi, Kaur, dan staf',
    match: (official) => !['kadus', 'rw', 'rt'].includes(official.position),
    compare: (first, second) => {
      const rank = (official) => {
        const index = DESA_ORDER.indexOf(official.position)
        return index === -1 ? DESA_ORDER.length : index
      }

      return (
        rank(first) - rank(second) ||
        String(positionLabel(first)).localeCompare(String(positionLabel(second)))
      )
    },
  },
  {
    key: 'kadus',
    title: 'Kepala Dusun',
    areaLabel: 'Dusun',
    match: (official) => official.position === 'kadus',
    compare: (first, second) =>
      String(first.hamlet?.name ?? '').localeCompare(String(second.hamlet?.name ?? '')),
  },
  {
    key: 'rw',
    title: 'Ketua RW',
    areaLabel: 'RW',
    match: (official) => official.position === 'rw',
    compare: (first, second) => areaNumber(first.rw?.number) - areaNumber(second.rw?.number),
  },
  {
    key: 'rt',
    title: 'Ketua RT',
    areaLabel: 'RT / RW',
    match: (official) => official.position === 'rt',
    compare: (first, second, rwNumbers) => {
      const rwOf = (official) =>
        areaNumber(official.rw?.number ?? rwNumbers.get(String(official.rt?.rw_id)))

      return (
        rwOf(first) - rwOf(second) || areaNumber(first.rt?.number) - areaNumber(second.rt?.number)
      )
    },
  },
]

// Jabatan yang punya akun login dan peran di aplikasi (OfficialPosition di
// backend), beserta labelnya, dari GET /official-position-types
// (`account_positions`). Label tidak ditulis di FE supaya sama dengan tabel
// pejabat; label staf aplikasi mengikuti SID_APP_NAME di backend.
const toAccountPositions = (response) =>
  (response?.data?.account_positions ?? []).map((position) => ({
    value: position.code,
    label: position.label,
    scope: position.scope ?? undefined,
  }))

const findAccountPosition = (accountPositions, value) =>
  accountPositions.find((position) => position.value === value)

const positionLabel = (official) => official.position_label ?? official.position

// Calon dikirim sebagai akun untuk jabatan berakun, sebagai data warga
// untuk jabatan tanpa akun.
const candidateTarget = (accountPositions, position, candidate) =>
  findAccountPosition(accountPositions, position)
    ? { user_id: candidate.user_id }
    : { citizen_id: candidate.citizen_id }

const PHOTO_TYPES = 'image/png,image/jpeg,image/webp'

// Dashboard warga, tujuan staf aplikasi setelah menyerahkan jabatannya.
const WARGA_HOME = '/daftar-surat'

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_PROMOTION = {
  candidate: null,
  photo: null,
  position: '',
  rt_id: '',
  rw_id: '',
  hamlet_id: '',
  started_at: today(),
  term_ends_at: '',
  phone_wa: '',
  notes: '',
}

function unwrap(response) {
  return response?.data?.data ?? []
}

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('id-ID') : '-'
}

function describeArea(official, rwNumbers) {
  if (official.position === 'rt') {
    const rwNumber = official.rw?.number ?? rwNumbers?.get(String(official.rt?.rw_id))

    return `RT ${official.rt?.number ?? '-'} / RW ${rwNumber ?? '-'}`
  }

  if (official.position === 'rw') return `RW ${official.rw?.number ?? '-'}`
  if (official.position === 'kadus') return `Dusun ${official.hamlet?.name ?? '-'}`

  return 'Desa'
}

function OfficialPhoto({ src, name }) {
  return (
    <div className="sid-profil-desa-avatar sid-profil-desa-avatar-tiny">
      {src ? (
        <img src={src} alt={`Foto ${name ?? 'pejabat'}`} className="h-full w-full object-cover" />
      ) : (
        <Users size={18} className="sid-profil-desa-avatar-placeholder" />
      )}
    </div>
  )
}

/**
 * Foto pejabat wajib diunggah saat penetapan dan rotasi; pratinjaunya
 * tampil begitu berkas dipilih.
 */
function PhotoField({ file, onChange, disabled }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  return (
    <div className="sid-form-group">
      <label className="sid-form-label" htmlFor="official-photo">
        Foto pejabat *
      </label>
      <div className="flex items-center gap-3">
        <OfficialPhoto src={preview} name="pejabat baru" />
        <input
          id="official-photo"
          required
          type="file"
          accept={PHOTO_TYPES}
          disabled={disabled}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </div>
      <small className="sid-admin-cell-meta">PNG, JPG, atau WEBP. Maksimal 5 MB.</small>
    </div>
  )
}

/**
 * Memilih calon pejabat lewat NIK. Backend mencari warga ber-NIK itu di
 * desa ini beserta akunnya, dan memberi tahu bila ia tidak dapat ditetapkan
 * pada jabatan yang dipilih.
 */
function CandidatePicker({ candidate, position, onChange, disabled }) {
  const [nik, setNik] = useState('')
  const [searching, setSearching] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const handleLookup = async () => {
    setSearching(true)
    setLookupError('')
    onChange(null)

    try {
      const response = await findOfficialCandidate(nik, position)

      onChange(response?.data?.data ?? null)
    } catch (requestError) {
      setLookupError(serverMessage(requestError, 'Gagal mencari NIK.'))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="sid-form-group">
      <label className="sid-form-label" htmlFor="candidate-nik">
        NIK warga *
      </label>
      <div className="flex gap-2">
        <input
          id="candidate-nik"
          type="text"
          inputMode="numeric"
          maxLength={16}
          placeholder="16 digit NIK"
          value={nik}
          disabled={disabled}
          onChange={(event) => {
            setNik(event.target.value.replace(/\D/g, ''))
            onChange(null)
          }}
        />
        <button
          type="button"
          className="sid-button sid-button-outline"
          disabled={disabled || searching || !position || nik.length !== 16}
          onClick={handleLookup}
        >
          {searching ? 'Mencari...' : 'Cari'}
        </button>
      </div>

      {lookupError && (
        <p className="sid-admin-alert sid-admin-alert-error" role="alert">
          {lookupError}
        </p>
      )}
      {candidate && (
        <p
          className={candidate.eligible ? 'sid-info' : 'sid-admin-alert sid-admin-alert-error'}
          role="status"
        >
          {candidate.name}
          {candidate.username ? ` (@${candidate.username})` : ''}
          {candidate.eligible ? ' dapat ditetapkan.' : ` — ${candidate.reason}`}
        </p>
      )}
    </div>
  )
}

/**
 * Penetapan, rotasi, dan pengakhiran jabatan pejabat desa. Untuk jabatan
 * yang punya akun, menetapkan jabatan mengubah peran akun warga menjadi
 * peran jabatan itu dan mengakhirinya mengembalikan peran warga; jabatan
 * tanpa akun hanya dicatat pada data warga. Rotasi melakukan keduanya
 * sekaligus untuk jabatan dan wilayah yang sama.
 */
export default function PejabatDesaPage() {
  const { user } = useAuth()
  const [officials, setOfficials] = useState([])
  const [positionTypes, setPositionTypes] = useState([])
  const [accountPositions, setAccountPositions] = useState([])
  const [managingTypes, setManagingTypes] = useState(false)
  const [areas, setAreas] = useState({ rts: [], rws: [], hamlets: [] })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState([])
  const [statusFilter, setStatusFilter] = useState('aktif')
  const [promotion, setPromotion] = useState(null)
  const [rotation, setRotation] = useState(null)
  const [demotion, setDemotion] = useState(null)
  // Satu input berkas tersembunyi dipakai bersama oleh tombol "Ganti foto"
  // tiap baris; pejabat yang dituju disimpan di ref.
  const photoInput = useRef(null)
  const photoTarget = useRef(null)

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [officialResponse, typeResponse, rtResponse, rwResponse, hamletResponse] =
        await Promise.all([
          getPerangkatDesa(),
          getOfficialPositionTypes(),
          getRts(),
          getRws(),
          getHamlets(),
        ])

      setOfficials(unwrap(officialResponse))
      setPositionTypes(unwrap(typeResponse))
      setAccountPositions(toAccountPositions(typeResponse))
      setAreas({
        rts: unwrap(rtResponse),
        rws: unwrap(rwResponse),
        hamlets: unwrap(hamletResponse),
      })
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal memuat data pejabat.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const rwNumbers = useMemo(
    () => new Map(areas.rws.map((rw) => [String(rw.id), rw.number])),
    [areas.rws],
  )

  // Jabatan dan wilayah yang sedang dijabat. Backend menolak pejabat kedua
  // (409), jadi pilihannya dibuat buram; penggantinya lewat rotasi.
  const occupied = useMemo(() => {
    const keys = new Set()
    officials
      .filter((official) => official.is_active)
      .forEach((official) => {
        const areaId = official.rt_id ?? official.rw_id ?? official.hamlet_id
        keys.add(areaId ? `${official.position}:${areaId}` : official.position)
      })
    return keys
  }, [officials])

  // Pilihan jabatan: jabatan berakun, lalu jenis jabatan aktif tanpa akun.
  // Jabatan berwilayah (RT/RW/Kadus) dicek per wilayah di pilihan wilayahnya.
  const positionOptions = useMemo(() => {
    const withStatus = (option, single) => {
      const taken = single && occupied.has(option.value)
      return {
        ...option,
        disabled: taken,
        label: taken ? `${option.label} (sudah dijabat)` : option.label,
      }
    }

    return [
      ...accountPositions.map((position) => withStatus(position, !position.scope)),
      ...positionTypes
        .filter((type) => type.is_active)
        .map((type) =>
          withStatus(
            { value: type.code, label: `${type.label} (tanpa akun)` },
            type.is_single_occupant,
          ),
        ),
    ]
  }, [accountPositions, positionTypes, occupied])

  const areaOption = (areaId, label) => {
    const taken = occupied.has(`${promotion?.position}:${areaId}`)
    return (
      <option key={areaId} value={areaId} disabled={taken}>
        {taken ? `${label} (sudah ada)` : label}
      </option>
    )
  }

  const officialGroups = useMemo(() => {
    const filtered = officials.filter((official) =>
      statusFilter === 'semua' ? true : official.is_active === (statusFilter === 'aktif'),
    )

    return OFFICIAL_GROUPS.map((group) => ({
      ...group,
      officials: filtered
        .filter(group.match)
        .sort(
          (first, second) =>
            Number(second.is_active) - Number(first.is_active) ||
            group.compare(first, second, rwNumbers),
        ),
    }))
  }, [officials, statusFilter, rwNumbers])

  // afterSuccess: langkah setelah berhasil; bawaannya memuat ulang daftar.
  const run = async (request, successMessage, afterSuccess = loadData) => {
    setProcessing(true)
    setError('')
    setWarnings([])

    try {
      const response = await request()

      notifySuccess(response?.data?.message ?? successMessage)
      setWarnings(response?.data?.warnings ?? [])
      setPromotion(null)
      setRotation(null)
      setDemotion(null)
      await afterSuccess()
    } catch (requestError) {
      setError(serverMessage(requestError, 'Aksi pejabat gagal diproses.'))
    } finally {
      setProcessing(false)
    }
  }

  const handlePromote = (event) => {
    event.preventDefault()

    const scope = findAccountPosition(accountPositions, promotion.position)?.scope

    return run(
      () =>
        promotePerangkatDesa({
          ...candidateTarget(accountPositions, promotion.position, promotion.candidate),
          position: promotion.position,
          ...(scope ? { [scope]: Number(promotion[scope]) } : {}),
          started_at: promotion.started_at,
          term_ends_at: promotion.term_ends_at,
          phone_wa: promotion.phone_wa,
          notes: promotion.notes,
          photo: promotion.photo,
        }),
      'Pejabat berhasil ditetapkan.',
    )
  }

  const handleRotate = (event) => {
    event.preventDefault()

    // Staf aplikasi yang menyerahkan jabatannya sendiri langsung menjadi
    // warga: buka dashboard warga dengan memuat ulang halaman, supaya data
    // akun (peran warga) dibaca ulang dari server tanpa menunggu logout.
    // Memuat ulang lewat AuthContext di sini akan memicu ProtectedRoute
    // halaman staf lebih dulu, jadi tidak dipakai.
    const handsOverOwnPosition = rotation.official.user_id === user?.id
    const afterSuccess = handsOverOwnPosition ? () => window.location.assign(WARGA_HOME) : loadData

    return run(
      () =>
        rotatePerangkatDesa(rotation.official.id, {
          ...candidateTarget(accountPositions, rotation.official.position, rotation.candidate),
          started_at: rotation.started_at,
          term_ends_at: rotation.term_ends_at,
          notes: rotation.notes,
          photo: rotation.photo,
        }),
      'Rotasi pejabat berhasil diproses.',
      afterSuccess,
    )
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]
    const official = photoTarget.current

    event.target.value = ''
    if (!file || !official) return undefined

    return run(() => uploadOfficialPhoto(official.id, file), 'Foto pejabat berhasil diperbarui.')
  }

  const handleDeletePhoto = async (official) => {
    if (
      !(await confirmDialog({
        title: `Hapus foto ${official.citizen?.name ?? 'pejabat'}?`,
        message: 'Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Hapus',
      }))
    )
      return undefined

    return run(() => deleteOfficialPhoto(official.id), 'Foto pejabat berhasil dihapus.')
  }

  const pickPhotoFor = (official) => {
    photoTarget.current = official
    photoInput.current?.click()
  }

  const handleDemote = (event) => {
    event.preventDefault()

    return run(
      () =>
        demotePerangkatDesa(demotion.official.id, demotion.notes ? { notes: demotion.notes } : {}),
      'Jabatan berhasil diakhiri.',
    )
  }

  const handleDelete = async (official) => {
    if (
      !(await confirmDialog({
        title: `Hapus riwayat jabatan ${official.citizen?.name ?? ''}?`,
        message: 'Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Hapus',
      }))
    )
      return undefined

    return run(() => deletePerangkatDesa(official.id), 'Riwayat jabatan berhasil dihapus.')
  }

  const promotionScope = findAccountPosition(accountPositions, promotion?.position)?.scope

  // Selama modal terbuka, error aksi tampil di dalam modal; di halaman ia
  // tertutup overlay. Pesan lama dibersihkan saat modal dibuka.
  const modalOpen = Boolean(promotion || rotation || demotion)
  // Peringatan "Buang perubahan?" untuk modal Tetapkan, Rotasi, dan Akhiri
  // Jabatan: isian dianggap berubah bila ada kolom yang sudah diisi.
  const closePromotion = () => setPromotion(null)
  const closeRotation = () => setRotation(null)
  const closeDemotion = () => setDemotion(null)
  const promotionDirty = Boolean(
    promotion &&
    (promotion.candidate ||
      promotion.photo ||
      promotion.position ||
      promotion.term_ends_at ||
      promotion.phone_wa ||
      promotion.notes),
  )
  const rotationDirty = Boolean(
    rotation && (rotation.candidate || rotation.photo || rotation.term_ends_at || rotation.notes),
  )
  const demotionDirty = Boolean(demotion?.notes)
  const openCloser = promotion
    ? closePromotion
    : rotation
      ? closeRotation
      : demotion
        ? closeDemotion
        : null
  const requestClose = useConfirmDiscard(promotionDirty || rotationDirty || demotionDirty, {
    disabled: processing,
    escapeClose: openCloser,
  })

  const openModal = (open) => {
    setError('')
    open()
  }
  const errorAlert = error && (
    <p className="sid-admin-alert sid-admin-alert-error" role="alert">
      {error}
    </p>
  )

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <p className="sid-operator-breadcrumb">
          Admin / <span>Pejabat Desa</span>
        </p>

        <div className="sid-operator-header">
          <h1>Pejabat Desa</h1>
          <div className="sid-admin-page-actions">
            <button
              type="button"
              className="sid-button sid-button-outline"
              disabled={processing}
              onClick={() => setManagingTypes(true)}
            >
              <ListChecks size={16} />
              Kelola Jenis Jabatan
            </button>
            <button
              type="button"
              className="sid-operator-primary"
              disabled={processing}
              onClick={() =>
                openModal(() => setPromotion({ ...EMPTY_PROMOTION, started_at: today() }))
              }
            >
              <UserRoundPlus size={16} />
              Tetapkan Pejabat
            </button>
          </div>
        </div>

        <p className="sid-admin-alert" role="note">
          Menetapkan jabatan yang punya akun mengubah peran akun warga menjadi peran jabatan
          tersebut, dan mengakhirinya mengembalikan akun itu menjadi warga. Jabatan tanpa akun hanya
          dicatat pada data warga. Rotasi mengganti pejabat pada jabatan dan wilayah yang sama dalam
          satu langkah. Calon pejabat dipilih lewat NIK-nya dan fotonya wajib diunggah.
        </p>

        <input
          ref={photoInput}
          type="file"
          accept={PHOTO_TYPES}
          hidden
          aria-label="Unggah foto pejabat"
          onChange={handlePhotoChange}
        />

        {!modalOpen && errorAlert}
        {warnings.map((warning) => (
          <p key={warning.code ?? warning.message} className="sid-warning-box" role="alert">
            {warning.message}
          </p>
        ))}

        <div className="sid-operator-filter-card">
          <div className="sid-operator-filter-field">
            <p>Status</p>
            <select
              aria-label="Saring status jabatan"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="aktif">Sedang menjabat</option>
              <option value="riwayat">Riwayat (sudah berakhir)</option>
              <option value="semua">Semua</option>
            </select>
          </div>
        </div>

        {officialGroups.map((group) => (
          <section
            key={group.key}
            className="sid-pejabat-group"
            aria-labelledby={`pejabat-${group.key}`}
          >
            <h2 id={`pejabat-${group.key}`} className="sid-org-section-title">
              {group.title} <span>({loading ? '…' : group.officials.length})</span>
            </h2>
            {group.hint && <p className="sid-org-subtitle sid-pejabat-group-hint">{group.hint}</p>}

            <div className="sid-operator-table-card">
              <div className="sid-operator-table-wrapper">
                <table className="sid-operator-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>{group.areaLabel ?? 'Jabatan'}</th>
                      <th className="center">Mulai</th>
                      <th className="center">Akhir Masa Jabatan</th>
                      <th className="center">Status</th>
                      <th className="center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="empty">
                          Memuat data pejabat...
                        </td>
                      </tr>
                    ) : group.officials.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty">
                          Tidak ada data {group.title}.
                        </td>
                      </tr>
                    ) : (
                      group.officials.map((official) => (
                        <tr key={official.id}>
                          <td className="primary-text">
                            <div className="flex items-center gap-3">
                              <OfficialPhoto
                                src={official.photo_img}
                                name={official.citizen?.name}
                              />
                              <div>
                                {official.citizen?.name ?? '-'}
                                {!official.user_id && (
                                  <small className="sid-admin-cell-meta">Tanpa akun login</small>
                                )}
                                {official.is_active && !official.photo_img && (
                                  <small className="sid-admin-cell-meta">Belum ada foto</small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {group.areaLabel
                              ? describeArea(official, rwNumbers)
                              : positionLabel(official)}
                          </td>
                          <td className="center">{formatDate(official.started_at)}</td>
                          <td className="center">
                            {official.is_active ? (
                              <div className="flex flex-col items-center gap-1">
                                {formatDate(official.term_ends_at)}
                                <TermEndBadge termEndsAt={official.term_ends_at} />
                              </div>
                            ) : (
                              `Berakhir ${formatDate(official.ended_at)}`
                            )}
                          </td>
                          <td className="center">
                            <StatusPill active={official.is_active}>
                              {official.is_active ? 'Menjabat' : 'Berakhir'}
                            </StatusPill>
                          </td>
                          <td className="center">
                            <div className="sid-operator-actions">
                              {official.is_active && (
                                <>
                                  <button
                                    type="button"
                                    className="sid-operator-action detail"
                                    title={official.photo_img ? 'Ganti foto' : 'Unggah foto'}
                                    aria-label={`Ganti foto ${official.citizen?.name ?? 'pejabat'}`}
                                    disabled={processing}
                                    onClick={() => pickPhotoFor(official)}
                                  >
                                    <Camera size={16} />
                                  </button>
                                  {official.photo_img && (
                                    <button
                                      type="button"
                                      className="sid-operator-action delete"
                                      title="Hapus foto"
                                      aria-label={`Hapus foto ${official.citizen?.name ?? 'pejabat'}`}
                                      disabled={processing}
                                      onClick={() => handleDeletePhoto(official)}
                                    >
                                      <ImageOff size={16} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="sid-operator-action edit"
                                    title="Rotasi: ganti dengan pejabat baru"
                                    aria-label={`Rotasi ${official.citizen?.name ?? 'pejabat'}`}
                                    disabled={processing}
                                    onClick={() =>
                                      openModal(() =>
                                        setRotation({
                                          official,
                                          candidate: null,
                                          photo: null,
                                          started_at: today(),
                                          term_ends_at: '',
                                          notes: '',
                                        }),
                                      )
                                    }
                                  >
                                    <ArrowLeftRight size={16} />
                                  </button>
                                  {/* Staf aplikasi hanya satu dan tidak boleh kosong:
                                      penggantinya lewat rotasi. */}
                                  {official.position !== 'staf_sid' && (
                                    <button
                                      type="button"
                                      className="sid-operator-action toggle"
                                      title="Akhiri jabatan"
                                      aria-label={`Akhiri jabatan ${official.citizen?.name ?? 'pejabat'}`}
                                      disabled={processing}
                                      onClick={() =>
                                        openModal(() => setDemotion({ official, notes: '' }))
                                      }
                                    >
                                      <UserRoundMinus size={16} />
                                    </button>
                                  )}
                                </>
                              )}
                              {!official.is_active && (
                                <button
                                  type="button"
                                  className="sid-operator-action delete"
                                  title="Hapus riwayat jabatan"
                                  aria-label={`Hapus riwayat ${official.citizen?.name ?? 'pejabat'}`}
                                  disabled={processing}
                                  onClick={() => handleDelete(official)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}
      </div>

      {promotion && (
        <div className="sid-modal-overlay">
          <form className="sid-modal" onSubmit={handlePromote}>
            <h2>Tetapkan Pejabat</h2>
            {errorAlert}

            <label className="sid-form-group">
              <span className="sid-form-label">Jabatan *</span>
              <select
                required
                value={promotion.position}
                onChange={(event) =>
                  // Kelayakan calon bergantung pada jabatan, jadi calon
                  // dicari ulang setiap jabatan berganti.
                  setPromotion({
                    ...promotion,
                    candidate: null,
                    position: event.target.value,
                    rt_id: '',
                    rw_id: '',
                    hamlet_id: '',
                  })
                }
              >
                <option value="">Pilih jabatan</option>
                {positionOptions.map((position) => (
                  <option key={position.value} value={position.value} disabled={position.disabled}>
                    {position.label}
                  </option>
                ))}
              </select>
              <span className="sid-form-help">
                Jabatan yang sudah dijabat diganti lewat tombol Rotasi.
              </span>
            </label>

            <CandidatePicker
              candidate={promotion.candidate}
              position={promotion.position}
              disabled={processing}
              onChange={(candidate) => setPromotion((current) => ({ ...current, candidate }))}
            />

            <PhotoField
              file={promotion.photo}
              disabled={processing}
              onChange={(photo) => setPromotion((current) => ({ ...current, photo }))}
            />

            {promotionScope === 'rt_id' && (
              <label className="sid-form-group">
                <span className="sid-form-label">Wilayah RT *</span>
                <select
                  required
                  value={promotion.rt_id}
                  onChange={(event) => setPromotion({ ...promotion, rt_id: event.target.value })}
                >
                  <option value="">Pilih RT</option>
                  {areas.rts.map((rt) =>
                    areaOption(
                      rt.id,
                      `RT ${rt.number} / RW ${rwNumbers.get(String(rt.rw_id)) ?? '-'}`,
                    ),
                  )}
                </select>
              </label>
            )}

            {promotionScope === 'rw_id' && (
              <label className="sid-form-group">
                <span className="sid-form-label">Wilayah RW *</span>
                <select
                  required
                  value={promotion.rw_id}
                  onChange={(event) => setPromotion({ ...promotion, rw_id: event.target.value })}
                >
                  <option value="">Pilih RW</option>
                  {areas.rws.map((rw) => areaOption(rw.id, `RW ${rw.number}`))}
                </select>
              </label>
            )}

            {promotionScope === 'hamlet_id' && (
              <label className="sid-form-group">
                <span className="sid-form-label">Dusun *</span>
                <select
                  required
                  value={promotion.hamlet_id}
                  onChange={(event) =>
                    setPromotion({ ...promotion, hamlet_id: event.target.value })
                  }
                >
                  <option value="">Pilih dusun</option>
                  {areas.hamlets.map((hamlet) => areaOption(hamlet.id, hamlet.name))}
                </select>
              </label>
            )}

            <label className="sid-form-group">
              <span className="sid-form-label">Mulai menjabat *</span>
              <input
                required
                type="date"
                value={promotion.started_at}
                onChange={(event) => setPromotion({ ...promotion, started_at: event.target.value })}
              />
            </label>

            <label className="sid-form-group">
              <span className="sid-form-label">Akhir masa jabatan</span>
              <input
                type="date"
                min={promotion.started_at}
                value={promotion.term_ends_at}
                onChange={(event) =>
                  setPromotion({ ...promotion, term_ends_at: event.target.value })
                }
              />
            </label>

            <label className="sid-form-group">
              <span className="sid-form-label">Nomor WhatsApp</span>
              <input
                type="text"
                maxLength={20}
                value={promotion.phone_wa}
                onChange={(event) => setPromotion({ ...promotion, phone_wa: event.target.value })}
              />
            </label>

            <label className="sid-form-group">
              <span className="sid-form-label">Catatan</span>
              <textarea
                rows={2}
                value={promotion.notes}
                onChange={(event) => setPromotion({ ...promotion, notes: event.target.value })}
              />
            </label>

            <div className="sid-modal-actions">
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={() => requestClose(closePromotion)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="sid-button sid-button-primary"
                disabled={processing || !promotion.candidate?.eligible || !promotion.photo}
              >
                {processing ? 'Memproses...' : 'Tetapkan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {rotation && (
        <div className="sid-modal-overlay">
          <form className="sid-modal" onSubmit={handleRotate}>
            <h2>Rotasi {positionLabel(rotation.official)}</h2>
            {errorAlert}
            <p>
              {rotation.official.citizen?.name ?? 'Pejabat saat ini'} (
              {describeArea(rotation.official, rwNumbers)}) diakhiri jabatannya dan digantikan warga
              ber-NIK berikut, pada jabatan dan wilayah yang sama.
            </p>
            {rotation.official.user_id === user?.id && (
              <p className="sid-warning-box" role="note">
                Anda menyerahkan jabatan Anda sendiri. Setelah rotasi, akun Anda kembali menjadi
                warga dan Anda langsung dialihkan ke dashboard warga.
              </p>
            )}

            <CandidatePicker
              candidate={rotation.candidate}
              position={rotation.official.position}
              disabled={processing}
              onChange={(candidate) => setRotation((current) => ({ ...current, candidate }))}
            />

            <PhotoField
              file={rotation.photo}
              disabled={processing}
              onChange={(photo) => setRotation((current) => ({ ...current, photo }))}
            />

            <label className="sid-form-group">
              <span className="sid-form-label">Mulai menjabat *</span>
              <input
                required
                type="date"
                value={rotation.started_at}
                onChange={(event) => setRotation({ ...rotation, started_at: event.target.value })}
              />
            </label>

            <label className="sid-form-group">
              <span className="sid-form-label">Akhir masa jabatan</span>
              <input
                type="date"
                min={rotation.started_at}
                value={rotation.term_ends_at}
                onChange={(event) => setRotation({ ...rotation, term_ends_at: event.target.value })}
              />
            </label>

            <label className="sid-form-group">
              <span className="sid-form-label">Catatan</span>
              <textarea
                rows={2}
                value={rotation.notes}
                onChange={(event) => setRotation({ ...rotation, notes: event.target.value })}
              />
            </label>

            <div className="sid-modal-actions">
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={() => requestClose(closeRotation)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="sid-button sid-button-primary"
                disabled={processing || !rotation.candidate?.eligible || !rotation.photo}
              >
                {processing ? 'Memproses...' : 'Rotasi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {demotion && (
        <div className="sid-modal-overlay">
          <form className="sid-modal" onSubmit={handleDemote}>
            <h2>Akhiri Jabatan</h2>
            {errorAlert}
            <p>
              {demotion.official.citizen?.name ?? 'Pejabat'} berhenti sebagai{' '}
              {positionLabel(demotion.official)} ({describeArea(demotion.official, rwNumbers)})
              {demotion.official.user_id ? ' dan akunnya kembali menjadi warga' : ''}. Jabatan ini
              kosong sampai pejabat baru ditetapkan.
            </p>

            <label className="sid-form-group">
              <span className="sid-form-label">Catatan</span>
              <textarea
                rows={2}
                value={demotion.notes}
                onChange={(event) => setDemotion({ ...demotion, notes: event.target.value })}
              />
            </label>

            <div className="sid-modal-actions">
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={() => requestClose(closeDemotion)}
              >
                Batal
              </button>
              <button type="submit" className="sid-button sid-button-primary" disabled={processing}>
                {processing ? 'Memproses...' : 'Akhiri Jabatan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {managingTypes && (
        <OfficialPositionTypeManager
          types={positionTypes}
          onChanged={loadData}
          onClose={() => setManagingTypes(false)}
        />
      )}

      <SiteFooter />
    </div>
  )
}
