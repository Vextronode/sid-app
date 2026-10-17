import { useState } from 'react'
import { Pencil, Power, Trash2 } from 'lucide-react'

import {
  createOfficialPositionType,
  deleteOfficialPositionType,
  updateOfficialPositionType,
} from '../api'
import { STAF_APP_LABEL } from '@/lib/constants/app'

const EMPTY_FORM = { id: null, label: '', sort_order: '', is_single_occupant: true }

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

/**
 * Kelola jenis jabatan desa tanpa akun (Kasi/Kaur/Staf). Jabatan yang punya
 * akun dan peran di aplikasi tidak dikelola dari sini. Jabatan baru langsung
 * bisa dipilih saat menetapkan pejabat dan tampil di Profil Desa.
 */
export default function OfficialPositionTypeManager({ types, onChanged, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const run = async (request) => {
    setProcessing(true)
    setError('')

    try {
      await request()
      setForm(EMPTY_FORM)
      await onChanged()
    } catch (requestError) {
      setError(serverMessage(requestError, 'Jenis jabatan gagal disimpan.'))
    } finally {
      setProcessing(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const payload = {
      label: form.label.trim(),
      is_single_occupant: form.is_single_occupant,
      ...(form.sort_order !== '' ? { sort_order: Number(form.sort_order) } : {}),
    }

    return run(() =>
      form.id ? updateOfficialPositionType(form.id, payload) : createOfficialPositionType(payload),
    )
  }

  const handleDelete = (type) => {
    if (!window.confirm(`Hapus jenis jabatan ${type.label}?`)) return undefined

    return run(() => deleteOfficialPositionType(type.id))
  }

  return (
    <div className="sid-modal-overlay">
      <div
        className="sid-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="position-type-title"
      >
        <h2 id="position-type-title">Kelola Jenis Jabatan</h2>
        <p>
          Jenis jabatan di sini adalah jabatan desa tanpa akun login. Jabatan yang punya akun
          (Kepala Desa, Sekretaris Desa, Kasi Pelayanan, Kaur TU &amp; Umum, Kepala Dusun, RW, RT,
          {STAF_APP_LABEL}) bersifat tetap.
        </p>

        {error && (
          <p className="sid-form-field-error" role="alert">
            {error}
          </p>
        )}

        <div className="sid-operator-table-wrapper">
          <table className="sid-operator-table">
            <thead>
              <tr>
                <th>Nama Jabatan</th>
                <th className="center">Urutan</th>
                <th className="center">Pemegang</th>
                <th className="center">Status</th>
                <th className="center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {types.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    Belum ada jenis jabatan.
                  </td>
                </tr>
              ) : (
                types.map((type) => (
                  <tr key={type.id}>
                    <td className="primary-text">{type.label}</td>
                    <td className="center">{type.sort_order}</td>
                    <td className="center">{type.is_single_occupant ? 'Satu orang' : 'Banyak'}</td>
                    <td className="center">{type.is_active ? 'Aktif' : 'Nonaktif'}</td>
                    <td className="center">
                      <div className="sid-operator-actions">
                        <button
                          type="button"
                          className="sid-operator-action edit"
                          title="Ubah"
                          aria-label={`Ubah ${type.label}`}
                          disabled={processing}
                          onClick={() =>
                            setForm({
                              id: type.id,
                              label: type.label,
                              sort_order: String(type.sort_order),
                              is_single_occupant: type.is_single_occupant,
                            })
                          }
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="sid-operator-action toggle"
                          title={type.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          aria-label={`${type.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${type.label}`}
                          disabled={processing}
                          onClick={() =>
                            run(() =>
                              updateOfficialPositionType(type.id, { is_active: !type.is_active }),
                            )
                          }
                        >
                          <Power size={16} />
                        </button>
                        <button
                          type="button"
                          className="sid-operator-action delete"
                          title="Hapus"
                          aria-label={`Hapus ${type.label}`}
                          disabled={processing}
                          onClick={() => handleDelete(type)}
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

        <form onSubmit={handleSubmit}>
          <h3>{form.id ? 'Ubah Jenis Jabatan' : 'Tambah Jenis Jabatan'}</h3>

          <label className="sid-form-group">
            <span className="sid-form-label">Nama jabatan *</span>
            <input
              required
              type="text"
              maxLength={100}
              placeholder="mis. Kasi Ketentraman"
              value={form.label}
              disabled={processing}
              onChange={(event) => setForm({ ...form, label: event.target.value })}
            />
          </label>

          <label className="sid-form-group">
            <span className="sid-form-label">Urutan tampil</span>
            <input
              type="number"
              min={0}
              placeholder="Kosongkan untuk menaruh di akhir"
              value={form.sort_order}
              disabled={processing}
              onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_single_occupant}
              disabled={processing}
              onChange={(event) => setForm({ ...form, is_single_occupant: event.target.checked })}
            />
            <span>Hanya boleh dijabat satu orang</span>
          </label>

          <div className="sid-modal-actions">
            <button
              type="button"
              className="sid-button sid-button-outline"
              disabled={processing}
              onClick={form.id ? () => setForm(EMPTY_FORM) : onClose}
            >
              {form.id ? 'Batal Ubah' : 'Tutup'}
            </button>
            <button type="submit" className="sid-button sid-button-primary" disabled={processing}>
              {processing ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Tambah Jabatan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
