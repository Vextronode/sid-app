import type { User } from '@/types'

// Wilayah jabatan akun RT/RW/Kadus dari official.rt/rw/hamlet (GET /api/user),
// mis. "RT 01 / RW 02", "RW 02", "Dusun Patrol". `fallback` bila belum diatur.
export function officialAreaLabel(user: User | null | undefined, fallback: string): string {
  const official = user?.official

  if (official?.rt?.full_label) return official.rt.full_label
  if (official?.rw?.full_label) return official.rw.full_label
  if (official?.hamlet?.name) return `Dusun ${official.hamlet.name}`

  return fallback
}
