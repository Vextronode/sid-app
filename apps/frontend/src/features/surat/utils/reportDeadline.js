import { matchesCondition } from './fieldCondition'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Peringatan batas waktu pelaporan peristiwa (isian tanggal ber-
 * `report_deadline`, UU 23/2006 jo. UU 24/2013). Tidak memblokir
 * pengajuan; null bila belum lewat, tanggal kosong, atau syaratnya
 * (`when`) tidak terpenuhi.
 */
export function reportDeadlineWarning(field, value, answers = {}, today = new Date()) {
  const deadline = field?.reportDeadline
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''))

  if (!deadline || !match || !matchesCondition(deadline.when ?? null, answers)) return null

  const event = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const elapsed = Math.round((now - event) / DAY_MS)

  if (elapsed <= deadline.days) return null

  return `Pelaporan ${deadline.event} sudah lewat ${elapsed} hari, melebihi batas ${deadline.days} hari sejak peristiwa. Pengajuan tetap bisa dilanjutkan, tetapi Disdukcapil dapat mengenakan denda administratif keterlambatan.`
}
