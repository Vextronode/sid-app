import { useState } from 'react'

import { reviewLetterResult, submitLetterResult } from '../api/letterExtrasApi'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'

const MAX_FILES = 5

const STAGE_TEXT = {
  awaiting_upload: 'Unduh formulir, bawa ke instansi yang dituju, lalu unggah hasilnya di sini.',
  under_review: 'Hasil sudah diunggah dan menunggu verifikasi desa.',
  accepted: 'Hasil dari instansi sudah diverifikasi desa.',
}

const RESULT_STATUS = {
  submitted: 'Menunggu verifikasi',
  accepted: 'Diterima',
  rejected: 'Ditolak',
}

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

function UploadForm({ letterId, onDone }) {
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    const confirmed = await confirmDialog({
      title: 'Unggah hasil dari instansi?',
      message: `${files.length} berkas akan dikirim ke desa untuk diverifikasi.`,
      confirmLabel: 'Unggah',
      tone: 'primary',
    })

    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await submitLetterResult(letterId, files)
      notifySuccess('Hasil berhasil diunggah dan menunggu verifikasi.')
      setFiles([])
      onDone()
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal mengunggah hasil.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        aria-label="Berkas hasil dari instansi"
        onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, MAX_FILES))}
      />
      <p className="sid-upload-description">
        PDF, JPG, atau PNG; maksimal {MAX_FILES} berkas, masing-masing 2 MB.
      </p>

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      <button type="submit" className="sid-primary-button" disabled={saving || files.length === 0}>
        {saving ? 'Mengunggah...' : 'Unggah hasil'}
      </button>
    </form>
  )
}

function ReviewForm({ letterId, resultId, onDone }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const decide = async (decision) => {
    const accepted = decision === 'accepted'
    const confirmed = await confirmDialog({
      title: accepted ? 'Terima hasil dari instansi?' : 'Tolak hasil dari instansi?',
      message: accepted
        ? 'Hasil dianggap sah. Bila jenis surat ini mengubah data, lanjutkan dengan Terapkan.'
        : 'Pemohon akan diminta mengunggah ulang sesuai alasan penolakan.',
      confirmLabel: accepted ? 'Terima' : 'Tolak',
      tone: accepted ? 'primary' : 'danger',
    })

    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await reviewLetterResult(letterId, resultId, decision, notes.trim())
      notifySuccess(accepted ? 'Hasil diterima.' : 'Hasil ditolak.')
      onDone()
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal menyimpan verifikasi.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="sid-textarea"
        aria-label="Catatan verifikasi"
        placeholder="Alasan bila ditolak (wajib), mis. berkas buram atau bukan dokumen yang diminta"
        maxLength={500}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="sid-primary-button"
          disabled={saving}
          onClick={() => decide('accepted')}
        >
          Terima
        </button>
        <button
          type="button"
          className="sid-btn sid-btn-secondary"
          disabled={saving || notes.trim() === ''}
          onClick={() => decide('rejected')}
        >
          Tolak
        </button>
      </div>
    </div>
  )
}

/**
 * Tahap setelah formulir pelayanan terbit: pemohon mengunggah hasil dari
 * instansi luar di surat yang sama, lalu desa menerima atau menolaknya.
 */
export function LetterResultPanel({ letter, onChanged, onOpenFile }) {
  const results = letter.results ?? []
  const latest = results[results.length - 1]

  return (
    <section className="sid-modal-note" aria-label="Hasil dari instansi">
      <p className="sid-modal-note-label">Hasil dari Instansi</p>
      <p className="sid-modal-note-text">
        {STAGE_TEXT[letter.result_stage]}
        {letter.result_stage === 'awaiting_upload' && letter.result_upload_hint && (
          <>
            {' '}
            <strong>Yang diunggah:</strong> {letter.result_upload_hint}
          </>
        )}
      </p>

      {results.length > 0 && (
        <ul className="sid-modal-note-text">
          {results.map((result) => (
            <li key={result.id}>
              <strong>{new Date(result.submitted_at).toLocaleString('id-ID')}</strong> —{' '}
              {RESULT_STATUS[result.status] ?? result.status}
              {result.review_notes ? `: ${result.review_notes}` : ''}
              <ul>
                {(result.attachments ?? []).map((attachment) => (
                  <li key={attachment.id}>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => onOpenFile(attachment.url)}
                    >
                      {attachment.original_name}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {letter.can_upload_result && <UploadForm letterId={letter.id} onDone={onChanged} />}

      {letter.can_review_result && latest && (
        <ReviewForm letterId={letter.id} resultId={latest.id} onDone={onChanged} />
      )}
    </section>
  )
}
