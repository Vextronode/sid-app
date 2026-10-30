import api from '@/lib/api'

// Hanya parameter yang terisi yang dikirim ke server.
function compact(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  )
}

// Riwayat data warga & KK (activity_log) - khusus Staf SIDUTama.
export async function getPopulationLogs(params = {}) {
  const response = await api.get('/api/activity-logs/population', { params: compact(params) })

  return response.data
}

// Riwayat perubahan status surat desa (letter_status_logs).
export async function getLetterActivityLogs(params = {}) {
  const response = await api.get('/api/activity-logs/letters', { params: compact(params) })

  return response.data
}
