// ==========================================
// EditVisiMisiModal.tsx
// Edit vision dan mission berdasarkan
// PATCH /api/villages/profile.
// ==========================================

import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { X, Save } from 'lucide-react'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { isFormDirty } from '@/shared/lib/isFormDirty'

type VisiMisi = { vision: string; mission: string }

type EditVisiMisiModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (payload: VisiMisi) => Promise<unknown>
  initialData: Partial<VisiMisi> | null
  processing?: boolean
  error?: string
}

export default function EditVisiMisiModal({
  open,
  onClose,
  onSubmit,
  initialData,
  processing = false,
  error = '',
}: EditVisiMisiModalProps) {
  const [form, setForm] = useState<VisiMisi>({
    vision: '',
    mission: '',
  })
  const [baseline, setBaseline] = useState<VisiMisi | null>(null)
  const requestClose = useConfirmDiscard(open && isFormDirty(form, baseline), {
    disabled: processing,
    escapeClose: open ? onClose : null,
  })

  useEffect(() => {
    if (!open) return

    const initialForm = {
      vision: initialData?.vision ?? '',
      mission: initialData?.mission ?? '',
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(initialForm)
    setBaseline(initialForm)
  }, [open, initialData])

  if (!open) return null

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await onSubmit({
      vision: form.vision.trim(),
      mission: form.mission.trim(),
    })
  }

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
        className="sid-profil-desa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-visi-misi-title"
      >
        <div className="sid-profil-desa-modal-header">
          <div>
            <p className="sid-profil-desa-modal-eyebrow">Arah Pembangunan</p>

            <h2 id="edit-visi-misi-title">Edit Visi &amp; Misi</h2>

            <p>Perbarui visi dan misi Desa yang ditampilkan pada profil.</p>
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
          <div className="sid-profil-desa-form-field">
            <label htmlFor="profil-vision">Visi</label>

            <textarea
              id="profil-vision"
              name="vision"
              value={form.vision}
              onChange={handleChange}
              placeholder="Tuliskan visi Desa"
              rows={5}
              disabled={processing}
            />
          </div>

          <div className="sid-profil-desa-form-field">
            <label htmlFor="profil-mission">Misi</label>

            <textarea
              id="profil-mission"
              name="mission"
              value={form.mission}
              onChange={handleChange}
              placeholder="Tuliskan misi Desa"
              rows={8}
              disabled={processing}
            />

            <span className="sid-profil-desa-form-help">
              Tulis satu butir misi per baris; tiap baris tampil sebagai satu nomor misi.
            </span>
          </div>

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

            <button type="submit" className="sid-profil-desa-modal-primary" disabled={processing}>
              <Save size={15} />

              {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
