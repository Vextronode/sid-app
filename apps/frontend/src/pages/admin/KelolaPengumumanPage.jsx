import '@/styles/beranda.css'

import { Megaphone, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageLoader } from '@/components/ui/PageLoader'
import { getBerandaContent } from '@/features/beranda/berandaContent'
import { AnnouncementBar } from '@/features/beranda/components/AnnouncementBar'
import { formatAnnouncementUntil } from '@/features/beranda/utils/announcement'
import { deleteAnnouncement, getAnnouncement, saveAnnouncement } from '@/features/pengumuman/api'
import { refreshPublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'

const TITLE_MAX = 150
const BODY_MAX = 1000

// Pilihan cepat lama tayang; "Lainnya" membuka isian angka + satuan.
const PRESETS = [
  { id: '1h', label: '1 jam', value: 1, unit: 'hour' },
  { id: '12h', label: '12 jam', value: 12, unit: 'hour' },
  { id: '1d', label: '1 hari', value: 1, unit: 'day' },
  { id: '1w', label: '1 minggu', value: 1, unit: 'week' },
]

const UNIT_LABELS = { hour: 'jam', day: 'hari', week: 'minggu' }

// Pilihan saat mengubah: waktu berakhir tidak diganti.
const KEEP = 'keep'
const CUSTOM = 'custom'

function resolveError(error, fallback) {
  const errors = error?.response?.data?.errors

  return (errors && Object.values(errors).flat()[0]) || error?.response?.data?.message || fallback
}

/** "sisa 3 jam", "sisa 2 hari", "kurang dari 1 jam lagi" */
function remainingLabel(expiresAt) {
  const minutes = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
  if (minutes < 60) return 'kurang dari 1 jam lagi'

  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `sisa ${hours} jam`

  return `sisa ${Math.floor(hours / 24)} hari`
}

function DurationPicker({ choice, custom, onChoice, onCustom, current, disabled }) {
  const chip = (active) =>
    `min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
      active
        ? 'border-[#185fa5] bg-[#185fa5] text-white'
        : 'border-gray-300 bg-white text-gray-700 hover:border-[#185fa5]'
    }`

  return (
    <fieldset className="m-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold text-gray-800">Lama tayang</legend>

      <div className="flex flex-wrap gap-2">
        {current && (
          <button
            type="button"
            className={chip(choice === KEEP)}
            aria-pressed={choice === KEEP}
            onClick={() => onChoice(KEEP)}
          >
            Tetap sampai {formatAnnouncementUntil(current.expires_at)}
          </button>
        )}

        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={chip(choice === preset.id)}
            aria-pressed={choice === preset.id}
            onClick={() => onChoice(preset.id)}
          >
            {preset.label}
          </button>
        ))}

        <button
          type="button"
          className={chip(choice === CUSTOM)}
          aria-pressed={choice === CUSTOM}
          onClick={() => onChoice(CUSTOM)}
        >
          Lainnya…
        </button>
      </div>

      {choice === CUSTOM && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Jumlah
            <input
              type="number"
              min={1}
              max={999}
              inputMode="numeric"
              value={custom.value}
              onChange={(event) => onCustom({ ...custom, value: event.target.value })}
              className="h-11 w-28 rounded-lg border border-gray-300 px-3"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700">
            Satuan
            <select
              value={custom.unit}
              onChange={(event) => onCustom({ ...custom, unit: event.target.value })}
              className="h-11 rounded-lg border border-gray-300 px-3"
            >
              {Object.entries(UNIT_LABELS).map(([unit, label]) => (
                <option key={unit} value={unit}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </fieldset>
  )
}

function AnnouncementForm({ current, processing, error, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: current?.title ?? '',
    body: current?.body ?? '',
    link_url: current?.link_url ?? '',
  })
  const [choice, setChoice] = useState(current ? KEEP : null)
  const [custom, setCustom] = useState({ value: '2', unit: 'hour' })
  const [durationError, setDurationError] = useState('')

  const change = (field) => (event) =>
    setForm((value) => ({ ...value, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()

    let duration = {}

    if (choice === CUSTOM) {
      const value = Number(custom.value)

      if (!Number.isInteger(value) || value < 1 || value > 999) {
        setDurationError('Isi jumlah lama tayang dengan angka bulat 1–999.')
        return
      }

      duration = { duration_value: value, duration_unit: custom.unit }
    } else if (choice && choice !== KEEP) {
      const preset = PRESETS.find((item) => item.id === choice)
      duration = { duration_value: preset.value, duration_unit: preset.unit }
    } else if (!choice) {
      setDurationError('Pilih berapa lama pengumuman tampil.')
      return
    }

    setDurationError('')

    await onSubmit({
      title: form.title.trim(),
      body: form.body.trim() || null,
      link_url: form.link_url.trim() || null,
      ...duration,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="sid-wilayah-form-group">
        <label htmlFor="pengumuman-title">Judul</label>
        <input
          id="pengumuman-title"
          type="text"
          value={form.title}
          onChange={change('title')}
          maxLength={TITLE_MAX}
          placeholder="Contoh: Kantor desa tutup Jumat siang untuk rapat musdes"
          required
          disabled={processing}
        />
        <span className="text-xs text-gray-500">
          {form.title.length}/{TITLE_MAX} karakter. Tampil di bar paling atas beranda.
        </span>
      </div>

      <div className="sid-wilayah-form-group">
        <label htmlFor="pengumuman-body">Isi (opsional)</label>
        <textarea
          id="pengumuman-body"
          rows={4}
          value={form.body}
          onChange={change('body')}
          maxLength={BODY_MAX}
          placeholder="Keterangan tambahan yang terbuka saat warga menekan Baca selengkapnya"
          disabled={processing}
        />
      </div>

      <div className="sid-wilayah-form-group">
        <label htmlFor="pengumuman-link">Link (opsional)</label>
        <input
          id="pengumuman-link"
          type="text"
          value={form.link_url}
          onChange={change('link_url')}
          maxLength={500}
          placeholder="Contoh: /berita/12 atau https://pangandarankab.go.id/..."
          disabled={processing}
        />
        <span className="text-xs text-gray-500">
          Alamat halaman di situs ini (diawali /) atau link lengkap diawali https://.
        </span>
      </div>

      <DurationPicker
        choice={choice}
        custom={custom}
        current={current}
        disabled={processing}
        onChoice={(value) => {
          setChoice(value)
          setDurationError('')
        }}
        onCustom={setCustom}
      />

      {(durationError || error) && (
        <div className="sid-wilayah-form-error" role="alert">
          {durationError || error}
        </div>
      )}

      <p className="m-0 text-sm text-gray-600">
        Hanya satu pengumuman yang tampil. Pengumuman baru menggantikan yang lama, dan otomatis
        hilang dari beranda setelah waktunya habis.
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="sid-wilayah-btn sid-wilayah-btn-secondary"
            disabled={processing}
          >
            Batal
          </button>
        )}

        <button
          type="submit"
          className="sid-wilayah-btn sid-wilayah-btn-primary"
          disabled={processing}
        >
          {processing ? 'Menyimpan...' : current ? 'Simpan perubahan' : 'Tayangkan pengumuman'}
        </button>
      </div>
    </form>
  )
}

export default function KelolaPengumumanPage() {
  const content = getBerandaContent()
  const [announcement, setAnnouncement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    try {
      const response = await getAnnouncement()
      setAnnouncement(response.data?.data ?? null)
      setError('')
    } catch (requestError) {
      setError(resolveError(requestError, 'Gagal memuat pengumuman.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Muat awal menyinkronkan state dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const handleSave = async (payload) => {
    setProcessing(true)
    setFormError('')

    try {
      const response = await saveAnnouncement(payload)
      setAnnouncement(response.data?.data ?? null)
      setEditing(false)
      // Beranda yang sedang terbuka di tab lain ikut memakai data baru.
      refreshPublicVillageInfo()
    } catch (requestError) {
      setFormError(resolveError(requestError, 'Gagal menyimpan pengumuman.'))
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Hapus pengumuman "${announcement.title}" dari beranda?`)) return

    setProcessing(true)

    try {
      await deleteAnnouncement()
      setAnnouncement(null)
      setEditing(false)
      refreshPublicVillageInfo()
    } catch (requestError) {
      setError(resolveError(requestError, 'Gagal menghapus pengumuman.'))
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="sid-kelola-wilayah-page">
        <div className="sid-kelola-wilayah-content">
          <PageLoader label="Memuat pengumuman..." />
        </div>

        <SiteFooter />
      </div>
    )
  }

  const showForm = !announcement || editing

  return (
    <div className="sid-kelola-wilayah-page">
      <div className="sid-kelola-wilayah-content">
        <div className="sid-kelola-wilayah-header">
          <div>
            <span className="sid-kelola-wilayah-eyebrow">Konten Desa</span>

            <h1>Pengumuman</h1>

            <p>
              Satu pengumuman singkat di bagian paling atas beranda, tampil selama waktu yang Anda
              tentukan.
            </p>
          </div>
        </div>

        {error && (
          <div className="sid-kelola-wilayah-error" role="alert">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {announcement && (
            <div className="sid-wilayah-table-card">
              <div className="sid-wilayah-table-toolbar">
                <div>
                  <h3>Sedang tayang</h3>
                  <p>
                    Berakhir {formatAnnouncementUntil(announcement.expires_at)} (
                    {remainingLabel(announcement.expires_at)}).
                  </p>
                </div>

                {!editing && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="sid-wilayah-btn sid-wilayah-btn-secondary"
                      disabled={processing}
                    >
                      <Pencil size={15} aria-hidden="true" />
                      Ubah
                    </button>

                    <button
                      type="button"
                      onClick={handleDelete}
                      className="sid-wilayah-btn sid-wilayah-btn-secondary"
                      disabled={processing}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Hapus
                    </button>
                  </div>
                )}
              </div>

              {/* Pratinjau persis seperti di beranda. */}
              <div className="sid-wilayah-card-body">
                <p className="mt-0 mb-2 text-xs font-semibold text-gray-500">
                  Pratinjau di beranda
                </p>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <AnnouncementBar
                    content={content}
                    announcement={announcement}
                    containerClassName="px-1"
                  />
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <div className="sid-wilayah-table-card">
              <div className="sid-wilayah-table-toolbar">
                <div>
                  <h3 className="flex items-center gap-2">
                    <Megaphone size={18} aria-hidden="true" />
                    {announcement ? 'Ubah pengumuman' : 'Buat pengumuman'}
                  </h3>
                  {!announcement && (
                    <p>
                      Belum ada pengumuman. Pengumuman tampil di bagian atas beranda sampai waktunya
                      habis.
                    </p>
                  )}
                </div>
              </div>

              <div className="sid-wilayah-card-body">
                <AnnouncementForm
                  key={announcement?.updated_at ?? 'new'}
                  current={announcement}
                  processing={processing}
                  error={formError}
                  onSubmit={handleSave}
                  onCancel={
                    announcement
                      ? () => {
                          setEditing(false)
                          setFormError('')
                        }
                      : null
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
