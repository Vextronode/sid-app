import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Id, Letter, LetterFormField } from '@/types'
import { openProtectedFile } from '@/lib/downloadFile'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import { GENDER_LABELS, labelOf, MARITAL_STATUS_LABELS, RELIGION_LABELS } from '@/shared/lib/labels'
import { getLetterDetail } from '../api/letterExtrasApi'

type Row = { label: string; value: ReactNode }
type Block = { title: string | null; rows: Row[] }
type Section = { title: string; blocks: Block[] }

const DEFAULT_SECTION = 'Isian'

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const isEmpty = (value: unknown) =>
  value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)

/** Nilai satu isian siap baca: label pilihan, tanggal panjang, teks apa adanya. */
function displayValue(field: LetterFormField, raw: unknown): ReactNode {
  if (isEmpty(raw)) return null

  if (field.type === 'select') {
    return (
      (field.options ?? []).find((option) => String(option.value) === String(raw))?.label ??
      String(raw)
    )
  }

  if (field.type === 'date') return formatDate(raw)

  return typeof raw === 'object' ? null : String(raw)
}

/** Data diri pemohon dari data penduduk (jawaban form bila datanya kosong). */
function identityRows(letter: Letter): Row[] {
  const citizen = letter.citizen
  const payload = letter.payload ?? {}
  const birth = [citizen?.place_of_birth, formatDate(citizen?.date_of_birth)]
    .filter(Boolean)
    .join(', ')
  const religion = citizen?.religion ?? (payload.agama as string | undefined)
  const marital = citizen?.marital_status ?? (payload.status_perkawinan as string | undefined)
  const gender = citizen?.gender ?? (payload.jenis_kelamin_pemohon as string | undefined)

  return [
    { label: 'Nama Lengkap', value: letter.applicant_name ?? citizen?.name },
    { label: 'NIK', value: letter.applicant_nik_masked },
    { label: 'Tempat, Tanggal Lahir', value: birth || null },
    { label: 'Jenis Kelamin', value: gender ? labelOf(GENDER_LABELS, gender) : null },
    { label: 'Agama', value: religion ? labelOf(RELIGION_LABELS, religion) : null },
    {
      label: 'Status Perkawinan',
      value: marital ? labelOf(MARITAL_STATUS_LABELS, marital) : null,
    },
    { label: 'Nama Ibu Kandung', value: citizen?.mother_name ?? citizen?.mother_name_text },
    { label: 'Alamat', value: citizen?.address },
    {
      label: 'RT/RW',
      value:
        citizen?.rt?.number != null ? `${citizen.rt.number}/${citizen?.rw?.number ?? '-'}` : null,
    },
    { label: 'Dusun', value: citizen?.hamlet?.name },
  ].map((row) => ({ ...row, value: row.value || '-' }))
}

/**
 * Rincian isian pengajuan layanan pendataan (letter_types.produces_letter =
 * false, mis. CPMI F11), pengganti pratinjau surat di modal: per section
 * form, satu isian per baris, baris berulang (sertifikat, pengalaman kerja)
 * dipecah per entri, dan dokumen unggahan bisa dibuka. Jenis surat lain
 * tetap memakai pratinjau surat.
 */
export function FormAnswersReview({ letterId }: { letterId: Id }) {
  const [letter, setLetter] = useState<Letter | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getLetterDetail(letterId)
      .then((data) => {
        if (active) setLetter(data)
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Gagal memuat rincian pengajuan.'))
      })

    return () => {
      active = false
    }
  }, [letterId])

  const openFile = async (url: string) => {
    try {
      await openProtectedFile(url)
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal membuka dokumen.'))
    }
  }

  if (!letter) {
    return error ? (
      <p role="alert" className="sid-warning-box">
        {error}
      </p>
    ) : (
      <p className="sid-dossier-muted">Memuat rincian pengajuan...</p>
    )
  }

  const payload = letter.payload ?? {}
  const fields = letter.letter_type?.form_fields ?? []
  const attachments = (letter.attachments ?? []).filter((item) => item.kind === 'field')
  const sections: Section[] = []
  const sectionOf = (title: string) => {
    let section = sections.find((item) => item.title === title)

    if (!section) {
      section = { title, blocks: [{ title: null, rows: [] }] }
      sections.push(section)
    }

    return section
  }

  fields.forEach((field, index) => {
    const section = sectionOf(field.section ?? DEFAULT_SECTION)
    const rows = section.blocks[0].rows
    const raw = payload[field.name]

    // Data diri dari data penduduk tampil di awal section pertama; isian
    // yang hanya menanyakan data penduduk yang kosong ikut di sana.
    if (index === 0 && field.section) rows.push(...identityRows(letter))
    if (field.from_applicant) return

    if (field.type === 'file') {
      const attachment = attachments.find((item) => item.field === field.name)

      rows.push({
        label: field.label ?? field.name,
        value: attachment ? (
          <button type="button" className="underline" onClick={() => void openFile(attachment.url)}>
            Lihat dokumen
          </button>
        ) : (
          'Tidak diunggah'
        ),
      })

      return
    }

    if (field.type === 'repeater') {
      const entries = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []

      if (entries.length === 0) {
        rows.push({ label: field.label ?? field.name, value: 'Tidak ada' })

        return
      }

      entries.forEach((entry, entryIndex) => {
        section.blocks.push({
          title: `${field.label ?? field.name} ${entryIndex + 1}`,
          rows: (field.fields ?? []).map((sub) => ({
            label: sub.label ?? sub.name,
            value: displayValue(sub, entry?.[sub.name]) ?? '-',
          })),
        })
      })
      // Isian sesudah repeater kembali ke daftar utama section.
      section.blocks.push({ title: null, rows: [] })

      return
    }

    if (field.type === 'family_member') {
      const name = payload[`${field.name}_nama`]

      if (isEmpty(name)) return

      rows.push({ label: field.label ?? field.name, value: String(name) })

      if (field.relation_hint && !isEmpty(payload[`${field.name}_alamat`])) {
        rows.push({ label: 'Alamat', value: String(payload[`${field.name}_alamat`]) })
      }

      return
    }

    const value = displayValue(field, raw)

    if (value !== null) rows.push({ label: field.label ?? field.name, value })
  })

  return (
    <div className="sid-form-review" aria-label="Rincian isian pengajuan">
      <p className="sid-form-review-note">
        Layanan ini tidak menerbitkan surat. Periksa rincian dan dokumen di bawah; setelah disetujui
        Kepala Desa, data tersimpan di desa.
      </p>

      {error && (
        <p role="alert" className="sid-warning-box">
          {error}
        </p>
      )}

      {sections.map((section) => (
        <section key={section.title} className="sid-form-review-section">
          <h3 className="sid-form-subsection-title">{section.title}</h3>

          {section.blocks
            .filter((block) => block.rows.length > 0)
            .map((block, blockIndex) => (
              <div
                key={`${block.title ?? 'utama'}-${blockIndex}`}
                className="sid-form-review-block"
              >
                {block.title && <p className="sid-form-review-block-title">{block.title}</p>}
                <dl className="sid-form-review-list">
                  {block.rows.map((row, rowIndex) => (
                    <div key={`${row.label}-${rowIndex}`} className="sid-form-review-row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
        </section>
      ))}
    </div>
  )
}
