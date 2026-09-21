// ==========================================
// EditPerangkatDesaModal.jsx
// Edit data Official berdasarkan
// PATCH /api/officials/{id}.
// ==========================================

import { useEffect, useState } from 'react'
import { Save, X, User, Phone, FileText, Power } from 'lucide-react'

const EMPTY_OFFICIAL = {
  id: null,
  position: '',
  name: '',
  phoneWa: '',
  isActive: true,
  notes: '',
}

// ==========================================
// NORMALIZE PERSON
// ==========================================

function normalizePerson(person) {
  return {
    ...EMPTY_OFFICIAL,
    id: person?.id ?? null,
    position: person?.position ?? '',
    name: person?.name ?? '',
    phoneWa: person?.phoneWa ?? '',
    isActive: person?.isActive ?? true,
    notes: person?.notes ?? '',
  }
}

// ==========================================
// FORMAT POSITION
// ==========================================

function formatPosition(position) {
  const labels = {
    kepala_desa: 'Kepala Desa',
    sekdes: 'Sekretaris Desa',
    kasi_pelayanan: 'Kasi Pelayanan',
    kasi_kesejahteraan: 'Kasi Kesejahteraan',
    kasi_pemerintahan: 'Kasi Pemerintahan',
    kaur_tu_umum: 'Kaur TU Umum',
    kaur_perencanaan: 'Kaur Perencanaan',
    kaur_keuangan: 'Kaur Keuangan',
    kadus: 'Kepala Dusun',
  }

  return labels[position] ?? position?.replaceAll('_', ' ') ?? '-'
}

// ==========================================
// PERSON EDITOR
// ==========================================

function PersonEditor({ person, onChange, disabled }) {
  return (
    <div className="sid-profil-desa-device-form-card">
      <div className="sid-profil-desa-device-form-header">
        <div className="sid-profil-desa-device-form-icon">
          <User size={16} />
        </div>

        <div>
          <h3>{formatPosition(person.position)}</h3>

          <p>{person.name || '-'}</p>
        </div>
      </div>

      <div className="sid-profil-desa-device-readonly">
        <span>Nama</span>

        <strong>{person.name || '-'}</strong>
      </div>

      <div className="sid-profil-desa-device-readonly">
        <span>Jabatan</span>

        <strong>{formatPosition(person.position)}</strong>
      </div>

      <div className="sid-profil-desa-form-field">
        <label>
          <Phone size={14} />
          Nomor WhatsApp
        </label>

        <input
          type="text"
          value={person.phoneWa}
          onChange={(event) =>
            onChange({
              phoneWa: event.target.value,
            })
          }
          placeholder="Contoh: 081234567890"
          maxLength={20}
          disabled={disabled}
        />
      </div>

      <div className="sid-profil-desa-form-field">
        <label>
          <FileText size={14} />
          Catatan
        </label>

        <textarea
          value={person.notes}
          onChange={(event) =>
            onChange({
              notes: event.target.value,
            })
          }
          placeholder="Catatan tambahan"
          rows={3}
          disabled={disabled}
        />
      </div>

      <label className="sid-profil-desa-device-status">
        <span>
          <Power size={14} />
          Status Aktif
        </span>

        <input
          type="checkbox"
          checked={person.isActive}
          onChange={(event) =>
            onChange({
              isActive: event.target.checked,
            })
          }
          disabled={disabled}
        />
      </label>
    </div>
  )
}

// ==========================================
// MODAL
// ==========================================

