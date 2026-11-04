import type { User } from '@/types'

/**
 * Wilayah jabatan akun RT/RW/Kadus dari official.rt/rw/hamlet (GET /api/user),
 * dibentuk dari nomor wilayah (tidak disimpan sebagai label), mis.
 * "RT 001 / RW 002, Dusun Patrol", "RW 002, Dusun Patrol", "Dusun Patrol".
 * Nomor RW tidak unik antar-dusun, jadi nama dusun ikut bila diketahui.
 * `fallback` bila belum diatur.
 */
export function officialAreaLabel(user: User | null | undefined, fallback: string): string {
  const official = user?.official
  const hamlet = official?.hamlet?.name ? `Dusun ${official.hamlet.name}` : null
  const rw = official?.rw?.number ? `RW ${official.rw.number}` : null

  if (official?.rt?.number) {
    return [[`RT ${official.rt.number}`, rw].filter(Boolean).join(' / '), hamlet]
      .filter(Boolean)
      .join(', ')
  }
  if (rw) return [rw, hamlet].filter(Boolean).join(', ')
  if (hamlet) return hamlet

  return fallback
}
