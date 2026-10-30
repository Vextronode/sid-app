import api from '@/lib/api'
import type { IsoDateString, PaginatedResponse } from '@/types'

export type LogActor = { id: string; name: string; role: string; role_label: string | null }

// PopulationLogResource: perubahan data warga & KK.
export type PopulationLog = {
  id: number
  log_name: string
  event: string
  description: string | null
  subject_id: string | null
  subject_label: string | null
  source: string | null
  letter_number: string | null
  // Hasil impor Excel (event 'imported').
  summary: { success_count: number; error_count: number; total_rows: number } | null
  // Perubahan per field: nilai lama -> baru.
  changes: Record<string, { old?: unknown; new?: unknown }> | null
  actor: LogActor | null
  created_at: IsoDateString | null
}

// LetterActivityLogResource: perubahan status surat.
export type LetterActivityLog = {
  id: number
  letter: {
    id: string
    letter_number: string | null
    applicant_name: string | null
    letter_type: string | null
  } | null
  actor: LogActor | null
  old_status: string | null
  new_status: string | null
  reason: string | null
  ip_address: string | null
  created_at: IsoDateString | null
}

type LogParams = Record<string, string | number | null | undefined>

// Hanya parameter yang terisi yang dikirim ke server.
function compact(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )
}

// Riwayat data warga & KK (activity_log) - khusus Staf SIDUTama.
export async function getPopulationLogs(params: LogParams = {}) {
  const response = await api.get<PaginatedResponse<PopulationLog>>(
    '/api/activity-logs/population',
    { params: compact(params) },
  )

  return response.data
}

// Riwayat perubahan status surat desa (letter_status_logs).
export async function getLetterActivityLogs(params: LogParams = {}) {
  const response = await api.get<PaginatedResponse<LetterActivityLog>>(
    '/api/activity-logs/letters',
    { params: compact(params) },
  )

  return response.data
}
