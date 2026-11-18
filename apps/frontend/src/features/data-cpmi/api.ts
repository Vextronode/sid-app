import api from '@/lib/api'
import type { IsoDateString, LaravelPaginatedResponse, Uuid } from '@/types'

// Data Calon Pekerja Migran Indonesia dari pengajuan F11 yang disetujui
// Kepala Desa, satu baris per keberangkatan. Sumber: MigrantWorkerResource.

/** Kode jenis layanan Pendataan CPMI. */
export const MIGRANT_WORKER_LETTER_CODE = 'F11'

// Dihitung backend dari tanggal kontrak terhadap hari ini.
export type ContractStatus = 'akan_berangkat' | 'aktif' | 'berakhir'

export type MigrantWorkerSummary = {
  id: Uuid
  letter_id: Uuid
  citizen: { id: Uuid; name: string } | null
  hamlet: string | null
  destination_country: string
  employer_name: string | null
  agency_name: string | null
  position: string | null
  contract_start: string | null
  contract_end: string | null
  contract_status: ContractStatus
  approved_at: IsoDateString | null
  created_at: IsoDateString | null
}

export type MigrantWorkerDocument = {
  id: number
  field: string | null
  original_name: string
  mime_type: string
  size: number
  url: string
}

export type MigrantWorkerDetail = MigrantWorkerSummary & {
  identity: {
    name: string | null
    nik: string | null
    place_of_birth: string | null
    date_of_birth: string | null
    gender: string | null
    religion: string | null
    marital_status: string | null
    mother_name: string | null
    address: string | null
    rt: string | null
    rw: string | null
    hamlet: string | null
  }
  height_cm: number | null
  weight_kg: number | null
  phone: string | null
  email: string | null
  education_level: string | null
  school_name: string | null
  major: string | null
  graduation_year: number | null
  certificates: { nama_sertifikat: string | null; penerbit: string | null; tahun: string | null }[]
  work_history: {
    perusahaan: string | null
    jabatan: string | null
    mulai: string | null
    selesai: string | null
    deskripsi: string | null
  }[]
  guardian_relation: string | null
  // Label hubungan (termasuk turunan dari KK, mis. Kakek/Nenek).
  guardian_relation_label: string | null
  guardian_name: string | null
  guardian_address: string | null
  guardian_phone: string | null
  guardian_email: string | null
  employer_address: string | null
  employer_contact: string | null
  agency_contact: string | null
  salary_facilities: string | null
  documents: MigrantWorkerDocument[]
}

export type MigrantWorkerListParams = {
  page?: number
  per_page?: number
  search?: string
  destination_country?: string
  contract_status?: ContractStatus
  hamlet_id?: number
}

export type MigrantWorkerListResponse = LaravelPaginatedResponse<MigrantWorkerSummary> & {
  total: number
  filters?: { countries: string[] }
}

// Data CPMI: Staf SIDUTama, Kades/Sekdes, dan petugas F11 (baca saja).
export async function getMigrantWorkers(params: MigrantWorkerListParams = {}) {
  const response = await api.get<MigrantWorkerListResponse>('/api/migrant-workers', { params })

  return response.data
}

export async function getMigrantWorker(id: Uuid) {
  const response = await api.get<{ data: MigrantWorkerDetail }>(`/api/migrant-workers/${id}`)

  return response.data.data
}

// Data CPMI Saya: riwayat keberangkatan milik akun yang login, terbaru dulu.
export async function getMyMigrantWorkers() {
  const response = await api.get<{ data: MigrantWorkerSummary[] }>('/api/profile/migrant-workers')

  return response.data.data
}

/**
 * Isian pengajuan CPMI terakhir milik akun ini (fisik, kontak, pendidikan,
 * kompetensi, penanggung jawab), untuk nilai awal form F11 berikutnya.
 * Objek kosong bila belum pernah.
 */
export async function getMigrantWorkerPrefill() {
  const response = await api.get<{ data: Record<string, unknown> }>(
    '/api/profile/migrant-workers/prefill',
  )

  return response.data.data ?? {}
}
