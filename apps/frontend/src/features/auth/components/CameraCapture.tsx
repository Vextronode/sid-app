import { useEffect, useRef, useState } from 'react'
import { Camera, RotateCcw, X } from 'lucide-react'

import { PhotoCropDialog } from '@/components/ui/PhotoCropDialog'

import '@/styles/aktivasi-akun.css'

type CameraCaptureProps = {
  photo: Blob | null
  onChange: (photo: Blob | null) => void
}

type CameraState = 'idle' | 'starting' | 'live' | 'unavailable'

// Lebar maksimal tangkapan kamera sebelum dipotong; cukup untuk hasil
// potong 1080 x 1080 (PHOTO_OUTPUT_SIZE).
const MAX_WIDTH = 1440

/**
 * Foto wajah untuk petugas wilayah yang memeriksa pendaftaran akun atau
 * permintaan ganti foto profil (D1/K4). Sengaja hanya dari kamera
 * (getUserMedia), tanpa pilihan galeri: petugas perlu foto yang diambil
 * saat itu, bukan foto lama. Setelah disetujui, foto menjadi foto profil.
 * Hasil tangkapan langsung dipotong persegi 1080 x 1080 (PhotoCropDialog).
 */
export function CameraCapture({ photo, onChange }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CameraState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Tangkapan kamera yang sedang dipotong.
  const [captured, setCaptured] = useState<Blob | null>(null)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => stopCamera, [])

  // Elemen video baru ada setelah render dengan state 'live'.
  useEffect(() => {
    const video = videoRef.current

    if (state !== 'live' || !video || !streamRef.current) return

    video.srcObject = streamRef.current
    void video.play().catch(() => undefined)
  }, [state])

  useEffect(() => {
    if (!photo) return

    const url = URL.createObjectURL(photo)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [photo])

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable')

      return
    }

    setState('starting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 } },
        audio: false,
      })

      streamRef.current = stream
      setState('live')
    } catch {
      stopCamera()
      setState('unavailable')
    }
  }

  const takePhoto = () => {
    const video = videoRef.current

    if (!video || !video.videoWidth) return

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return

        stopCamera()
        setState('idle')
        setCaptured(blob)
      },
      'image/jpeg',
      0.85,
    )
  }

  const cancel = () => {
    stopCamera()
    setState('idle')
  }

  const retake = () => {
    onChange(null)
    setPreviewUrl(null)
    void openCamera()
  }

  const live = state === 'live' || state === 'starting'

  return (
    <div className="sid-camera">
      <div className={`sid-camera-frame${!live && !photo ? ' sid-camera-frame-empty' : ''}`}>
        {live && (
          <>
            <video ref={videoRef} playsInline muted aria-label="Pratinjau kamera" />
            <span className="sid-camera-guide" aria-hidden="true" />
          </>
        )}

        {!live && photo && previewUrl && (
          <img src={previewUrl} alt="Foto wajah yang akan dikirim" />
        )}

        {!live && !photo && (
          <div className="sid-camera-placeholder">
            <Camera size={28} aria-hidden="true" />
            <span>
              {state === 'unavailable'
                ? 'Kamera tidak dapat dibuka.'
                : 'Foto wajah diambil langsung dari kamera.'}
            </span>
          </div>
        )}
      </div>

      <p className="sid-camera-hint" role={state === 'unavailable' ? 'alert' : undefined}>
        {state === 'unavailable'
          ? 'Izinkan akses kamera di browser lalu coba lagi. Bila perangkat tidak punya kamera, datang ke kantor desa.'
          : live
            ? 'Posisikan wajah di dalam bingkai, tanpa masker atau kacamata hitam.'
            : 'Foto diperiksa petugas wilayah. Setelah disetujui, foto ini menjadi foto profil akun Anda.'}
      </p>

      <div className="sid-camera-actions">
        {live ? (
          <>
            <button
              type="button"
              className="sid-camera-button sid-camera-button-primary"
              onClick={takePhoto}
              disabled={state !== 'live'}
            >
              <Camera size={15} aria-hidden="true" /> Ambil foto
            </button>
            <button type="button" className="sid-camera-button" onClick={cancel}>
              <X size={15} aria-hidden="true" /> Batal
            </button>
          </>
        ) : photo ? (
          <button type="button" className="sid-camera-button" onClick={retake}>
            <RotateCcw size={15} aria-hidden="true" /> Ulangi foto
          </button>
        ) : (
          <button
            type="button"
            className="sid-camera-button sid-camera-button-primary"
            onClick={() => void openCamera()}
          >
            <Camera size={15} aria-hidden="true" />
            {state === 'unavailable' ? 'Coba buka kamera lagi' : 'Buka kamera'}
          </button>
        )}
      </div>

      {captured && (
        <PhotoCropDialog
          source={captured}
          title="Atur Foto Wajah"
          onCancel={() => setCaptured(null)}
          onConfirm={(cropped) => {
            setCaptured(null)
            onChange(cropped)
          }}
        />
      )}
    </div>
  )
}
