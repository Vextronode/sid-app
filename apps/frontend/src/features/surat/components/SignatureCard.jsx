import { useEffect, useRef, useState } from 'react'
import { getMySignature, getMySignatureImage, saveMySignature } from '../api/signatureApi'

const PAD_WIDTH = 480
const PAD_HEIGHT = 180

function serverMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]

    if (first) return first
  }

  return error?.response?.data?.message ?? fallback
}

/**
 * Tanda tangan pribadi akun. Diisi sekali (digambar atau diunggah) dengan
 * pratinjau dan konfirmasi; setelah tersimpan tidak dapat diubah sendiri
 * dan hanya bisa direset oleh Petugas Desa.
 */
export function SignatureCard() {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const [status, setStatus] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [draft, setDraft] = useState(null)
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
        if (active) setError(serverMessage(requestError, 'Gagal memuat tanda tangan.'))
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

  const pointerPosition = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const startStroke = (event) => {
    const context = canvasRef.current.getContext('2d')
    const { x, y } = pointerPosition(event)

    drawingRef.current = true
    context.lineWidth = 2.5
    context.lineCap = 'round'
    context.strokeStyle = '#111827'
    context.beginPath()
    context.moveTo(x, y)
  }

  const continueStroke = (event) => {
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

  const setDraftFile = (file) => {
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
    } catch (requestError) {
      setError(serverMessage(requestError, 'Gagal menyimpan tanda tangan.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="sid-card" aria-labelledby="signature-card-heading">
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
        <>
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Tanda tangan Anda"
              style={{ maxHeight: 120, maxWidth: '100%', background: '#fff' }}
            />
          )}
          <p className="sid-upload-description">
            Tanda tangan sudah tersimpan dan tidak dapat diubah. Bila perlu diganti, hubungi Petugas
            Desa untuk mereset.
          </p>
        </>
      )}

      {status && !status.has_signature && !draft && (
        <>
          <p className="sid-upload-description">
            Tanda tangan dipakai pada surat yang Anda ajukan atau yang Anda setujui untuk orang
            lain. Tanda tangan hanya dapat diisi satu kali.
          </p>

          <canvas
            ref={canvasRef}
            width={PAD_WIDTH}
            height={PAD_HEIGHT}
            aria-label="Area menggambar tanda tangan"
            onPointerDown={startStroke}
            onPointerMove={continueStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            style={{
              width: '100%',
              maxWidth: PAD_WIDTH,
              border: '1px dashed var(--sid-border)',
              borderRadius: 8,
              background: '#fff',
              touchAction: 'none',
            }}
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

          <label className="sid-label" htmlFor="signature-upload">
            Atau unggah gambar tanda tangan (PNG/JPG, maks. 512 KB)
          </label>
          <input
            id="signature-upload"
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)}
          />
        </>
      )}

      {draft && (
        <>
          <p className="sid-label">Pratinjau</p>
          <img
            src={draftUrl}
            alt="Pratinjau tanda tangan"
            style={{ maxHeight: 120, maxWidth: '100%', background: '#fff' }}
          />
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
        </>
      )}
    </section>
  )
}
