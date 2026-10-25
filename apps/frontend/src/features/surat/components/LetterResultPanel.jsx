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

function UploadForm({ letterId, resubmit, onDone }) {
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Berkas dipilih bertahap: tiap pilihan menambah daftar (bukan menimpa)
  // sampai batas MAX_FILES; berkas yang sama tidak terdaftar dua kali.
  const addFiles = (event) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''

    setFiles((current) => {
      const known = new Set(current.map((file) => `${file.name}:${file.size}`))
      const fresh = picked.filter((file) => !known.has(`${file.name}:${file.size}`))
      const next = [...current, ...fresh]

      setError(next.length > MAX_FILES ? `Maksimal ${MAX_FILES} berkas per unggahan.` : '')

      return next.slice(0, MAX_FILES)
    })
  }

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, position) => position !== index))
    setError('')
  }

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
      {files.length > 0 && (
        <ul className="sid-result-files" aria-label="Berkas yang akan diunggah">
          {files.map((file, index) => (
            <li key={`${file.name}:${file.size}`}>
              <span>{file.name}</span>
              <button
                type="button"
                className="sid-row-action danger"
                onClick={() => removeFile(index)}
                aria-label={`Hapus ${file.name}`}
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length < MAX_FILES && (
        <label className="sid-btn sid-btn-secondary sid-result-add">
          {files.length === 0 ? 'Pilih berkas' : 'Tambah berkas'}
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            aria-label="Berkas hasil dari instansi"
            className="sr-only"
            onChange={addFiles}
          />
        </label>
      )}
      <p className="sid-upload-description">
        PDF, JPG, atau PNG; maksimal {MAX_FILES} berkas, masing-masing 2 MB. {files.length}/
        {MAX_FILES} berkas dipilih.
      </p>

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      <button type="submit" className="sid-primary-button" disabled={saving || files.length === 0}>
        {saving ? 'Mengunggah...' : resubmit ? 'Unggah ulang' : 'Unggah hasil'}
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

      {/* Dua tombol sama lebar; Tolak aktif setelah alasan diisi. */}
      <div className="sid-result-decision">
        <button
          type="button"
          className="sid-result-decision-button accept"
          disabled={saving}
          onClick={() => decide('accepted')}
        >
          Terima
        </button>
        <button
          type="button"
          className="sid-result-decision-button reject"
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
  // Ditolak (mis. foto buram): unggah ulang di surat ini, tanpa pengajuan baru.
  const rejected = letter.result_stage === 'awaiting_upload' && latest?.status === 'rejected'

  return (
    <section className="sid-modal-note sid-result-panel" aria-label="Hasil dari instansi">
      <p className="sid-modal-note-label">Hasil dari Instansi</p>

      {rejected && (
        <div role="alert" className="sid-result-rejected">
          <p className="sid-result-rejected-title">Unggahan terakhir ditolak desa</p>
          {latest.review_notes && (
            <p className="sid-result-rejected-reason">Alasan: {latest.review_notes}</p>
          )}
          <p>Unggah ulang berkas yang benar di bawah ini; tidak perlu mengajukan ulang.</p>
        </div>
      )}

      <p className="sid-modal-note-text">{STAGE_TEXT[letter.result_stage]}</p>

      {letter.result_stage === 'awaiting_upload' && letter.result_upload_hint && (
        <div className="sid-result-hint">
          <p className="sid-result-hint-label">Yang perlu diunggah</p>
          <p>{letter.result_upload_hint}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="sid-result-history">
          <p className="sid-result-hint-label">Riwayat unggahan</p>
          <ol className="sid-result-history-list">
            {results.map((result) => (
              <li key={result.id} className="sid-result-history-item">
                <div className="sid-result-history-head">
                  <span>{new Date(result.submitted_at).toLocaleString('id-ID')}</span>
                  <span className={`sid-result-status ${result.status}`}>
                    {RESULT_STATUS[result.status] ?? result.status}
                  </span>
                </div>
                {result.review_notes && (
                  <p className="sid-result-history-notes">Alasan: {result.review_notes}</p>
                )}
                <ul className="sid-result-history-files">
                  {(result.attachments ?? []).map((attachment) => (
                    <li key={attachment.id}>
                      <button type="button" onClick={() => onOpenFile(attachment.url)}>
                        {attachment.original_name}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}

      {letter.can_upload_result && (
        <UploadForm letterId={letter.id} resubmit={rejected} onDone={onChanged} />
      )}

      {letter.can_review_result && latest && (
        <ReviewForm letterId={letter.id} resultId={latest.id} onDone={onChanged} />
      )}
    </section>
  )
}
