// Batas hari sebelum akhir masa jabatan saat pengingat mulai tampil.
export const TERM_ENDING_SOON_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

// term_ends_at dibaca sebagai tanggal kalender (YYYY-MM-DD) di zona waktu
// pengguna, supaya "hari ini" dan tanggal akhir dibandingkan per hari.
function toLocalDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))

  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}

/**
 * Status masa jabatan pejabat aktif: 'expired' bila tanggal akhir sudah
 * lewat, 'ending' bila berakhir dalam TERM_ENDING_SOON_DAYS hari (termasuk
 * hari ini), selain itu null.
 */
export function getTermStatus(termEndsAt, today = new Date()) {
  const end = termEndsAt ? toLocalDay(termEndsAt) : null
  if (!end) return null

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysLeft = Math.round((end - startOfToday) / DAY_MS)

  if (daysLeft < 0) return { type: 'expired', daysLeft }
  if (daysLeft <= TERM_ENDING_SOON_DAYS) return { type: 'ending', daysLeft }

  return null
}
