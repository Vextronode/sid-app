import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { isFormDirty } from '@/shared/lib/isFormDirty'
import { notifySuccess } from '@/shared/lib/toast'
import type {
  WilayahHamlet,
  WilayahItem,
  WilayahPayload,
  WilayahProcessing,
  WilayahRw,
  WilayahType,
} from '../types'

// Satu bentuk isian untuk ketiga jenis; kolom yang tidak dipakai jenisnya
// tetap kosong.
type WilayahForm = {
  name: string
  code: string
  number: string
  hamlet_id: number | string
  rw_id: number | string
}

const EMPTY_FORM: WilayahForm = { name: '', code: '', number: '', hamlet_id: '', rw_id: '' }

const TYPE_CONFIG: Record<WilayahType, { title: string; name: string }> = {
  dusun: {
    title: 'Dusun',
    name: 'Nama Dusun',
  },
  rw: {
    title: 'RW',
    name: 'Nomor RW',
  },
  rt: {
    title: 'RT',
    name: 'Nomor RT',
  },
}

function getInitialForm(type: WilayahType, item: WilayahItem | null | undefined): WilayahForm {
  if (type === 'dusun') {
    return {
      ...EMPTY_FORM,
      name: item?.name ?? '',
      code: item?.code ?? '',
    }
  }

  if (type === 'rw') {
    return {
      ...EMPTY_FORM,
      number: item?.number ?? '',
      hamlet_id: item?.hamletId ?? '',
    }
  }

  return {
    ...EMPTY_FORM,
    number: item?.number ?? '',
    rw_id: item?.rwId ?? '',
  }
}

type WilayahFormModalProps = {
  open: boolean
  type: WilayahType
  item: WilayahItem | null
  hamlets: WilayahHamlet[]
  rws: WilayahRw[]
  processing: WilayahProcessing
  error: string
  onClose: () => void
  // true bila tersimpan; modal lalu ditutup.
  onSubmit: (payload: WilayahPayload) => Promise<unknown>
}

export default function WilayahFormModal({
  open,
  type,
  item,
  hamlets,
  rws,
  processing,
  error,
  onClose,
  onSubmit,
}: WilayahFormModalProps) {
  const config = TYPE_CONFIG[type]

  const initialForm = useMemo(() => getInitialForm(type, item), [type, item])

  const [form, setForm] = useState(initialForm)
  const requestClose = useConfirmDiscard(isFormDirty(form, initialForm), {
    disabled: Boolean(processing),
    escapeClose: onClose,
  })

  if (!open || !config) {
    return null
  }

  const isEdit = Boolean(item?.id)

  const handleChange = (field: keyof WilayahForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    let payload: WilayahPayload

    if (type === 'dusun') {
      payload = isEdit
        ? {
            name: form.name.trim(),
          }
        : {
            name: form.name.trim(),
            code: form.code.trim(),
          }
    } else if (type === 'rw') {
      payload = isEdit
        ? {
            number: form.number.trim(),
          }
        : {
            hamlet_id: Number(form.hamlet_id),
            number: form.number.trim(),
          }
    } else {
      payload = isEdit
        ? {
            number: form.number.trim(),
          }
        : {
            rw_id: Number(form.rw_id),
            number: form.number.trim(),
          }
    }

    const success = await onSubmit(payload)

    if (success) {
      notifySuccess(`${config.title} berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}.`)
      onClose()
    }
  }

  return (
    <div
      className="sid-wilayah-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose(onClose)
        }
      }}
    >
      <div className="sid-wilayah-modal">
        <div className="sid-wilayah-modal-header">
          <div>
            <span className="sid-wilayah-modal-eyebrow">Master Wilayah</span>
            <h2>
              {isEdit ? 'Edit' : 'Tambah'} {config.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => requestClose(onClose)}
            className="sid-wilayah-modal-close"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {type === 'dusun' && (
            <>
              <div className="sid-wilayah-form-group">
                <label htmlFor="wilayah-dusun-code">Kode Dusun</label>
                <input
                  id="wilayah-dusun-code"
                  type="text"
                  value={form.code}
                  onChange={(event) => handleChange('code', event.target.value)}
                  placeholder="Contoh: 321803200101"
                  disabled={isEdit}
                  required={!isEdit}
                />
                {isEdit && (
                  <span className="sid-wilayah-form-help">
                    Kode tidak dapat diubah setelah disimpan.
                  </span>
                )}
              </div>

              <div className="sid-wilayah-form-group">
                <label htmlFor="wilayah-dusun-name">Nama Dusun</label>
                <input
                  id="wilayah-dusun-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  placeholder="Nama dusun"
                  maxLength={255}
                  required
                />
              </div>
            </>
          )}

          {type === 'rw' && (
            <>
              <div className="sid-wilayah-form-group">
                <label htmlFor="wilayah-rw-hamlet">Dusun</label>
                <select
                  id="wilayah-rw-hamlet"
                  value={form.hamlet_id}
                  onChange={(event) => handleChange('hamlet_id', event.target.value)}
                  disabled={isEdit}
                  required
                >
                  <option value="">Pilih dusun</option>

                  {hamlets.map((hamlet) => (
                    <option key={hamlet.id} value={hamlet.id ?? ''}>
                      {hamlet.name}
                    </option>
                  ))}
                </select>

                {isEdit && (
                  <span className="sid-wilayah-form-help">
                    Dusun tidak dapat dipindahkan setelah disimpan.
                  </span>
                )}
              </div>

              <div className="sid-wilayah-form-group">
                <label htmlFor="wilayah-rw-number">Nomor RW</label>
                <input
                  id="wilayah-rw-number"
                  type="text"
                  value={form.number}
                  onChange={(event) => handleChange('number', event.target.value)}
                  placeholder="Contoh: 001"
                  maxLength={10}
                  required
                />
              </div>
            </>
          )}

          {type === 'rt' && (
            <>
              <div className="sid-wilayah-form-group">
                <label htmlFor="wilayah-rt-rw">RW</label>
                <select
                  id="wilayah-rt-rw"
                  value={form.rw_id}
                  onChange={(event) => handleChange('rw_id', event.target.value)}
                  disabled={isEdit}
                  required
                >
                  <option value="">Pilih RW</option>

                  {rws.map((rw) => {
                    const hamlet = hamlets.find((item) => item.id === rw.hamletId)

                    return (
                      <option key={rw.id} value={rw.id ?? ''}>
                        RW {rw.number}
                        {hamlet ? ` - ${hamlet.name}` : ''}
                      </option>
                    )
                  })}
                </select>

                {isEdit && (
                  <span className="sid-wilayah-form-help">
                    RW tidak dapat dipindahkan setelah disimpan.
                  </span>
                )}
              </div>

              <div className="sid-wilayah-form-group">
                <label htmlFor="wilayah-rt-number">Nomor RT</label>
                <input
                  id="wilayah-rt-number"
                  type="text"
                  value={form.number}
                  onChange={(event) => handleChange('number', event.target.value)}
                  placeholder="Contoh: 001"
                  maxLength={10}
                  required
                />
              </div>
            </>
          )}

          {error && <div className="sid-wilayah-form-error">{error}</div>}

          <div className="sid-wilayah-modal-footer">
            <button
              type="button"
              onClick={() => requestClose(onClose)}
              className="sid-wilayah-btn sid-wilayah-btn-secondary"
            >
              Batal
            </button>

            <button
              type="submit"
              className="sid-wilayah-btn sid-wilayah-btn-primary"
              disabled={Boolean(processing)}
            >
              {processing ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
