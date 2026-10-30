import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { useLocation } from 'react-router-dom'
import ImageFilePicker, { ImagePreviewStage } from '@/components/ui/ImageFilePicker'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { SIGNATURE_CARD_ANCHOR } from '@/features/notifikasi/utils/notificationTarget'
import { STAF_APP_LABEL } from '@/lib/constants/app'
import {
  getMySignature,
  getMySignatureImage,
  requestSignatureReset,
  saveMySignature,
} from '../api/signatureApi'
import type { MySignatureStatus } from '../api/signatureApi'
import { promptDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'

const PAD_WIDTH = 480
const PAD_HEIGHT = 180

/**
 * Tanda tangan pribadi akun. Diisi sekali (digambar atau diunggah) dengan
 * pratinjau dan konfirmasi; setelah tersimpan tidak dapat diubah sendiri.
 * Pemilik akun dapat mengajukan reset ke Staf SIDUTama (STAF_APP_LABEL);
 * Staf SIDUTama sendiri mereset lewat Manajemen Pengguna.
 */
export function SignatureCard() {
  const { user } = useAuth()
  const { hash } = useLocation()
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [requesting, setRequesting] = useState(false)
  const [status, setStatus] = useState<MySignatureStatus | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [draft, setDraft] = useState<File | null>(null)
  const [draftUrl, setDraftUrl] = useState('')
  const [hasStrokes, setHasStrokes] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let objectUrl = ''

    getMySignature()
      .then(async (data) => {
        if (!active) return

        setStatus(data)

        if (data?.has_signature) {
          objectUrl = URL.createObjectURL(await getMySignatureImage())

          if (active) setImageUrl(objectUrl)
        }
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Gagal memuat tanda tangan.'))
      })

    return () => {
      active = false

      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [])

  useEffect(
    () => () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl)
    },
    [draftUrl],
  )

  // Dibuka dari notifikasi keputusan reset: gulir ke kartu ini.
  useEffect(() => {
    if (status !== null && hash === `#${SIGNATURE_CARD_ANCHOR}`) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [status, hash])

  const handleRequestReset = async () => {
    const reason = await promptDialog({
      title: 'Ajukan reset tanda tangan?',
      message: `Pengajuan dikirim ke ${STAF_APP_LABEL}. Bila disetujui, tanda tangan Anda dikosongkan dan dapat diisi kembali.`,
      label: 'Alasan pengajuan (minimal 5 karakter)',
      minLength: 5,
      confirmLabel: 'Kirim Pengajuan',
    })

    if (reason === null) return

    setRequesting(true)
    setError('')

    try {
      const response = await requestSignatureReset(reason.trim())

      setStatus((current) => ({ ...current, reset_request: response.data }))
      notifySuccess(response.message ?? 'Pengajuan reset tanda tangan terkirim.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal mengirim pengajuan reset tanda tangan.'))
    } finally {
      setRequesting(false)
    }
  }

  const pointerPosition = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const startStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    const context = canvasRef.current.getContext('2d')
    const { x, y } = pointerPosition(event)

    drawingRef.current = true
    context.lineWidth = 2.5
    context.lineCap = 'round'
    context.strokeStyle = '#111827'
    context.beginPath()
    context.moveTo(x, y)
  }

  const continueStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return

    const context = canvasRef.current.getContext('2d')
    const { x, y } = pointerPosition(event)

    context.lineTo(x, y)
    context.stroke()
    setHasStrokes(true)
  }

  const endStroke = () => {
    drawingRef.current = false
  }

  const clearPad = () => {
    const canvas = canvasRef.current

    canvas?.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  const setDraftFile = (file: File | null) => {
    setDraft(file)
    setDraftUrl(file ? URL.createObjectURL(file) : '')
    setError('')
  }

  const useDrawing = () => {
    canvasRef.current.toBlob((blob) => {
      if (blob) setDraftFile(new File([blob], 'tanda-tangan.png', { type: 'image/png' }))
    }, 'image/png')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const response = await saveMySignature(draft)

      setStatus(response.data)
      setImageUrl(draftUrl)
      setDraft(null)
      setDraftUrl('')
      notifySuccess('Tanda tangan berhasil disimpan.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal menyimpan tanda tangan.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      ref={sectionRef}
      id={SIGNATURE_CARD_ANCHOR}
      className="sid-card"
      aria-labelledby="signature-card-heading"
    >
      <h2 id="signature-card-heading" className="sid-section-title">
        Tanda Tangan
      </h2>

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      {status === null && !error && <p>Memuat tanda tangan...</p>}

      {status?.has_signature && (
        <div className="sid-signature-body">
          <ImagePreviewStage src={imageUrl} alt="Tanda tangan Anda" emptyText="Memuat..." />

          {user?.role === 'staf_sid' ? (
            <p className="sid-upload-description">
              Tanda tangan sudah tersimpan dan tidak dapat diubah. Atur ulang lewat Manajemen
              Pengguna bila perlu diganti.
            </p>
          ) : status.reset_request ? (
            <p className="sid-upload-description" role="status">
              Pengajuan reset tanda tangan Anda sedang diproses {STAF_APP_LABEL}. Anda akan mendapat
              notifikasi setelah diputuskan.
            </p>
          ) : (
            <>
              <p className="sid-upload-description">
                Tanda tangan sudah tersimpan dan tidak dapat diubah sendiri. Bila perlu diganti,
                ajukan reset ke {STAF_APP_LABEL}.
              </p>
              <div className="sid-actions">
                <button
                  type="button"
                  className="sid-btn sid-btn-secondary"
                  onClick={handleRequestReset}
                  disabled={requesting}
                >
                  {requesting ? 'Mengirim...' : 'Ajukan Reset TTD'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {status && !status.has_signature && !draft && (
        <div className="sid-signature-body">
          <p className="sid-upload-description">
            Tanda tangan dipakai pada surat yang Anda ajukan atau yang Anda setujui untuk orang
            lain. Tanda tangan hanya dapat diisi satu kali.
          </p>

          <canvas
            ref={canvasRef}
            width={PAD_WIDTH}
            height={PAD_HEIGHT}
            aria-label="Area menggambar tanda tangan"
            className="sid-signature-pad"
            onPointerDown={startStroke}
            onPointerMove={continueStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
          />

          <div className="sid-actions">
            <button type="button" className="sid-btn sid-btn-secondary" onClick={clearPad}>
              Hapus
            </button>
            <button
              type="button"
              className="sid-btn sid-btn-primary"
              onClick={useDrawing}
              disabled={!hasStrokes}
            >
              Pakai Gambar Ini
            </button>
          </div>

          <p className="sid-signature-divider">atau</p>

          <ImageFilePicker
            id="signature-upload"
            title="Unggah gambar tanda tangan"
            hint="PNG atau JPG. Maks. 512 KB."
            accept=".png,.jpg,.jpeg"
            onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {draft && (
        <div className="sid-signature-body">
          <span className="sid-label">Pratinjau</span>
          <ImagePreviewStage src={draftUrl} alt="Pratinjau tanda tangan" />
          <p className="sid-form-field-error" role="status">
            Periksa kembali. Setelah disimpan, tanda tangan tidak dapat Anda ubah sendiri.
          </p>
          <div className="sid-actions">
            <button
              type="button"
              className="sid-btn sid-btn-secondary"
              onClick={() => setDraftFile(null)}
              disabled={saving}
            >
              Ulangi
            </button>
            <button
              type="button"
              className="sid-btn sid-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
