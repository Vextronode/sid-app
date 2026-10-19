import { useState } from 'react'
import { Check, Search } from 'lucide-react'

// Kolom pencarian baru berguna bila jenis surat cukup banyak.
const SEARCH_THRESHOLD = 6

function LetterTypeMeta({ type }) {
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
 * Langkah pertama pengajuan surat: kartu pilihan jenis surat. Setelah
 * dipilih, daftar menciut menjadi ringkasan jenis surat beserta
 * persyaratannya, dengan tombol untuk mengganti pilihan.
 */
export function LetterTypePicker({ letterTypes, loading, error, selectedCode, onSelect }) {
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

          <button type="button" onClick={() => onSelect('')} className="sid-letter-type-change">
            Ganti
          </button>
        </div>

        {selected.requirements_info && (
          <p className="sid-letter-type-requirements">
            <strong>Siapkan:</strong> {selected.requirements_info}
          </p>
        )}
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
        <div className="sid-letter-type-grid" role="radiogroup" aria-label="Jenis surat">
          {visibleTypes.map((type) => (
            <label key={type.id} className="sid-letter-type-option">
              <input
                type="radio"
                name="letter-type"
                value={type.code}
                checked={false}
                onChange={() => onSelect(type.code)}
                className="sr-only"
              />
              <span className="sid-letter-type-name">{type.name}</span>
              {type.description && (
                <span className="sid-letter-type-description">{type.description}</span>
              )}
              <LetterTypeMeta type={type} />
            </label>
          ))}
        </div>
      )}
    </>
  )
}
