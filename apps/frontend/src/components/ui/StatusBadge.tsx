import { getStatusClass, getStatusLabel } from '@/constants/suratStatus'

type StatusBadgeProps = {
  status: string | null | undefined
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = String(status ?? '').toLowerCase()

  const bgClass = getStatusClass(normalizedStatus)

  const label = getStatusLabel(normalizedStatus)

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] md:text-xs font-medium tracking-wide ${bgClass}`}
    >
      {label}
    </span>
  )
}
