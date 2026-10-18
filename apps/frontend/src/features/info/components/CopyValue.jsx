import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { copyText } from '@/shared/lib/copyText'

const FEEDBACK_MS = 2000

const LABELS = {
  phone: { action: 'Salin nomor telepon', copied: 'Nomor disalin' },
  email: { action: 'Salin alamat email', copied: 'Email disalin' },
}

// Telepon/email di halaman informasi: biru dan bisa diklik untuk disalin,
// sama seperti nomor di kartu kontak beranda (bukan tel:/mailto:).
// Hasilnya diumumkan lewat aria-live agar terdengar oleh pembaca layar.
export function CopyValue({ value, kind }) {
  const [status, setStatus] = useState(null) // null | 'copied' | 'failed'
  const labels = LABELS[kind] ?? LABELS.email

  useEffect(() => {
    if (!status) return undefined
    const timer = setTimeout(() => setStatus(null), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [status])

  const handleCopy = async () => {
    setStatus((await copyText(value)) ? 'copied' : 'failed')
  }

  const Icon = status === 'copied' ? Check : Copy

  return (
    <span className="whitespace-nowrap">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`${labels.action} ${value}`}
        className="inline-flex cursor-pointer items-baseline gap-1 border-0 bg-transparent p-0 font-semibold text-pb-laut underline decoration-pb-laut/40 underline-offset-4 hover:text-pb-laut-hover hover:decoration-current"
      >
        {value}
        <Icon size={15} className="translate-y-0.5 self-center text-pb-muted" aria-hidden="true" />
      </button>
      <span className="ml-1.5 text-sm text-pb-muted" aria-live="polite">
        {status === 'copied' && labels.copied}
        {status === 'failed' && 'Gagal menyalin'}
      </span>
    </span>
  )
}
