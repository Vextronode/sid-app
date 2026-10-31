import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Id, Letter, LetterSignature } from '@/types'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { downloadFile, openProtectedFile } from '@/lib/downloadFile'
import { getLetterDetail, supportingDocumentUrl } from '../api/letterExtrasApi'
import { refillLetterSignature } from '../api/signatureApi'
import { FulfillmentPanel } from './FulfillmentPanel'
import { LetterResultPanel } from './LetterResultPanel'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'

// Terapkan hanya oleh Kasi/Kaur yang ditugaskan; Staf SIDUTama mengubah
// data lewat Data Penduduk.
const FULFILLMENT_ROLES = ['kasi_pemerintahan', 'kaur_tu_umum']

// Cara saksi tercatat (signer_type witness).
const WITNESS_METHOD_LABELS: Record<string, string> = {
  consent: 'disetujui lewat akun',
  rt_check: 'warga tanpa akun, perlu verifikasi RT',
  manual: 'di luar data penduduk, diisi pemohon',
}

// Saksi tidak menandatangani: status menyesuaikan.
const WITNESS_STATUS_LABELS: Record<string, string> = {
  signed: 'Tercatat',
  pending: 'Menunggu persetujuan saksi',
}

const SIGNATURE_STATUS_LABELS: Record<string, string> = {
  signed: 'Sudah ditandatangani',
  pending: 'Menunggu persetujuan pemilik NIK',
  rejected: 'Ditolak',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
}

type RefillProps = { letterId: Id; slot: LetterSignature; onDone: () => void }

/**
 * Ganti saksi yang menolak/kedaluwarsa: NIK baru (nama diketik bila NIK di
 * luar data penduduk). Warga desa ber-akun diminta persetujuan lagi.
 */
function WitnessRefill({ letterId, slot, onDone }: RefillProps) {
  const [nik, setNik] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await refillLetterSignature(letterId, slot.slot_key, { nik, name })
      notifySuccess('Saksi diperbarui.')
      onDone()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memperbarui saksi.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        className="sid-input"
        inputMode="numeric"
        maxLength={16}
        aria-label={`NIK ${slot.slot_label} baru`}
        placeholder="NIK saksi baru (16 digit)"
        value={nik}
        onChange={(event) => setNik(event.target.value)}
      />
      <input
        className="sid-input"
        aria-label={`Nama ${slot.slot_label} baru`}
        placeholder="Nama saksi (isi bila NIK tidak terdaftar di desa)"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      <button type="submit" className="sid-primary-button" disabled={saving || nik.length !== 16}>
        {saving ? 'Mengirim...' : 'Ganti saksi'}
      </button>
    </form>
  )
}

function SignatureRefill({ letterId, slot, onDone }: RefillProps) {
  const [mode, setMode] = useState('digital')
  const [nik, setNik] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const confirmed = await confirmDialog(
      mode === 'wet'
        ? {
            title: 'Unggah tanda tangan basah?',
            message: `Dokumen tanda tangan atas nama ${name || 'penanda tangan'} akan dipakai pada surat ini.`,
            confirmLabel: 'Unggah',
            tone: 'primary',
          }
        : {
            title: 'Kirim permintaan tanda tangan?',
            message: `Permintaan dikirim ke warga ber-NIK ${nik}. Surat diproses setelah ia menyetujuinya.`,
            confirmLabel: 'Kirim',
            tone: 'primary',
          },
    )

    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await refillLetterSignature(
        letterId,
        slot.slot_key,
        mode === 'wet' ? { name, file } : { nik },
      )
      notifySuccess(
        mode === 'wet'
          ? 'Tanda tangan basah berhasil diunggah.'
          : 'Permintaan tanda tangan berhasil dikirim.',
      )
      onDone()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memperbarui tanda tangan.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={mode === 'digital'}
          onChange={() => setMode('digital')}
          name={`refill-${slot.slot_key}`}
        />
        <span>Minta lewat NIK</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={mode === 'wet'}
          onChange={() => setMode('wet')}
          name={`refill-${slot.slot_key}`}
        />
        <span>Unggah dokumen ber-tanda tangan basah</span>
      </label>

      {mode === 'digital' ? (
        <input
          className="sid-input"
          inputMode="numeric"
          maxLength={16}
          aria-label={`NIK ${slot.slot_label}`}
          placeholder="NIK (16 digit)"
          value={nik}
          onChange={(event) => setNik(event.target.value)}
        />
      ) : (
        <>
          <input
            className="sid-input"
            aria-label={`Nama ${slot.slot_label}`}
            placeholder="Nama lengkap penanda tangan"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            aria-label={`Dokumen ${slot.slot_label}`}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </>
      )}

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="sid-primary-button"
        disabled={saving || (mode === 'digital' ? nik.length !== 16 : !name || !file)}
      >
        {saving ? 'Mengirim...' : 'Kirim'}
      </button>
    </form>
  )
}

