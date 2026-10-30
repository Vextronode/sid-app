import type { PublicAnnouncement } from '@/features/info-desa/usePublicVillageInfo'

// Waktu berakhir pengumuman beranda, mis. "Jumat, 24 Okt, 14.00".
export function formatAnnouncementUntil(value: string) {
  const date = new Date(value)
  const day = date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return `${day}, ${time}`
}

export const isAnnouncementExpired = (announcement: Pick<PublicAnnouncement, 'expires_at'>) =>
  new Date(announcement.expires_at).getTime() <= Date.now()
