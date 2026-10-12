/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftRight,
  Camera,
  ListChecks,
  Trash2,
  UserRoundMinus,
  UserRoundPlus,
  Users,
} from 'lucide-react'

import { getHamlets, getRts, getRws } from '@/features/kelola-wilayah/api'
import OfficialPositionTypeManager from '@/features/profil-desa-admin/components/OfficialPositionTypeManager'
import {
  demotePerangkatDesa,
  deletePerangkatDesa,
  findOfficialCandidate,
  getOfficialPositionTypes,
  getPerangkatDesa,
  promotePerangkatDesa,
  rotatePerangkatDesa,
  uploadOfficialPhoto,
} from '@/features/profil-desa-admin/api'
import { FooterOperator } from '@/components/layout/FooterOperator'

// Jabatan yang punya akun login dan peran di aplikasi (OfficialPosition di
// backend). Jabatan tanpa akun tidak ada di sini: jenisnya dikelola Petugas
// Desa dan diambil dari API.
const ACCOUNT_POSITIONS = [
  { value: 'kepala_desa', label: 'Kepala Desa' },
  { value: 'sekdes', label: 'Sekretaris Desa' },
  { value: 'kasi_pelayanan', label: 'Kasi Pelayanan' },
  { value: 'kaur_tu_umum', label: 'Kaur TU & Umum' },
  { value: 'kadus', label: 'Kepala Dusun', scope: 'hamlet_id' },
  { value: 'rw', label: 'Ketua RW', scope: 'rw_id' },
  { value: 'rt', label: 'Ketua RT', scope: 'rt_id' },
  { value: 'petugas_desa', label: 'Petugas Desa' },
]

const findAccountPosition = (value) =>
  ACCOUNT_POSITIONS.find((position) => position.value === value)

const positionLabel = (official) => official.position_label ?? official.position

// Calon dikirim sebagai akun untuk jabatan berakun, sebagai data warga
// untuk jabatan tanpa akun.
const candidateTarget = (position, candidate) =>
  findAccountPosition(position)
    ? { user_id: candidate.user_id }
    : { citizen_id: candidate.citizen_id }

