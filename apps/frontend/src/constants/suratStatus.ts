import type { LetterStatus } from '@/types'

export const SURAT_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const satisfies Record<string, LetterStatus>

export const SURAT_STATUS_OPTIONS = [
  {
    value: SURAT_STATUS.PENDING,
    label: 'Menunggu',
  },
  {
    value: SURAT_STATUS.IN_PROGRESS,
    label: 'Sedang Diproses',
  },
  {
    value: SURAT_STATUS.APPROVED,
    label: 'Disetujui',
  },
  {
    value: SURAT_STATUS.REJECTED,
    label: 'Ditolak',
  },
]

export const STATUS_LABELS: Record<string, string> = {
  [SURAT_STATUS.PENDING]: 'Menunggu',
  [SURAT_STATUS.IN_PROGRESS]: 'Sedang Diproses',
  [SURAT_STATUS.APPROVED]: 'Disetujui',
  [SURAT_STATUS.REJECTED]: 'Ditolak',
}

export const STATUS_CLASSES: Record<string, string> = {
  [SURAT_STATUS.PENDING]: 'bg-[#FFEFBD] text-black',

  [SURAT_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',

  [SURAT_STATUS.APPROVED]: 'bg-[#2E7D31]/40 text-black',

  [SURAT_STATUS.REJECTED]: 'bg-[#E53835]/40 text-black',
}

export const SURAT_STATUS_ORDER = {
  [SURAT_STATUS.APPROVED]: 1,
  [SURAT_STATUS.IN_PROGRESS]: 2,
  [SURAT_STATUS.PENDING]: 3,
  [SURAT_STATUS.REJECTED]: 4,
}

export const RELEVANT_STATUSES = [
  SURAT_STATUS.PENDING,
  SURAT_STATUS.IN_PROGRESS,
  SURAT_STATUS.APPROVED,
  SURAT_STATUS.REJECTED,
]

export function getStatusLabel(status: string | null | undefined) {
  return (status ? STATUS_LABELS[status] : undefined) ?? status ?? '-'
}

export function getStatusClass(status: string | null | undefined) {
  return (status ? STATUS_CLASSES[status] : undefined) ?? 'bg-gray-100 text-gray-800'
}

export function isPendingStatus(status: string | null | undefined) {
  return status === SURAT_STATUS.PENDING
}

export function isInProgressStatus(status: string | null | undefined) {
  return status === SURAT_STATUS.IN_PROGRESS
}

export function isApprovedStatus(status: string | null | undefined) {
  return status === SURAT_STATUS.APPROVED
}

export function isRejectedStatus(status: string | null | undefined) {
  return status === SURAT_STATUS.REJECTED
}