/**
 * Bagian detail surat yang berasal dari paket lampiran, tanda tangan,
 * dokumen pendukung, dan aksi data. Memuat detail surat sendiri supaya
 * dapat ditempel di modal mana pun (warga, approver, operator).
 */
export function LetterExtrasPanel({ letterId }: { letterId: Id }) {
  const { user } = useAuth()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [error, setError] = useState('')
  // Hasil instansi baru diterima: Terapkan langsung dimulai (pop up perubahan).
  const [resultAccepted, setResultAccepted] = useState(false)

  const load = useCallback(async () => {
    try {
      setLetter(await getLetterDetail(letterId))
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memuat rincian surat.'))
    }
  }, [letterId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const openFile = async (action: () => Promise<unknown>) => {
    try {
      await action()
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal membuka berkas.'))
    }
  }

  if (!letter) {
    return error ? (
      <p role="alert" className="sid-warning-box">
        {error}
      </p>
    ) : null
  }

  const signatures = letter.signatures ?? []
  const attachments = letter.attachments ?? []
  // Berkas isian ditampilkan dengan label isiannya (mis. "Foto Usaha Terkini").
  const fieldLabels = Object.fromEntries(
    (letter.letter_type?.form_fields ?? []).map((field) => [field.name, field.label]),
  )
  // Isian form pemohon, dengan label dari definisi jenis surat.
  const formValues = (letter.letter_type?.form_fields ?? [])
    .filter((field) => field.type !== 'file')
    .map((field) => {
      const raw = letter.payload?.[field.name]

      // Isian berulang: satu baris per entri (anggota KK memakai nama).
      if (Array.isArray(raw)) {
        const value = raw
          .map(
            (row) =>
              row?.nama ??
              // Baris berisi anggota KK: tampilkan namanya, bukan id warga.
              Object.entries(row ?? {}).find(([key]) => key.endsWith('_nama'))?.[1] ??
              Object.values(row ?? {})
                .filter((cell) => cell !== '' && cell !== null)
                .join(' / '),
          )
          .join('; ')

        return { name: field.name, label: field.label, value }
      }

      // Anggota KK: tampilkan namanya, bukan id warga.
      if (field.type === 'family_member' && letter.payload?.[`${field.name}_nama`]) {
        return {
          name: field.name,
          label: field.label,
          value: String(letter.payload[`${field.name}_nama`]),
        }
      }

      // Wilayah desa: tampilkan label yang disimpan saat pengajuan.
      if (field.type === 'village_area' && letter.payload?.[`${field.name}_rt`]) {
        const p = letter.payload
        const value = `Dusun ${p[`${field.name}_dusun`]}, RW ${p[`${field.name}_rw`]}, RT ${p[`${field.name}_rt`]}`

        return { name: field.name, label: field.label, value }
      }

      const option = (field.options ?? []).find((item) => String(item.value) === String(raw))
      // Selain repeater, isian form berupa teks atau angka.
      const scalar = raw as string | number | null | undefined

      return { name: field.name, label: field.label, value: option?.label ?? scalar }
    })
    .filter((item) => item.value !== undefined && item.value !== null && item.value !== '')
  const isOwner = letter.submitted_by === user?.id
  const canRefill = isOwner && letter.awaiting_signatures
  // can_fulfill dari backend: hanya Kasi/Kaur sesuai assigned_role.
  const canFulfill =
    Boolean(user && FULFILLMENT_ROLES.includes(user.role)) &&
    letter.needs_fulfillment &&
    letter.can_fulfill !== false
  const documentUrl = supportingDocumentUrl(letter.id)

  return (
    <>
      {error && (
        <p role="alert" className="sid-warning-box">
          {error}
        </p>
      )}

      {letter.awaiting_signatures && (
        <p className="sid-warning-box" role="status">
          Surat ini belum diproses karena masih menunggu tanda tangan atau persetujuan saksi.
        </p>
      )}

      {signatures.length > 0 && (
        <section className="sid-modal-note" aria-label="Tanda tangan">
          <p className="sid-modal-note-label">Tanda Tangan &amp; Saksi</p>
          <ul className="sid-modal-note-text">
            {signatures.map((slot) => (
              <li key={slot.slot_key}>
                <strong>{slot.slot_label}</strong> -{' '}
                {(slot.signer_type === 'witness' && WITNESS_STATUS_LABELS[slot.status]) ||
                  SIGNATURE_STATUS_LABELS[slot.status] ||
                  slot.status}
                {slot.signer_name ? ` (${slot.signer_name})` : ''}
                {slot.method === 'wet' && slot.status === 'signed' ? ', tanda tangan basah' : ''}
                {slot.signer_type === 'witness' && slot.status === 'signed'
                  ? `, ${WITNESS_METHOD_LABELS[slot.method] ?? slot.method}`
                  : ''}
                {canRefill && slot.signer_type === 'other' && slot.status !== 'signed' && (
                  <SignatureRefill letterId={letter.id} slot={slot} onDone={load} />
                )}
                {canRefill &&
                  slot.signer_type === 'witness' &&
                  ['rejected', 'expired', 'cancelled'].includes(slot.status) && (
                    <WitnessRefill letterId={letter.id} slot={slot} onDone={load} />
                  )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {formValues.length > 0 && (
        <section className="sid-modal-note" aria-label="Isian surat">
          <p className="sid-modal-note-label">Isian Surat</p>
          <ul className="sid-modal-note-text">
            {formValues.map((item) => (
              <li key={item.name}>
                <strong>{item.label}:</strong> {item.value}
              </li>
            ))}
          </ul>
        </section>
      )}

      {letter.has_supporting_document && (
        <section className="sid-modal-note" aria-label="Dokumen pendukung">
          <p className="sid-modal-note-label">Dokumen Pendukung</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="sid-btn sid-btn-secondary"
              onClick={() => openFile(() => openProtectedFile(documentUrl))}
            >
              Lihat
            </button>
            <button
              type="button"
              className="sid-btn sid-btn-secondary"
              onClick={() =>
                openFile(() =>
                  downloadFile(documentUrl, `dokumen-pendukung-${letter.id}.pdf`, {
                    download: 1,
                  }),
                )
              }
            >
              Unduh
            </button>
          </div>
        </section>
      )}

      {attachments.length > 0 && (
        <section className="sid-modal-note" aria-label="Lampiran">
          <p className="sid-modal-note-label">Lampiran</p>
          <ul className="sid-modal-note-text">
            {attachments.map((attachment) => (
              <li key={attachment.id}>
                <button
                  type="button"
                  className="underline"
                  onClick={() => openFile(() => openProtectedFile(attachment.url))}
                >
                  {(attachment.field ? fieldLabels[attachment.field] : undefined) ??
                    attachment.original_name}
                </button>
                {attachment.kind === 'wet_signature' && ' (dokumen ber-tanda tangan basah)'}
              </li>
            ))}
          </ul>
        </section>
      )}

      {letter.result_stage && (
        <LetterResultPanel
          letter={letter}
          onChanged={(decision) => {
            setResultAccepted(decision === 'accepted')
            void load()
          }}
          onOpenFile={(url) => openFile(() => openProtectedFile(url))}
        />
      )}

      {canFulfill && (
        <FulfillmentPanel letterId={letter.id} onApplied={load} autoStart={resultAccepted} />
      )}

      {!canFulfill && letter.fulfilled_at && (
        <section className="sid-modal-note" aria-label="Perubahan data">
          <p className="sid-modal-note-label">Perubahan Data</p>
          <p className="sid-modal-note-text">
            Perubahan data kependudukan dari surat ini telah diselesaikan pada{' '}
            {new Date(letter.fulfilled_at).toLocaleString('id-ID')}.
          </p>
        </section>
      )}
    </>
  )
}
