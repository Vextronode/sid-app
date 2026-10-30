import type { ReactNode } from 'react'

// Badge status bersama untuk semua dashboard (gaya .sid-operator-status):
//   active   hijau     Aktif, Menjabat, Publikasi
//   inactive abu-abu   Nonaktif, Berakhir, Pindah
//   warning  kuning    Draft
//   danger   merah     Bubar, Kedaluwarsa
// Untuk status ya/tidak cukup kirim `active`, tanpa `tone`.
export type StatusTone = 'active' | 'inactive' | 'warning' | 'danger'

type StatusPillProps = {
  tone?: StatusTone
  active?: boolean
  children: ReactNode
}

export function StatusPill({ tone, active, children }: StatusPillProps) {
  const resolvedTone = tone ?? (active ? 'active' : 'inactive')

  return <span className={`sid-operator-status ${resolvedTone}`}>{children}</span>
}
