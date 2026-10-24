import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import {
  downloadProtectedFile,
  getLetterDetail,
  openProtectedFile,
  supportingDocumentUrl,
} from '../api/letterExtrasApi'
import { refillLetterSignature } from '../api/signatureApi'
import { FulfillmentPanel } from './FulfillmentPanel'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

const FULFILLMENT_ROLES = ['kasi_pemerintahan', 'kaur_tu_umum', 'staf_sid']

const SIGNATURE_STATUS_LABELS = {
  signed: 'Sudah ditandatangani',
  pending: 'Menunggu persetujuan pemilik NIK',
  rejected: 'Ditolak',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
}

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

function SignatureRefill({ letterId, slot, onDone }) {
  const [mode, setMode] = useState('digital')
  const [nik, setNik] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
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
      setError(serverMessage(requestError, 'Gagal memperbarui tanda tangan.'))
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
export function LetterExtrasPanel({ letterId }) {
  const { user } = useAuth()
  const [letter, setLetter] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLetter(await getLetterDetail(letterId))
      setError('')
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal memuat rincian surat.'))
    }
  }, [letterId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const openFile = async (action) => {
    try {
      await action()
      setError('')
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal membuka berkas.'))
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
      const option = (field.options ?? []).find((item) => String(item.value) === String(raw))

      return { name: field.name, label: field.label, value: option?.label ?? raw }
    })
    .filter((item) => item.value !== undefined && item.value !== null && item.value !== '')
  const isOwner = letter.submitted_by === user?.id
  const canRefill = isOwner && letter.awaiting_signatures
  const canFulfill = FULFILLMENT_ROLES.includes(user?.role) && letter.needs_fulfillment
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
          Surat ini belum diproses karena masih menunggu tanda tangan pihak terkait.
        </p>
      )}

      {signatures.length > 0 && (
        <section className="sid-modal-note" aria-label="Tanda tangan">
          <p className="sid-modal-note-label">Tanda Tangan</p>
          <ul className="sid-modal-note-text">
            {signatures.map((slot) => (
              <li key={slot.slot_key}>
                <strong>{slot.slot_label}</strong> —{' '}
                {SIGNATURE_STATUS_LABELS[slot.status] ?? slot.status}
                {slot.signer_name ? ` (${slot.signer_name})` : ''}
                {slot.method === 'wet' && slot.status === 'signed' ? ', tanda tangan basah' : ''}
                {canRefill && slot.signer_type === 'other' && slot.status !== 'signed' && (
                  <SignatureRefill letterId={letter.id} slot={slot} onDone={load} />
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
                  downloadProtectedFile(documentUrl, `dokumen-pendukung-${letter.id}.pdf`, {
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
                  {fieldLabels[attachment.field] ?? attachment.original_name}
                </button>
                {attachment.kind === 'wet_signature' && ' (dokumen ber-tanda tangan basah)'}
              </li>
            ))}
          </ul>
        </section>
      )}

      {canFulfill && <FulfillmentPanel letterId={letter.id} onApplied={load} />}

      {!canFulfill && letter.fulfilled_at && (
        <section className="sid-modal-note" aria-label="Perubahan data">
          <p className="sid-modal-note-label">Perubahan Data</p>
          <p className="sid-modal-note-text">
            Perubahan data kependudukan dari surat ini telah diterapkan pada{' '}
            {new Date(letter.fulfilled_at).toLocaleString('id-ID')}.
          </p>
        </section>
      )}
    </>
  )
}
