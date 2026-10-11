/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Trash2, UserRoundMinus, UserRoundPlus } from 'lucide-react'

import { getHamlets, getRts, getRws } from '@/features/kelola-wilayah/api'
import {
  demotePerangkatDesa,
  deletePerangkatDesa,
  findOfficialCandidate,
  getPerangkatDesa,
  promotePerangkatDesa,
  rotatePerangkatDesa,
} from '@/features/profil-desa-admin/api'
import { FooterOperator } from '@/components/layout/FooterOperator'

// Jabatan yang punya akun login (OfficialPosition::accountPositions di backend).
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

const POSITION_LABELS = {
  ...Object.fromEntries(ACCOUNT_POSITIONS.map((position) => [position.value, position.label])),
  kasi_kesejahteraan: 'Kasi Kesejahteraan',
  kasi_pemerintahan: 'Kasi Pemerintahan',
  kaur_perencanaan: 'Kaur Perencanaan',
  kaur_keuangan: 'Kaur Keuangan',
  staf_sipades: 'Staf SIPADES',
  staf_siskeudes: 'Staf SISKEUDES',
}

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_PROMOTION = {
  candidate: null,
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

/**
 * Memilih calon pejabat lewat NIK. Backend mencari warga ber-NIK itu di
 * desa ini beserta akunnya, dan memberi tahu bila ia tidak dapat ditetapkan.
 */
function CandidatePicker({ candidate, onChange, disabled }) {
  const [nik, setNik] = useState('')
  const [searching, setSearching] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const handleLookup = async () => {
    setSearching(true)
    setLookupError('')
    onChange(null)

    try {
      const response = await findOfficialCandidate(nik)

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
          disabled={disabled || searching || nik.length !== 16}
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
 * Penetapan, rotasi, dan pengakhiran jabatan pejabat desa. Menetapkan
 * jabatan mengubah peran akun warga menjadi peran jabatan itu; mengakhiri
 * jabatan mengembalikannya menjadi warga. Rotasi melakukan keduanya
 * sekaligus untuk jabatan dan wilayah yang sama.
 */
export default function PejabatDesaPage() {
  const [officials, setOfficials] = useState([])
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

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [officialResponse, rtResponse, rwResponse, hamletResponse] = await Promise.all([
        getPerangkatDesa(),
        getRts(),
        getRws(),
        getHamlets(),
      ])

      setOfficials(unwrap(officialResponse))
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

  const visibleOfficials = useMemo(() => {
    const filtered = officials.filter((official) =>
      statusFilter === 'semua' ? true : official.is_active === (statusFilter === 'aktif'),
    )

    return [...filtered].sort(
      (first, second) =>
        Number(second.is_active) - Number(first.is_active) ||
        String(first.position).localeCompare(String(second.position)),
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

    const scope = ACCOUNT_POSITIONS.find((position) => position.value === promotion.position)?.scope

    return run(
      () =>
        promotePerangkatDesa({
          user_id: promotion.candidate.user_id,
          position: promotion.position,
          ...(scope ? { [scope]: Number(promotion[scope]) } : {}),
          started_at: promotion.started_at,
          ...(promotion.term_ends_at ? { term_ends_at: promotion.term_ends_at } : {}),
          ...(promotion.phone_wa ? { phone_wa: promotion.phone_wa } : {}),
          ...(promotion.notes ? { notes: promotion.notes } : {}),
        }),
      'Pejabat berhasil ditetapkan.',
    )
  }

  const handleRotate = (event) => {
    event.preventDefault()

    return run(
      () =>
        rotatePerangkatDesa(rotation.official.id, {
          user_id: rotation.candidate.user_id,
          started_at: rotation.started_at,
          ...(rotation.term_ends_at ? { term_ends_at: rotation.term_ends_at } : {}),
          ...(rotation.notes ? { notes: rotation.notes } : {}),
        }),
      'Rotasi pejabat berhasil diproses.',
    )
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

  const promotionScope = ACCOUNT_POSITIONS.find(
    (position) => position.value === promotion?.position,
  )?.scope

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
          Menetapkan jabatan mengubah peran akun warga menjadi peran jabatan tersebut. Mengakhiri
          jabatan mengembalikan akun itu menjadi warga. Rotasi mengganti pejabat pada jabatan dan
          wilayah yang sama dalam satu langkah. Calon pejabat dipilih lewat NIK-nya dan harus sudah
          memiliki akun warga aktif.
        </p>

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
                        {official.citizen?.name ?? '-'}
                        {!official.user_id && (
                          <small className="sid-admin-cell-meta">Tanpa akun login</small>
                        )}
                      </td>
                      <td>{POSITION_LABELS[official.position] ?? official.position}</td>
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
                          {official.is_active && official.user_id && (
                            <>
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

            <CandidatePicker
              candidate={promotion.candidate}
              disabled={processing}
              onChange={(candidate) => setPromotion((current) => ({ ...current, candidate }))}
            />

            <label className="sid-form-group">
              <span className="sid-form-label">Jabatan *</span>
              <select
                required
                value={promotion.position}
                onChange={(event) =>
                  setPromotion({
                    ...promotion,
                    position: event.target.value,
                    rt_id: '',
                    rw_id: '',
                    hamlet_id: '',
                  })
                }
              >
                <option value="">Pilih jabatan</option>
                {ACCOUNT_POSITIONS.map((position) => (
                  <option key={position.value} value={position.value}>
                    {position.label}
                  </option>
                ))}
              </select>
            </label>

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
                disabled={processing || !promotion.candidate?.eligible}
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
            <h2>
              Rotasi {POSITION_LABELS[rotation.official.position] ?? rotation.official.position}
            </h2>
            <p>
              {rotation.official.citizen?.name ?? 'Pejabat saat ini'} (
              {describeArea(rotation.official, rwNumbers)}) diakhiri jabatannya dan digantikan warga
              ber-NIK berikut, pada jabatan dan wilayah yang sama.
            </p>

            <CandidatePicker
              candidate={rotation.candidate}
              disabled={processing}
              onChange={(candidate) => setRotation((current) => ({ ...current, candidate }))}
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
                disabled={processing || !rotation.candidate?.eligible}
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
              {POSITION_LABELS[demotion.official.position] ?? demotion.official.position} (
              {describeArea(demotion.official, rwNumbers)}) dan akunnya kembali menjadi warga.
              Jabatan ini kosong sampai pejabat baru ditetapkan.
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

      <FooterOperator />
    </div>
  )
}
