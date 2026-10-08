import { AlertCircle } from 'lucide-react'

export function OverdueBadge({ isOverdue, count }) {
  if (isOverdue !== true) {
    return null
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: 'var(--sid-status-overdue-bg)',
        color: 'var(--sid-status-overdue-text)',
      }}
    >
      <AlertCircle size={13} />
      {Number.isInteger(count) ? `Terlambat · ${count}` : 'Terlambat'}
    </span>
  )
}
