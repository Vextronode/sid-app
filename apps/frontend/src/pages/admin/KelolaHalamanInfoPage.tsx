import { ExternalLink, Save } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageLoader } from '@/components/ui/PageLoader'
import { getInfoPages, saveInfoPage } from '@/features/info-admin/api'
import { ListField } from '@/features/info-admin/components/ListField'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { FormEvent, KeyboardEvent } from 'react'
import type { InfoPageSection, SavedInfoPage } from '@/features/info-admin/api'

// Alamat publik tiap halaman (route di App.tsx).
const PUBLIC_PATHS: Record<string, string> = {
  ppid: '/ppid',
  'kebijakan-privasi': '/kebijakan-privasi',
  aksesibilitas: '/aksesibilitas',
}

const INPUT_TYPES: Record<string, string> = { email: 'email', date: 'date' }

function formatUpdated(value: string | null) {
  if (!value) return 'Belum pernah disimpan'

  return `Terakhir disimpan ${new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

// Satu halaman: field tunggal jadi input, field daftar jadi daftar dinamis.
type InfoPageFormProps = {
  section: InfoPageSection
  onSaved: (saved: SavedInfoPage) => void
}

function InfoPageForm({ section, onSaved }: InfoPageFormProps) {
  const formId = useId()
  const [values, setValues] = useState(section.fields)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'error'; text: string } | null>(null)

  const set = (key: string, value: string | string[]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setMessage(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProcessing(true)
    setMessage(null)

    try {
      const response = await saveInfoPage(section.page, values)
      const saved = response.data?.data

      setValues(saved.fields)
      onSaved(saved)
      notifySuccess(`${section.title} berhasil disimpan.`)
    } catch (requestError) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(requestError, `Gagal menyimpan ${section.title}.`),
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {section.schema.map((field) => {
        const id = `${formId}-${field.key}`

        if (field.type === 'list') {
          return (
            <ListField
              key={field.key}
              id={id}
              label={field.label}
              hint={field.hint}
              items={(values[field.key] as string[] | undefined) ?? []}
              onChange={(items) => set(field.key, items)}
              disabled={processing}
            />
          )
        }

        return (
          <div key={field.key} className="sid-wilayah-form-group">
            <label htmlFor={id}>{field.label}</label>
            <input
              id={id}
              type={INPUT_TYPES[field.type] ?? 'text'}
              value={values[field.key] ?? ''}
              onChange={(event) => set(field.key, event.target.value)}
              maxLength={field.type === 'date' ? undefined : 300}
              aria-describedby={field.hint ? `${id}-hint` : undefined}
              disabled={processing}
            />
            {field.hint && (
              <span id={`${id}-hint`} className="text-xs text-gray-500">
                {field.hint}
              </span>
            )}
          </div>
        )
      })}

      {message && (
        <div
          className={
            message.type === 'error'
              ? 'sid-wilayah-form-error'
              : 'rounded-lg bg-green-50 px-3.5 py-2.5 text-sm font-medium text-green-800'
          }
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}

      <p className="m-0 text-sm text-gray-600">
        Isian yang masih kosong tampil sebagai penanda kuning [ … ] di halaman publik. Nama, alamat,
        telepon, jam layanan, dan email kantor diambil dari Profil Desa.
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <a
          href={PUBLIC_PATHS[section.page]}
          target="_blank"
          rel="noopener noreferrer"
          className="sid-wilayah-btn sid-wilayah-btn-secondary no-underline"
        >
          <ExternalLink size={15} aria-hidden="true" />
          Lihat halaman <span className="sr-only">(tab baru)</span>
        </a>

        <button
          type="submit"
          className="sid-wilayah-btn sid-wilayah-btn-primary"
          disabled={processing}
        >
          <Save size={15} aria-hidden="true" />
          {processing ? 'Menyimpan...' : `Simpan ${section.title}`}
        </button>
      </div>
    </form>
  )
}

export default function KelolaHalamanInfoPage() {
  const [sections, setSections] = useState<InfoPageSection[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const tabsId = useId()

  const load = useCallback(async () => {
    try {
      const response = await getInfoPages()
      const data = response.data?.data ?? []

      setSections(data)
      setActive((current) => current ?? data[0]?.page ?? null)
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memuat halaman informasi.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Muat awal menyinkronkan state dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const handleSaved = (saved: SavedInfoPage) => {
    setSections((current) =>
      current.map((section) =>
        section.page === saved.page
          ? { ...section, fields: saved.fields, updated_at: saved.updated_at }
          : section,
      ),
    )
  }

  // Panah kiri/kanan berpindah tab (pola tablist WAI-ARIA).
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = ({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, number>)[event.key]
    if (!offset) return

    const next = sections[(index + offset + sections.length) % sections.length]
    setActive(next.page)
    document.getElementById(`${tabsId}-tab-${next.page}`)?.focus()
  }

  if (loading) {
    return (
      <div className="sid-kelola-wilayah-page">
        <div className="sid-kelola-wilayah-content">
          <PageLoader label="Memuat halaman informasi..." />
        </div>

        <SiteFooter />
      </div>
    )
  }

  const current = sections.find((section) => section.page === active)

  return (
    <div className="sid-kelola-wilayah-page">
      <div className="sid-kelola-wilayah-content">
        <div className="sid-kelola-wilayah-header">
          <div>
            <span className="sid-kelola-wilayah-eyebrow">Konten Desa</span>

            <h1>Halaman Informasi</h1>

            <p>
              Lengkapi bagian khas desa pada halaman PPID, Kebijakan Privasi, dan Aksesibilitas yang
              ditautkan di footer situs.
            </p>
          </div>
        </div>

        {error && (
          <div className="sid-kelola-wilayah-error" role="alert">
            {error}
          </div>
        )}

        {sections.length > 0 && (
          <>
            {/* Tab sama dengan halaman LPM/Karang Taruna/PKK dan Kelola Wilayah. */}
            <div className="sid-wilayah-tabs" role="tablist" aria-label="Halaman informasi">
              {sections.map((section, index) => (
                <button
                  key={section.page}
                  id={`${tabsId}-tab-${section.page}`}
                  type="button"
                  role="tab"
                  aria-selected={section.page === active}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={section.page === active ? 0 : -1}
                  onClick={() => setActive(section.page)}
                  onKeyDown={(event) => handleTabKey(event, index)}
                  className={`sid-wilayah-tab${section.page === active ? ' sid-wilayah-tab-active' : ''}`}
                >
                  {section.title}
                </button>
              ))}
            </div>

            {current && (
              <div
                id={`${tabsId}-panel`}
                role="tabpanel"
                aria-labelledby={`${tabsId}-tab-${current.page}`}
                className="sid-wilayah-table-card"
              >
                <div className="sid-wilayah-table-toolbar">
                  <div>
                    <h3>Isian halaman {current.title}</h3>
                    <p>{formatUpdated(current.updated_at)}</p>
                  </div>
                </div>

                <div className="sid-wilayah-card-body">
                  <InfoPageForm key={current.page} section={current} onSaved={handleSaved} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