export default function EditPerangkatDesaModal({
  open,
  onClose,
  onSubmit,
  initialPerangkat,
  initialKadus = [],
  processing = false,
}) {
  const [kepalaDesa, setKepalaDesa] = useState(EMPTY_OFFICIAL)

  const [sekdes, setSekdes] = useState(EMPTY_OFFICIAL)

  const [kasiPelayanan, setKasiPelayanan] = useState(EMPTY_OFFICIAL)

  const [kasiKesejahteraan, setKasiKesejahteraan] = useState(EMPTY_OFFICIAL)

  const [kasiPemerintahan, setKasiPemerintahan] = useState(EMPTY_OFFICIAL)

  const [kaurTuUmum, setKaurTuUmum] = useState(EMPTY_OFFICIAL)

  const [kaurPerencanaan, setKaurPerencanaan] = useState(EMPTY_OFFICIAL)

  const [kaurKeuangan, setKaurKeuangan] = useState(EMPTY_OFFICIAL)

  const [kadusList, setKadusList] = useState([])

  // ==========================================
  // LOAD DATA
  // ==========================================
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      return
    }

    setKepalaDesa(normalizePerson(initialPerangkat?.kepalaDesa))

    setSekdes(normalizePerson(initialPerangkat?.sekdes))

    setKasiPelayanan(normalizePerson(initialPerangkat?.kasiPelayanan ?? initialPerangkat?.kasi))

    setKasiKesejahteraan(normalizePerson(initialPerangkat?.kasiKesejahteraan))

    setKasiPemerintahan(normalizePerson(initialPerangkat?.kasiPemerintahan))

    setKaurTuUmum(normalizePerson(initialPerangkat?.kaurTuUmum))

    setKaurPerencanaan(normalizePerson(initialPerangkat?.kaurPerencanaan))

    setKaurKeuangan(normalizePerson(initialPerangkat?.kaurKeuangan))

    setKadusList(Array.isArray(initialKadus) ? initialKadus.map(normalizePerson) : [])
  }, [open, initialPerangkat, initialKadus])

  // ==========================================
  // UPDATE KADUS
  // ==========================================

  const updateKadus = (id, changes) => {
    setKadusList((current) =>
      current.map((kadus) =>
        kadus.id === id
          ? {
              ...kadus,
              ...changes,
            }
          : kadus,
      ),
    )
  }

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault()

    const perangkat = {
      kepalaDesa,
      sekdes,
      kasiPelayanan,
      kasiKesejahteraan,
      kasiPemerintahan,
      kaurTuUmum,
      kaurPerencanaan,
      kaurKeuangan,

      // Alias kompatibilitas
      kasi: kasiPelayanan,
    }

    await onSubmit(perangkat, kadusList)
  }

  if (!open) {
    return null
  }

  // ==========================================
  // PERANGKAT DESA
  // ==========================================

  const perangkatSections = [
    kepalaDesa,
    sekdes,
    kasiPelayanan,
    kasiKesejahteraan,
    kasiPemerintahan,
    kaurTuUmum,
    kaurPerencanaan,
    kaurKeuangan,
  ].filter((person) => person?.id)

  return (
    <div
      className="sid-profil-desa-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onClose()
        }
      }}
    >
      <div
        className="sid-profil-desa-modal sid-profil-desa-modal-large"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-perangkat-title"
      >
        {/* ==========================================
            HEADER
            ========================================== */}

        <div className="sid-profil-desa-modal-header">
          <div>
            <p className="sid-profil-desa-modal-eyebrow">Perangkat Desa</p>

            <h2 id="edit-perangkat-title">Edit Perangkat Desa</h2>

            <p>Perbarui informasi kontak, status, dan catatan perangkat yang sudah terdaftar.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sid-profil-desa-modal-close"
            disabled={processing}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sid-profil-desa-modal-form">
          {/* ==========================================
              NOTICE
              ========================================== */}

          <div className="sid-profil-desa-device-notice">
            Nama dan foto perangkat berasal dari data backend. Nama tidak diedit dari modal ini, dan
            upload foto belum tersedia pada endpoint update perangkat.
          </div>

          {/* ==========================================
              PERANGKAT DESA
              ========================================== */}

          {perangkatSections.length > 0 && (
            <div className="sid-profil-desa-device-group">
              <div className="sid-profil-desa-device-group-heading">
                <div>
                  <h3>Perangkat Desa</h3>

                  <p>Data perangkat desa yang sudah terdaftar pada sistem.</p>
                </div>

                <span>{perangkatSections.length} data</span>
              </div>

              <div className="sid-profil-desa-device-sections">
                {kepalaDesa.id && (
                  <PersonEditor
                    person={kepalaDesa}
                    onChange={(changes) =>
                      setKepalaDesa((current) => ({
                        ...current,
                        ...changes,
                      }))
                    }
                    disabled={processing}
                  />
                )}

                {sekdes.id && (
                  <PersonEditor
                    person={sekdes}
                    onChange={(changes) =>
                      setSekdes((current) => ({
                        ...current,
                        ...changes,
                      }))
                    }
                    disabled={processing}
                  />
                )}

                {kasiPelayanan.id && (
                  <PersonEditor
                    person={kasiPelayanan}
                    onChange={(changes) =>
                      setKasiPelayanan((current) => ({
                        ...current,
                        ...changes,
                      }))
                    }
                    disabled={processing}
                  />
                )}

                {kasiKesejahteraan.id && (
                  <PersonEditor
                    person={kasiKesejahteraan}
                    onChange={(changes) =>
                      setKasiKesejahteraan((current) => ({
                        ...current,
                        ...changes,
                      }))
                    }
                    disabled={processing}
                  />
                )}

                {kasiPemerintahan.id && (
                  <PersonEditor
                    person={kasiPemerintahan}
                    onChange={(changes) =>
                      setKasiPemerintahan((current) => ({
                        ...current,
                        ...changes,
                      }))
                    }
                    disabled={processing}
                  />
                )}

                {kaurTuUmum.id && (
                  <PersonEditor
                    person={kaurTuUmum}
                    onChange={(changes) =>
                      setKaurTuUmum((current) => ({
                        ...current,
                        ...changes,
                      }))
                    }
                    disabled={processing}
                  />
                )}

                {kaurPerencanaan.id && (
                  <PersonEditor
                    person={kaurPerencanaan}
                    onChange={(changes) =>
                      setKaurPerencanaan((current) => ({
                        ...current,
                        ...changes,
                      }))
                    }
                    disabled={processing}
                  />
                )}

                {kaurKeuangan.id && (
                  <PersonEditor
                    person={kaurKeuangan}
                    onChange={(changes) =>
                      setKaurKeuangan((current) => ({
                        ...current,
                        ...changes,
                      }))
                    }
                    disabled={processing}
                  />
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              KEPALA DUSUN
              ========================================== */}

          <div className="sid-profil-desa-device-group">
            <div className="sid-profil-desa-device-group-heading">
              <div>
                <h3>Kepala Dusun</h3>

                <p>Data Kadus yang sudah terdaftar pada sistem.</p>
              </div>

              <span>{kadusList.length} data</span>
            </div>

            {kadusList.length > 0 ? (
              <div className="sid-profil-desa-device-sections">
                {kadusList.map((kadus) => (
                  <PersonEditor
                    key={kadus.id}
                    person={kadus}
                    onChange={(changes) => updateKadus(kadus.id, changes)}
                    disabled={processing}
                  />
                ))}
              </div>
            ) : (
              <div className="sid-profil-desa-device-empty">Belum ada data Kepala Dusun.</div>
            )}
          </div>

          {/* ==========================================
              ACTIONS
              ========================================== */}

          <div className="sid-profil-desa-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="sid-profil-desa-modal-secondary"
              disabled={processing}
            >
              Batal
            </button>

            <button
              type="submit"
              className="sid-profil-desa-modal-primary"
              disabled={processing || perangkatSections.length === 0}
            >
              <Save size={15} />

              {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
