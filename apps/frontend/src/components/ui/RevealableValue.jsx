import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Nilai tersamar (mis. NIK "************0001") dengan tombol mata untuk
 * menampilkan nilai utuh. Nilai diambil dari backend saat tombol pertama
 * kali ditekan (backend memeriksa hak akses), lalu bisa disembunyikan lagi.
 */
export function RevealableValue({ masked, reveal, label = 'NIK' }) {
  const [value, setValue] = useState(null)
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!masked) return '-'

  const toggle = async (event) => {
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
