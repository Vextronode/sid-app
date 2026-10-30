// ==========================================
// statusFlow.ts
// Riwayat keputusan approval per tingkat.
// ==========================================

import type { IsoDateString } from '@/types'

type ApprovalEntry = {
  approval_level?: string
  action?: string | null
  notes?: string | null
  created_at?: IsoDateString | null
}

const byCreatedAt = (a: { created_at?: string | null }, b: { created_at?: string | null }) =>
  new Date(a?.created_at ?? 0).getTime() - new Date(b?.created_at ?? 0).getTime()

// Keputusan terakhir (approved/rejected) dari tingkat yang diberikan.
export function getLatestApprovalForLevel<T extends ApprovalEntry>(
  approvals: T[] = [],
  levels: string | string[] = [],
): T | null {
  const targetLevels = Array.isArray(levels) ? levels : [levels]

  return (
    approvals
      .filter((approval) => targetLevels.includes(approval?.approval_level) && approval?.action)
      .sort(byCreatedAt)
      .at(-1) ?? null
  )
}
