// Label bersama untuk permintaan akun warga yang diputuskan petugas wilayah:
// aktivasi akun dan ganti foto profil.

import type { StatusTone } from '@/components/ui/StatusPill'
import type { ActivationLevel, ActivationStatus } from './api'

export const REQUEST_STATUS: Record<ActivationStatus, { tone: StatusTone; label: string }> = {
  pending: { tone: 'warning', label: 'Diproses' },
  approved: { tone: 'active', label: 'Disetujui' },
  rejected: { tone: 'danger', label: 'Ditolak' },
}

export const STATUS_FILTERS = [
  { value: '', label: 'Semua status' },
  { value: 'pending', label: 'Diproses' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
]

export const LEVEL_LABELS: Record<ActivationLevel, string> = {
  rt: 'RT',
  rw: 'RW',
  kadus: 'Kepala Dusun',
  staf_sid: 'Staf SIDUTama',
}

export function formatDateTime(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'
}

export function areaLabel(area: { rt: string | null; rw: string | null; hamlet: string | null }) {
  return (
    [area.hamlet, area.rw && `RW ${area.rw}`, area.rt && `RT ${area.rt}`]
      .filter(Boolean)
      .join(', ') || '-'
  )
}
