import { useState } from 'react'
import type { MouseEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type RevealableValueProps = {
  masked: string | null | undefined
  // Mengambil nilai utuh dari backend.
  reveal: () => Promise<string>
  label?: string
}

/**
 * Nilai tersamar (mis. NIK "************0001") dengan tombol mata untuk
 * menampilkan nilai utuh. Nilai diambil dari backend saat tombol pertama
 * kali ditekan (backend memeriksa hak akses), lalu bisa disembunyikan lagi.
 */
export function RevealableValue({ masked, reveal, label = 'NIK' }: RevealableValueProps) {
  const [value, setValue] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!masked) return '-'

  const toggle = async (event: MouseEvent<HTMLButtonElement>) => {
    // Tombol di dalam baris/label yang dapat diklik tidak ikut memicunya.
    event.preventDefault()
    event.stopPropagation()

    if (shown) {
      setShown(false)

      return
    }

    if (value === null) {
      setBusy(true)
      setFailed(false)

      try {
        setValue(await reveal())
      } catch {
        setFailed(true)

        return
      } finally {
        setBusy(false)
      }
    }

    setShown(true)
  }

  return (
    <span className="sid-revealable">
      <span>{shown && value ? value : masked}</span>
      <button
        type="button"
        className="sid-revealable-toggle"
        onClick={toggle}
        disabled={busy}
        aria-label={shown ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
        title={
          failed
            ? `${label} tidak dapat ditampilkan`
            : shown
              ? `Sembunyikan ${label}`
              : `Tampilkan ${label}`
        }
      >
        {shown ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
      </button>
    </span>
  )
}
