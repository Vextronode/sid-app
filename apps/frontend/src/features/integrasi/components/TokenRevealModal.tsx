import { useState } from 'react'
import { copyText } from '@/shared/lib/copyText'

type TokenRevealModalProps = {
  clientName: string
  token: string
  onClose: () => void
}

/**
 * Token baru hanya ditampilkan sekali di sini: SID hanya menyimpan hash-nya,
 * jadi token tidak bisa dilihat lagi setelah modal ditutup.
 */
export function TokenRevealModal({ clientName, token, onClose }: TokenRevealModalProps) {
  const [copied, setCopied] = useState<boolean | null>(null)

  const copy = async () => {
    setCopied(await copyText(token))
  }

  return (
    <div className="sid-modal-overlay">
      <div
        className="sid-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="integration-token-title"
      >
        <h2 id="integration-token-title">Token Baru {clientName}</h2>
        <p className="sid-modal-alert-warning" role="alert">
          Salin dan simpan token ini sekarang. Token tidak bisa dilihat lagi setelah jendela ini
          ditutup.
        </p>
        <p>
          Serahkan token ke tim {clientName} lewat jalur yang aman, jangan lewat grup chat. Token
          lama tetap berlaku sampai Anda mencabutnya. Cabut token lama setelah token baru terlihat
          dipakai.
        </p>

        <label className="sid-form-group">
          <span className="sid-form-label">Token</span>
          <input
            className="sid-input"
            readOnly
            value={token}
            onFocus={(event) => event.target.select()}
          />
        </label>

        {copied === false && (
          <p className="sid-admin-alert sid-admin-alert-error" role="alert">
            Token gagal disalin otomatis. Pilih teks token lalu salin secara manual.
          </p>
        )}

        <div className="sid-modal-actions">
          <button type="button" className="sid-button sid-button-outline" onClick={copy}>
            {copied ? 'Tersalin' : 'Salin token'}
          </button>
          <button type="button" className="sid-button sid-button-primary" onClick={onClose}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}
