import type { KeyboardEvent } from 'react'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Nama yang dibacakan pembaca layar; wajib bila tidak ada labelledBy. */
  label?: string
  labelledBy?: string
  describedBy?: string
  disabled?: boolean
  id?: string
}

/**
 * Saklar nyala/mati untuk pengaturan yang langsung tersimpan. Tombol
 * native dengan role="switch": Spasi/Enter sudah memicu klik, panah
 * kiri/kanan ikut mematikan/menyalakan.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  labelledBy,
  describedBy,
  disabled = false,
  id,
}: SwitchProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' && !checked) {
      event.preventDefault()
      onCheckedChange(true)
    } else if (event.key === 'ArrowLeft' && checked) {
      event.preventDefault()
      onCheckedChange(false)
    }
  }

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      className="sid-switch"
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={handleKeyDown}
    >
      <span className="sid-switch-thumb" aria-hidden="true" />
    </button>
  )
}
