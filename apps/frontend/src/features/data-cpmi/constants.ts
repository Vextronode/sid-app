import type { StatusTone } from '@/components/ui/StatusPill'
import type { ContractStatus } from './api'

export const CONTRACT_STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: 'akan_berangkat', label: 'Akan berangkat' },
  { value: 'aktif', label: 'Kontrak berjalan' },
  { value: 'berakhir', label: 'Kontrak berakhir' },
]

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = Object.fromEntries(
  CONTRACT_STATUS_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ContractStatus, string>

export function contractStatusTone(status: ContractStatus): StatusTone {
  switch (status) {
    case 'aktif':
      return 'active'
    case 'akan_berangkat':
      return 'warning'
    default:
      return 'inactive'
  }
}

// Label hubungan penanggung jawab (pilihan di luar KK dan turunan dari KK).
export { GUARDIAN_RELATION_LABELS } from './guardianRelation'

// Isian unggah F11, urut seperti di form.
export const DOCUMENT_LABELS: Record<string, string> = {
  pas_foto: 'Pas Foto Terbaru',
  scan_ktp: 'Scan e-KTP',
  scan_kk: 'Scan Kartu Keluarga (KK)',
  scan_akta_lahir: 'Scan Akta Kelahiran / Surat Kenal Lahir',
  scan_ijazah: 'Scan Ijazah Terakhir',
  scan_paspor: 'Scan Paspor',
  scan_izin_keluarga: 'Scan Surat Izin Keluarga',
  scan_perjanjian_kerja: 'Scan Perjanjian Kerja / Kontrak Kerja',
  scan_surat_sehat: 'Scan Surat Keterangan Sehat (Fit to Work)',
  scan_bpjs_tk: 'Scan Kepesertaan BPJS Ketenagakerjaan',
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
