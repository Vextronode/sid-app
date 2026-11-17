import type { StatusTone } from '@/components/ui/StatusPill'
import { STAF_APP_LABEL } from '@/lib/constants/app'
import type { PushDeviceStatus, PushService } from './api'

export const STATUS_LABELS: Record<PushDeviceStatus, string> = {
  aktif: 'Aktif',
  perlu_dicek: 'Perlu dicek',
  belum_teruji: 'Belum teruji',
}

export const STATUS_TONES: Record<PushDeviceStatus, StatusTone> = {
  aktif: 'active',
  perlu_dicek: 'warning',
  belum_teruji: 'inactive',
}

export const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as PushDeviceStatus[]).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}))

export const PUSH_SERVICE_LABELS: Record<PushService, string> = {
  fcm: 'Google (Chrome/Edge/Android)',
  mozilla: 'Mozilla (Firefox)',
  apple: 'Apple (Safari/iOS)',
  windows: 'Microsoft (Windows)',
  lainnya: 'Lainnya',
}

export const PUSH_SERVICE_OPTIONS = (Object.keys(PUSH_SERVICE_LABELS) as PushService[]).map(
  (value) => ({ value, label: PUSH_SERVICE_LABELS[value] }),
)

// Urutan mengikuti hierarki; label Staf mengikuti nama aplikasi.
export const ROLE_OPTIONS = [
  { value: 'warga', label: 'Warga' },
  { value: 'rt', label: 'Ketua RT' },
  { value: 'rw', label: 'Ketua RW' },
  { value: 'kadus', label: 'Kepala Dusun' },
  { value: 'kasi_pemerintahan', label: 'Kasi Pemerintahan' },
  { value: 'kaur_tu_umum', label: 'Kaur TU & Umum' },
  { value: 'sekretaris_desa', label: 'Sekretaris Desa' },
  { value: 'kepala_desa', label: 'Kepala Desa' },
  { value: 'staf_sid', label: STAF_APP_LABEL },
]

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'

  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// "RT 001 / RW 002 · Dusun Krajan"; '-' bila akun tidak terhubung ke warga.
export function formatWilayah(
  wilayah: { hamlet: string | null; rw: string | null; rt: string | null } | null,
) {
  if (!wilayah) return '-'

  const rtRw = [wilayah.rt && `RT ${wilayah.rt}`, wilayah.rw && `RW ${wilayah.rw}`]
    .filter(Boolean)
    .join(' / ')

  return [rtRw, wilayah.hamlet].filter(Boolean).join(' · ') || '-'
}
