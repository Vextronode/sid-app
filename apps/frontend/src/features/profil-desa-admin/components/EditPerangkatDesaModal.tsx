// ==========================================
// EditPerangkatDesaModal.tsx
// Edit data Official berdasarkan
// PATCH /api/officials/{id}.
// ==========================================

import { useEffect, useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { Save, X, User, Phone, FileText, Power } from 'lucide-react'

import { StatusPill } from '@/components/ui/StatusPill'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { isFormDirty } from '@/shared/lib/isFormDirty'
import type { ProfileOfficial } from '../types'

// Data perangkat yang dapat diubah dari modal.
export type EditablePerson = Pick<
  ProfileOfficial,
  'id' | 'position' | 'positionLabel' | 'name' | 'phoneWa' | 'isActive' | 'notes'
>

type PersonChanges = Partial<EditablePerson>

const EMPTY_OFFICIAL: EditablePerson = {
  id: null,
  position: '',
  positionLabel: '',
  name: '',
  phoneWa: '',
  isActive: true,
  notes: '',
}

// ==========================================
// NORMALIZE PERSON
// ==========================================

function normalizePerson(person: Partial<EditablePerson> | null | undefined): EditablePerson {
  return {
    ...EMPTY_OFFICIAL,
    id: person?.id ?? null,
    position: person?.position ?? '',
    positionLabel: person?.positionLabel ?? '',
    name: person?.name ?? '',
    phoneWa: person?.phoneWa ?? '',
    isActive: person?.isActive ?? true,
    notes: person?.notes ?? '',
  }
}

// ==========================================
// PERSON EDITOR
// ==========================================

type PersonEditorProps = {
  person: EditablePerson
  onChange: (changes: PersonChanges) => void
  disabled: boolean
}

function PersonEditor({ person, onChange, disabled }: PersonEditorProps) {
  return (
    <div className="sid-profil-desa-device-form-card">
      <div className="sid-profil-desa-device-form-header">
        <div className="sid-profil-desa-device-form-icon">
          <User size={16} />
        </div>

        <div>
          <h3>{person.positionLabel || '-'}</h3>

          <p>{person.name || '-'}</p>
        </div>
      </div>

      <div className="sid-profil-desa-device-readonly">
        <span>Nama</span>

        <strong>{person.name || '-'}</strong>
      </div>

      <div className="sid-profil-desa-device-readonly">
        <span>Jabatan</span>

        <strong>{person.positionLabel || '-'}</strong>
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

      <div className="sid-profil-desa-device-status">
        <span>
          <Power size={14} />
          Status Jabatan
        </span>
        <StatusPill active={person.isActive}>{person.isActive ? 'Aktif' : 'Nonaktif'}</StatusPill>
        <small>Status jabatan dikelola melalui aksi pejabat.</small>
      </div>
    </div>
  )
}

// ==========================================
// MODAL
// ==========================================

type EditPerangkatDesaModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (perangkat: EditablePerson[], kadus: EditablePerson[]) => Promise<unknown>
  initialPerangkat: ProfileOfficial[]
  initialKadus?: ProfileOfficial[]
  processing?: boolean
  error?: string
}

export default function EditPerangkatDesaModal({
  open,
  onClose,
  onSubmit,
  initialPerangkat,
  initialKadus = [],
  processing = false,
  error = '',
}: EditPerangkatDesaModalProps) {
  const [perangkatList, setPerangkatList] = useState<EditablePerson[]>([])

  const [kadusList, setKadusList] = useState<EditablePerson[]>([])

  const [baseline, setBaseline] = useState<{
    perangkat: EditablePerson[]
    kadus: EditablePerson[]
  } | null>(null)
  const requestClose = useConfirmDiscard(
    open && isFormDirty({ perangkat: perangkatList, kadus: kadusList }, baseline),
    { disabled: processing, escapeClose: open ? onClose : null },
  )

  // ==========================================
  // LOAD DATA
  // ==========================================
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      return
    }

    const perangkat = Array.isArray(initialPerangkat) ? initialPerangkat.map(normalizePerson) : []
    const kadus = Array.isArray(initialKadus) ? initialKadus.map(normalizePerson) : []

    setPerangkatList(perangkat)
    setKadusList(kadus)
    setBaseline({ perangkat, kadus })
  }, [open, initialPerangkat, initialKadus])

  // ==========================================
  // UPDATE PERANGKAT & KADUS
  // ==========================================

  const updateIn =
    (setList: Dispatch<SetStateAction<EditablePerson[]>>) =>
    (id: number | null, changes: PersonChanges) => {
      setList((current) =>
        current.map((person) => (person.id === id ? { ...person, ...changes } : person)),
      )
    }

  const updatePerangkat = updateIn(setPerangkatList)

  const updateKadus = updateIn(setKadusList)

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await onSubmit(perangkatList, kadusList)
  }

  if (!open) {
    return null
  }

  // ==========================================
  // PERANGKAT DESA
  // ==========================================
  // Semua perangkat selain Kepala Dusun, termasuk jenis jabatan yang
  // ditambahkan Staf SIDUTama.

  const perangkatSections = perangkatList.filter((person) => person?.id)

  return (
    <div
      className="sid-profil-desa-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          requestClose(onClose)
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
            onClick={() => requestClose(onClose)}
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
            Nama dan foto perangkat diambil dari data pejabat yang tercatat di sistem, jadi tidak
            bisa diubah di sini. Untuk mengganti nama, foto, atau menetapkan pejabat baru, buka
            halaman <Link to="/admin/pejabat-desa">Pejabat Desa</Link>.
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
                {perangkatSections.map((person) => (
                  <PersonEditor
                    key={person.id}
                    person={person}
                    onChange={(changes) => updatePerangkat(person.id, changes)}
                    disabled={processing}
                  />
                ))}
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

          {error && (
            <div className="sid-profil-desa-error" role="alert">
              {error}
            </div>
          )}

          <div className="sid-profil-desa-modal-actions">
            <button
              type="button"
              onClick={() => requestClose(onClose)}
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
