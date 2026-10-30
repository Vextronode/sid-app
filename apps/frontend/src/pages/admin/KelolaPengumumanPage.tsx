import '@/styles/beranda.css'

import { Megaphone, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageLoader } from '@/components/ui/PageLoader'
import { RefreshButton } from '@/components/ui/RefreshButton'
import { getBerandaContent } from '@/features/beranda/berandaContent'
import { AnnouncementBar } from '@/features/beranda/components/AnnouncementBar'
import { formatAnnouncementUntil } from '@/features/beranda/utils/announcement'
import { getBeritaList } from '@/features/kelola-berita/api'
import { deleteAnnouncement, getAnnouncement, saveAnnouncement } from '@/features/pengumuman/api'
import { refreshPublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { confirmDialog } from '@/shared/lib/dialog'
import { useConfirmDiscard } from '@/shared/hooks/useConfirmDiscard'
import { isFormDirty } from '@/shared/lib/isFormDirty'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { ChangeEvent, FormEvent } from 'react'
import type { PublicAnnouncement } from '@/features/info-desa/usePublicVillageInfo'
import type { AnnouncementPayload, DurationUnit } from '@/features/pengumuman/api'
import type { News } from '@/types'

const TITLE_MAX = 150
const BODY_MAX = 1000

// Pilihan cepat lama tayang; "Lainnya" membuka isian angka + satuan.
const PRESETS: { id: string; label: string; value: number; unit: DurationUnit }[] = [
  { id: '1h', label: '1 jam', value: 1, unit: 'hour' },
  { id: '12h', label: '12 jam', value: 12, unit: 'hour' },
  { id: '1d', label: '1 hari', value: 1, unit: 'day' },
  { id: '1w', label: '1 minggu', value: 1, unit: 'week' },
]

const UNIT_LABELS: Record<DurationUnit, string> = { hour: 'jam', day: 'hari', week: 'minggu' }

// Pilihan saat mengubah: waktu berakhir tidak diganti.
const KEEP = 'keep'
const CUSTOM = 'custom'

// Jenis link pengumuman. Berita desa dipilih dari daftar, disimpan sebagai
// alamat halaman detailnya (/berita/{id}).
type LinkMode = 'none' | 'news' | 'other'

type LinkState = { mode: LinkMode; newsId: string; url: string }

// Lama tayang kustom: jumlah diketik sebagai teks.
type CustomDuration = { value: string; unit: DurationUnit }

type PublishedNews = {
  status: 'loading' | 'ready' | 'error'
  items: News[]
  reload: () => Promise<void>
}

const LINK_MODES: { id: LinkMode; label: string }[] = [
  { id: 'none', label: 'Tanpa link' },
  { id: 'news', label: 'Berita desa' },
  { id: 'other', label: 'Link lain' },
]
const NEWS_LINK = /^\/berita\/(\d+)$/

function chipClass(active: boolean) {
  return `min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
    active
      ? 'border-[#185fa5] bg-[#185fa5] text-white'
      : 'border-gray-300 bg-white text-gray-700 hover:border-[#185fa5]'
  }`
}

function initialLink(linkUrl: string | null | undefined): LinkState {
  if (!linkUrl) return { mode: 'none', newsId: '', url: '' }

  const match = linkUrl.match(NEWS_LINK)
  if (match) return { mode: 'news', newsId: match[1], url: '' }

  return { mode: 'other', newsId: '', url: linkUrl }
}

// Berita yang sudah terbit, terbaru dulu, untuk dropdown link.
function usePublishedNews() {
  const [state, setState] = useState<Omit<PublishedNews, 'reload'>>({
    status: 'loading',
    items: [],
  })

  const load = useCallback(async () => {
    setState({ status: 'loading', items: [] })

    try {
      const response = await getBeritaList({ status: 'published' })
      setState({ status: 'ready', items: response.data?.data ?? [] })
    } catch {
      setState({ status: 'error', items: [] })
    }
  }, [])

  useEffect(() => {
    // Muat awal menyinkronkan state dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  return { ...state, reload: load }
}

/** "sisa 3 jam", "sisa 2 hari", "kurang dari 1 jam lagi" */
function remainingLabel(expiresAt: string) {
  const minutes = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
  if (minutes < 60) return 'kurang dari 1 jam lagi'

  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `sisa ${hours} jam`

  return `sisa ${Math.floor(hours / 24)} hari`
}

type DurationPickerProps = {
  // KEEP, CUSTOM, id preset, atau null bila belum dipilih.
  choice: string | null
  custom: CustomDuration
  onChoice: (choice: string) => void
  onCustom: (custom: CustomDuration) => void
  current: PublicAnnouncement | null
  disabled: boolean
}

function DurationPicker({
  choice,
  custom,
  onChoice,
  onCustom,
  current,
  disabled,
}: DurationPickerProps) {
  return (
    <fieldset className="m-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold text-gray-800">Lama tayang</legend>

      <div className="flex flex-wrap gap-2">
        {current && (
          <button
            type="button"
            className={chipClass(choice === KEEP)}
            aria-pressed={choice === KEEP}
            onClick={() => onChoice(KEEP)}
          >
            Tetap sampai {current.expires_at ? formatAnnouncementUntil(current.expires_at) : '-'}
          </button>
        )}

        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={chipClass(choice === preset.id)}
            aria-pressed={choice === preset.id}
            onClick={() => onChoice(preset.id)}
          >
            {preset.label}
          </button>
        ))}

        <button
          type="button"
          className={chipClass(choice === CUSTOM)}
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
              onChange={(event) =>
                onCustom({ ...custom, unit: event.target.value as DurationUnit })
              }
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

type LinkPickerProps = {
  link: LinkState
  onChange: (link: LinkState) => void
  news: PublishedNews
  missing: boolean
  disabled: boolean
}

function LinkPicker({ link, onChange, news, missing, disabled }: LinkPickerProps) {
  return (
    <fieldset className="m-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold text-gray-800">Link (opsional)</legend>

      <div className="flex flex-wrap gap-2">
        {LINK_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={chipClass(link.mode === mode.id)}
            aria-pressed={link.mode === mode.id}
            onClick={() => onChange({ ...link, mode: mode.id })}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {link.mode === 'news' && (
        <div className="sid-wilayah-form-group mt-3">
          <label htmlFor="pengumuman-news">Berita</label>
          <select
            id="pengumuman-news"
            value={missing ? '' : link.newsId}
            onChange={(event) => onChange({ ...link, newsId: event.target.value })}
            disabled={news.status !== 'ready' || news.items.length === 0}
          >
            <option value="">
              {news.status === 'loading' ? 'Memuat berita…' : 'Pilih berita…'}
            </option>
            {news.items.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.title}
              </option>
            ))}
          </select>

          {news.status === 'error' && (
            <span className="flex flex-wrap items-center gap-2 text-xs text-red-700">
              Daftar berita gagal dimuat.
              <button
                type="button"
                onClick={news.reload}
                className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-[#185fa5] underline"
              >
                Coba lagi
              </button>
            </span>
          )}
          {news.status === 'ready' && news.items.length === 0 && (
            <span className="text-xs text-gray-500">
              Belum ada berita yang terbit. Terbitkan berita dulu di Kelola Berita, atau pakai Link
              lain.
            </span>
          )}
          {missing && (
            <span className="text-xs text-amber-800">
              Berita yang ditautkan sudah tidak tersedia. Pilih berita lain.
            </span>
          )}
          {news.status === 'ready' && news.items.length > 0 && !missing && (
            <span className="text-xs text-gray-500">
              Warga membuka berita ini lewat tombol Lihat selengkapnya.
            </span>
          )}
        </div>
      )}

      {link.mode === 'other' && (
        <div className="sid-wilayah-form-group mt-3">
          <label htmlFor="pengumuman-link">Alamat link</label>
          <input
            id="pengumuman-link"
            type="text"
            value={link.url}
            onChange={(event) => onChange({ ...link, url: event.target.value })}
            maxLength={500}
            placeholder="Contoh: https://pangandarankab.go.id/..."
          />
          <span className="text-xs text-gray-500">
            Link lengkap diawali https://, atau alamat halaman di situs ini diawali /.
          </span>
        </div>
      )}
    </fieldset>
  )
}

type AnnouncementFormProps = {
  current: PublicAnnouncement | null
  processing: boolean
  error: string
  onSubmit: (payload: AnnouncementPayload) => Promise<void>
  // Tanpa onCancel (belum ada pengumuman) tombol Batal tidak tampil.
  onCancel: (() => void) | null
}

function AnnouncementForm({
  current,
  processing,
  error,
  onSubmit,
  onCancel,
}: AnnouncementFormProps) {
  const [form, setForm] = useState({
    title: current?.title ?? '',
    body: current?.body ?? '',
  })
  const [link, setLink] = useState(() => initialLink(current?.link_url))
  const news = usePublishedNews()
  const [choice, setChoice] = useState<string | null>(current ? KEEP : null)
  const [custom, setCustom] = useState<CustomDuration>({ value: '2', unit: 'hour' })
  const [durationError, setDurationError] = useState('')
  const [linkError, setLinkError] = useState('')
  // Isian awal untuk peringatan "Buang perubahan?" saat Batal.
  const [baseline] = useState(() => ({
    title: current?.title ?? '',
    body: current?.body ?? '',
    link: initialLink(current?.link_url),
    choice: current ? KEEP : null,
  }))
  const requestCancel = useConfirmDiscard(isFormDirty({ ...form, link, choice }, baseline), {
    disabled: processing,
  })

  // Berita yang ditautkan sudah dihapus atau ditarik jadi draf.
  const missing =
    news.status === 'ready' &&
    link.newsId !== '' &&
    !news.items.some((item) => String(item.id) === link.newsId)

  const change =
    (field: 'title' | 'body') => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((value) => ({ ...value, [field]: event.target.value }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    let linkUrl = null

    if (link.mode === 'news') {
      if (!link.newsId || missing) {
        setLinkError('Pilih berita yang ingin ditautkan.')
        return
      }

      linkUrl = `/berita/${link.newsId}`
    } else if (link.mode === 'other') {
      linkUrl = link.url.trim() || null
    }

    setLinkError('')

    let duration: Pick<AnnouncementPayload, 'duration_value' | 'duration_unit'> = {}

    if (choice === CUSTOM) {
      const value = Number(custom.value)

      if (!Number.isInteger(value) || value < 1 || value > 999) {
        setDurationError('Isi jumlah lama tayang dengan angka bulat 1–999.')
        return
      }

      duration = { duration_value: value, duration_unit: custom.unit }
    } else if (choice && choice !== KEEP) {
      const preset = PRESETS.find((item) => item.id === choice)
      if (preset) duration = { duration_value: preset.value, duration_unit: preset.unit }
    } else if (!choice) {
      setDurationError('Pilih berapa lama pengumuman tampil.')
      return
    }

    setDurationError('')

    await onSubmit({
      title: form.title.trim(),
      body: form.body.trim() || null,
      link_url: linkUrl,
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

      <LinkPicker
        link={link}
        news={news}
        missing={missing}
        disabled={processing}
        onChange={(value) => {
          setLink(value)
          setLinkError('')
        }}
      />

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

      {(linkError || durationError || error) && (
        <div className="sid-wilayah-form-error" role="alert">
          {linkError || durationError || error}
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
            onClick={() => requestCancel(onCancel)}
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
  const [announcement, setAnnouncement] = useState<PublicAnnouncement | null>(null)
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
      setError(getApiErrorMessage(requestError, 'Gagal memuat pengumuman.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Muat awal menyinkronkan state dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const handleSave = async (payload: AnnouncementPayload) => {
    setProcessing(true)
    setFormError('')

    try {
      const response = await saveAnnouncement(payload)
      setAnnouncement(response.data?.data ?? null)
      setEditing(false)
      notifySuccess('Pengumuman berhasil ditayangkan di beranda.')
      // Beranda yang sedang terbuka di tab lain ikut memakai data baru.
      refreshPublicVillageInfo()
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError, 'Gagal menyimpan pengumuman.'))
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!announcement) return

    if (
      !(await confirmDialog({
        title: `Hapus pengumuman "${announcement.title}"?`,
        message: 'Pengumuman akan hilang dari beranda.',
        confirmLabel: 'Hapus',
      }))
    )
      return

    setProcessing(true)

    try {
      await deleteAnnouncement()
      notifySuccess('Pengumuman berhasil dihapus dari beranda.')
      setAnnouncement(null)
      setEditing(false)
      refreshPublicVillageInfo()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal menghapus pengumuman.'))
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

          <div className="sid-kelola-wilayah-header-actions">
            <RefreshButton onRefresh={load} disabled={processing} />
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
                  {announcement.expires_at && (
                    <p>
                      Berakhir {formatAnnouncementUntil(announcement.expires_at)} (
                      {remainingLabel(announcement.expires_at)}).
                    </p>
                  )}
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
