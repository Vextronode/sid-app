import { useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Check, Search } from 'lucide-react'

import { groupLetterTypes } from '../utils/letterTypeGroups'
import type { LetterType } from '@/types'

// Kolom pencarian baru berguna bila jenis surat cukup banyak.
const SEARCH_THRESHOLD = 6

function LetterTypeMeta({ type }: { type: LetterType }) {
  const needsSignature = (type.signature_slots ?? []).length > 0

  if (!type.validity_days && !needsSignature) return null

  return (
    <span className="sid-letter-type-meta">
      {type.validity_days ? <span>Berlaku {type.validity_days} hari</span> : null}
      {needsSignature && <span>Perlu tanda tangan</span>}
    </span>
  )
}

/**
 * Setelah jenis surat dipilih, daftar menciut dan form muncul: halaman
 * digulir ke atas agar pemohon mulai dari ringkasan jenis surat. Tanpa
 * animasi bila pengguna meminta gerak dikurangi.
 */
function scrollToTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

/**
 * Dokumen yang dibawa ke instansi luar (Layanan Kependudukan): formulir yang
 * terbit dari pengajuan ini, lalu dokumen lain yang perlu dilampirkan.
 */
function CarryDocuments({ documents }: { documents: LetterType['carry_documents'] }) {
  const forms = documents?.forms ?? []
  const attachments = documents?.attachments ?? []

  if (forms.length === 0 && attachments.length === 0) return null

  return (
    <div className="sid-letter-type-carry">
      <p className="sid-letter-type-carry-title">Dokumen yang dibawa ke Disdukcapil</p>
      {forms.length > 0 && (
        <>
          <p className="sid-letter-type-carry-label">
            Formulir yang terbit dari pengajuan ini (dicetak):
          </p>
          <ul>
            {forms.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {attachments.length > 0 && (
        <>
          <p className="sid-letter-type-carry-label">Dokumen lain yang perlu dibawa:</p>
          <ul>
            {attachments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/**
 * Deskripsi kartu dipotong dua baris; bila memang terpotong, muncul tombol
 * "Baca selengkapnya" untuk membukanya. Tombol berada di dalam kartu
 * (label pilihan), jadi kliknya tidak boleh ikut memilih jenis surat.
 */
function LetterTypeDescription({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current

    if (!element || expanded) return undefined

    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1)
    measure()

    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => observer.disconnect()
  }, [text, expanded])

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setExpanded((value) => !value)
  }

  return (
    <>
      <span ref={ref} className={`sid-letter-type-description${expanded ? ' is-expanded' : ''}`}>
        {text}
      </span>
      {(overflowing || expanded) && (
        <button
          type="button"
          className="sid-letter-type-more"
          onClick={toggle}
          aria-expanded={expanded}
        >
          {expanded ? 'Tutup' : 'Baca selengkapnya'}
        </button>
      )}
    </>
  )
}

/**
 * Langkah pertama pengajuan surat: kartu pilihan jenis surat. Setelah
 * dipilih, daftar menciut menjadi ringkasan jenis surat beserta
 * persyaratannya, dengan tombol untuk mengganti pilihan (kecuali `locked`,
 * mis. jenis surat sudah ditentukan dari tautan).
 */
type LetterTypePickerProps = {
  letterTypes: LetterType[]
  loading: boolean
  error: string
  selectedCode: string
  // '' untuk mengganti pilihan.
  onSelect: (code: string) => void
  locked?: boolean
}

export function LetterTypePicker({
  letterTypes,
  loading,
  error,
  selectedCode,
  onSelect,
  locked = false,
}: LetterTypePickerProps) {
  const [query, setQuery] = useState('')
  const selected = letterTypes.find((type) => type.code === selectedCode)

  if (selected) {
    return (
      <div className="sid-letter-type-chosen">
        <div className="sid-letter-type-chosen-head">
          <span className="sid-letter-type-check" aria-hidden="true">
            <Check size={14} strokeWidth={3} />
          </span>

          <div className="sid-letter-type-chosen-text">
            <p className="sid-letter-type-name">{selected.name}</p>
            <LetterTypeMeta type={selected} />
          </div>

          {!locked && (
            <button type="button" onClick={() => onSelect('')} className="sid-letter-type-change">
              Ganti
            </button>
          )}
        </div>

        {selected.description && (
          <p className="sid-letter-type-chosen-description">{selected.description}</p>
        )}

        {selected.requirements_info && (
          <p className="sid-letter-type-requirements">
            <strong>Siapkan:</strong> {selected.requirements_info}
          </p>
        )}

        <CarryDocuments documents={selected.carry_documents} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="sid-letter-type-grid" aria-busy="true" aria-label="Memuat jenis surat">
        {[0, 1, 2, 3].map((key) => (
          <span key={key} className="sid-letter-type-option is-skeleton" aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="sid-admin-alert sid-admin-alert-error" role="alert">
        {error}
      </p>
    )
  }

  const keyword = query.trim().toLowerCase()
  const visibleTypes = keyword
    ? letterTypes.filter((type) =>
        `${type.name} ${type.description ?? ''}`.toLowerCase().includes(keyword),
      )
    : letterTypes

  return (
    <>
      {letterTypes.length > SEARCH_THRESHOLD && (
        <label className="sid-letter-type-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari jenis surat"
            aria-label="Cari jenis surat"
          />
        </label>
      )}

      {letterTypes.length === 0 ? (
        <p className="sid-letter-type-empty">Belum ada jenis surat yang bisa diajukan.</p>
      ) : visibleTypes.length === 0 ? (
        <p className="sid-letter-type-empty">
          Tidak ada jenis surat yang cocok dengan &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <div className="sid-letter-type-groups" role="radiogroup" aria-label="Jenis surat">
          {groupLetterTypes(visibleTypes).map((group) => (
            <section
              key={group.key}
              className="sid-letter-type-group"
              aria-labelledby={`letter-type-group-${group.key}`}
            >
              <h4 id={`letter-type-group-${group.key}`} className="sid-letter-type-group-title">
                {group.label}
              </h4>

              <div className="sid-letter-type-grid">
                {group.types.map((type) => (
                  <label key={type.id} className="sid-letter-type-option">
                    <input
                      type="radio"
                      name="letter-type"
                      value={type.code}
                      checked={false}
                      onChange={() => {
                        onSelect(type.code)
                        scrollToTop()
                      }}
                      className="sr-only"
                    />
                    <span className="sid-letter-type-name">{type.name}</span>
                    {type.description && <LetterTypeDescription text={type.description} />}
                    <LetterTypeMeta type={type} />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
