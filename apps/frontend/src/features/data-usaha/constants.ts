import type { StatusTone } from '@/components/ui/StatusPill'
import type { BusinessCategory, BusinessLetterStatus, CimartStatus } from './api'

export const BUSINESS_CATEGORY_OPTIONS: { value: BusinessCategory; label: string }[] = [
  { value: 'kelontong', label: 'Toko Kelontong' },
  { value: 'kuliner', label: 'Toko Kuliner' },
  { value: 'non_kuliner', label: 'Toko Non Kuliner' },
]

export const LETTER_STATUS_OPTIONS: { value: BusinessLetterStatus; label: string }[] = [
  { value: 'berlaku', label: 'Berlaku' },
  { value: 'kedaluwarsa', label: 'Kedaluwarsa' },
]

// Label sama dengan CimartApplicationStatus::label() di backend.
export const CIMART_STATUS_OPTIONS: { value: CimartStatus | 'none'; label: string }[] = [
  { value: 'none', label: 'Belum mendaftar' },
  { value: 'pending', label: 'Menunggu diproses Cimart' },
  { value: 'accepted', label: 'Akun pedagang sudah dibuat' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'cancelled', label: 'Pendaftaran dibatalkan' },
]

export function cimartStatusTone(status: CimartStatus | null): StatusTone {
  switch (status) {
    case 'accepted':
      return 'active'
    case 'pending':
      return 'warning'
    case 'rejected':
      return 'danger'
    default:
      return 'inactive'
  }
}

export function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('id-ID') : '-'
}