const PHOTO_TYPES = 'image/png,image/jpeg,image/webp'

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
        <p className="sid-form-field-error" role="alert">
          {lookupError}
        </p>
      )}
      {candidate && (
        <p className={candidate.eligible ? 'sid-info' : 'sid-form-field-error'} role="status">
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
  const [officials, setOfficials] = useState([])
  const [positionTypes, setPositionTypes] = useState([])
  const [managingTypes, setManagingTypes] = useState(false)
  const [areas, setAreas] = useState({ rts: [], rws: [], hamlets: [] })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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

  // Pilihan jabatan: jabatan berakun, lalu jenis jabatan aktif tanpa akun.
  const positionOptions = useMemo(
    () => [
      ...ACCOUNT_POSITIONS,
      ...positionTypes
        .filter((type) => type.is_active)
        .map((type) => ({ value: type.code, label: `${type.label} (tanpa akun)` })),
    ],
    [positionTypes],
  )

  const visibleOfficials = useMemo(() => {
    const filtered = officials.filter((official) =>
      statusFilter === 'semua' ? true : official.is_active === (statusFilter === 'aktif'),
    )

    return [...filtered].sort(
      (first, second) =>
        Number(second.is_active) - Number(first.is_active) ||
        String(positionLabel(first)).localeCompare(String(positionLabel(second))),
    )
  }, [officials, statusFilter])

  const run = async (request, successMessage) => {
    setProcessing(true)
    setError('')
    setSuccess('')
    setWarnings([])

    try {
      const response = await request()

      setSuccess(response?.data?.message ?? successMessage)
      setWarnings(response?.data?.warnings ?? [])
      setPromotion(null)
      setRotation(null)
      setDemotion(null)
      await loadData()
    } catch (requestError) {
      setError(serverMessage(requestError, 'Aksi pejabat gagal diproses.'))
    } finally {
      setProcessing(false)
    }
  }

  const handlePromote = (event) => {
    event.preventDefault()

    const scope = findAccountPosition(promotion.position)?.scope

    return run(
      () =>
        promotePerangkatDesa({
          ...candidateTarget(promotion.position, promotion.candidate),
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

    return run(
      () =>
        rotatePerangkatDesa(rotation.official.id, {
          ...candidateTarget(rotation.official.position, rotation.candidate),
          started_at: rotation.started_at,
          term_ends_at: rotation.term_ends_at,
          notes: rotation.notes,
          photo: rotation.photo,
        }),
      'Rotasi pejabat berhasil diproses.',
    )
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]
    const official = photoTarget.current

    event.target.value = ''
    if (!file || !official) return undefined

    return run(() => uploadOfficialPhoto(official.id, file), 'Foto pejabat berhasil diperbarui.')
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

  const handleDelete = (official) => {
    if (!window.confirm(`Hapus riwayat jabatan ${official.citizen?.name ?? ''}?`)) return undefined

    return run(() => deletePerangkatDesa(official.id), 'Riwayat jabatan berhasil dihapus.')
  }

  const promotionScope = findAccountPosition(promotion?.position)?.scope

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
              onClick={() => setPromotion({ ...EMPTY_PROMOTION, started_at: today() })}
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

        {error && (
          <p className="sid-admin-alert sid-admin-alert-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="sid-admin-alert sid-admin-alert-success" role="status">
            {success}
          </p>
        )}
        {warnings.map((warning) => (
          <p key={warning.code ?? warning.message} className="sid-warning-box" role="alert">
            {warning.message}
          </p>
        ))}

        <div className="sid-operator-filter-card">
          <div className="sid-operator-filter-field">
            <p>Status</p>
            <select
              aria-label="Filter status jabatan"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="aktif">Sedang menjabat</option>
              <option value="riwayat">Riwayat (sudah berakhir)</option>
              <option value="semua">Semua</option>
            </select>
          </div>
        </div>

        <div className="sid-operator-table-card">
          <div className="sid-operator-table-wrapper">
            <table className="sid-operator-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jabatan</th>
                  <th>Wilayah</th>
                  <th className="center">Mulai</th>
                  <th className="center">Akhir Masa Jabatan</th>
                  <th className="center">Status</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      Memuat data pejabat...
                    </td>
                  </tr>
                ) : visibleOfficials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      Tidak ada data pejabat.
                    </td>
                  </tr>
                ) : (
                  visibleOfficials.map((official) => (
                    <tr key={official.id}>
                      <td className="primary-text">
                        <div className="flex items-center gap-3">
                          <OfficialPhoto src={official.photo_img} name={official.citizen?.name} />
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
                      <td>{positionLabel(official)}</td>
                      <td>{describeArea(official, rwNumbers)}</td>
                      <td className="center">{formatDate(official.started_at)}</td>
                      <td className="center">
                        {official.is_active
                          ? formatDate(official.term_ends_at)
                          : `Berakhir ${formatDate(official.ended_at)}`}
                      </td>
                      <td className="center">{official.is_active ? 'Menjabat' : 'Berakhir'}</td>
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
                              {official.position !== 'petugas_desa' && (
                                <button
                                  type="button"
                                  className="sid-operator-action edit"
                                  title="Rotasi: ganti dengan pejabat baru"
                                  aria-label={`Rotasi ${official.citizen?.name ?? 'pejabat'}`}
                                  disabled={processing}
                                  onClick={() =>
                                    setRotation({
                                      official,
                                      candidate: null,
                                      photo: null,
                                      started_at: today(),
                                      term_ends_at: '',
                                      notes: '',
                                    })
                                  }
                                >
                                  <ArrowLeftRight size={16} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="sid-operator-action toggle"
                                title="Akhiri jabatan"
                                aria-label={`Akhiri jabatan ${official.citizen?.name ?? 'pejabat'}`}
                                disabled={processing}
                                onClick={() => setDemotion({ official, notes: '' })}
                              >
                                <UserRoundMinus size={16} />
                              </button>
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
      </div>

      {promotion && (
        <div className="sid-modal-overlay">
          <form className="sid-modal" onSubmit={handlePromote}>
            <h2>Tetapkan Pejabat</h2>

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
                  <option key={position.value} value={position.value}>
                    {position.label}
                  </option>
                ))}
              </select>
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
                  {areas.rts.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      RT {rt.number} / RW {rwNumbers.get(String(rt.rw_id)) ?? '-'}
                    </option>
                  ))}
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
                  {areas.rws.map((rw) => (
                    <option key={rw.id} value={rw.id}>
                      RW {rw.number}
                    </option>
                  ))}
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
                  {areas.hamlets.map((hamlet) => (
                    <option key={hamlet.id} value={hamlet.id}>
                      {hamlet.name}
                    </option>
                  ))}
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
                onClick={() => setPromotion(null)}
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
            <p>
              {rotation.official.citizen?.name ?? 'Pejabat saat ini'} (
              {describeArea(rotation.official, rwNumbers)}) diakhiri jabatannya dan digantikan warga
              ber-NIK berikut, pada jabatan dan wilayah yang sama.
            </p>

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
                onClick={() => setRotation(null)}
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
                onClick={() => setDemotion(null)}
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

      <FooterOperator />
    </div>
  )
}
