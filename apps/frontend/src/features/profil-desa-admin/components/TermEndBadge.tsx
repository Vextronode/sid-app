import { AlertCircle, Clock } from 'lucide-react'

import { getTermStatus } from '@/features/profil-desa-admin/utils/termStatus'

// Pengingat di tabel Pejabat Desa: masa jabatan sudah lewat atau segera
// berakhir. Tidak tampil untuk masa jabatan yang masih jauh.
export function TermEndBadge({ termEndsAt }: { termEndsAt: string | null | undefined }) {
  const status = getTermStatus(termEndsAt)
  if (!status) return null

  const expired = status.type === 'expired'
  const Icon = expired ? AlertCircle : Clock
  const tone = expired ? 'overdue' : 'pending'
  let label = 'Lewat masa'
  if (!expired) {
    label = status.daysLeft === 0 ? 'Berakhir hari ini' : `${status.daysLeft} hari lagi`
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: `var(--sid-status-${tone}-bg)`,
        color: `var(--sid-status-${tone}-text)`,
      }}
    >
      <Icon size={13} />
      {label}
    </span>
  )
}
