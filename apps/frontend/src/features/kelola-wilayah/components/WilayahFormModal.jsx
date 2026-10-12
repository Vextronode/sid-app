import { X } from 'lucide-react'
import { useMemo, useState } from 'react'

const TYPE_CONFIG = {
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

function getInitialForm(type, item) {
  if (type === 'dusun') {
    return {
      name: item?.name ?? '',
      code: item?.code ?? '',
      is_active: item?.isActive ?? true,
    }
  }

  if (type === 'rw') {
    return {
      number: item?.number ?? '',
      hamlet_id: item?.hamletId ?? '',
      is_active: item?.isActive ?? true,
    }
  }

  return {
    number: item?.number ?? '',
    rw_id: item?.rwId ?? '',
    is_active: item?.isActive ?? true,
  }
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
}) {
  const config = TYPE_CONFIG[type]

  const initialForm = useMemo(() => getInitialForm(type, item), [type, item])

  const [form, setForm] = useState(initialForm)

  if (!open || !config) {
    return null
  }

  const isEdit = Boolean(item?.id)

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    let payload

    if (type === 'dusun') {
      payload = isEdit
        ? {
            name: form.name.trim(),
            is_active: Boolean(form.is_active),
          }
        : {
            name: form.name.trim(),
            code: form.code.trim(),
          }
    } else if (type === 'rw') {
      payload = isEdit
        ? {
            number: form.number.trim(),
            is_active: Boolean(form.is_active),
          }
        : {
            hamlet_id: Number(form.hamlet_id),
            number: form.number.trim(),
          }
    } else {
      payload = isEdit
        ? {
            number: form.number.trim(),
            is_active: Boolean(form.is_active),
          }
        : {
            rw_id: Number(form.rw_id),
            number: form.number.trim(),
          }
    }

    const success = await onSubmit(payload)

    if (success) {
      onClose()
    }
  }

  return (
    <div
      className="sid-wilayah-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
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

          <button type="button" onClick={onClose} className="sid-wilayah-modal-close">
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
                    Kode tidak dapat diubah melalui endpoint update.
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
                    <option key={hamlet.id} value={hamlet.id}>
                      {hamlet.name}
                    </option>
                  ))}
                </select>

                {isEdit && (
                  <span className="sid-wilayah-form-help">
                    Relasi dusun tidak dapat dipindahkan melalui endpoint update.
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
                      <option key={rw.id} value={rw.id}>
                        RW {rw.number}
                        {hamlet ? ` — ${hamlet.name}` : ''}
                      </option>
                    )
                  })}
                </select>

                {isEdit && (
                  <span className="sid-wilayah-form-help">
                    Relasi RW tidak dapat dipindahkan melalui endpoint update.
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

          {isEdit && (
            <label className="sid-wilayah-checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => handleChange('is_active', event.target.checked)}
              />
              <span>Wilayah aktif</span>
            </label>
          )}

          {error && <div className="sid-wilayah-form-error">{error}</div>}

          <div className="sid-wilayah-modal-footer">
            <button
              type="button"
              onClick={onClose}
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
