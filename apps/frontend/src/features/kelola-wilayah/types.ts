// Master wilayah (Dusun > RW > RT) yang sudah dinormalkan untuk halaman
// Kelola Wilayah.
import type { Uuid } from '@/types'

export type WilayahType = 'dusun' | 'rw' | 'rt'

export type WilayahHamlet = {
  id: number | null
  code: string
  name: string
  isActive: boolean
  villageId: Uuid | null
}

export type WilayahRw = {
  id: number | null
  number: string
  fullLabel: string
  isActive: boolean
  hamletId: number | null
}

export type WilayahRt = {
  id: number | null
  number: string
  fullLabel: string
  isActive: boolean
  rwId: number | null
}

// Baris yang sedang diubah di WilayahFormModal (salah satu jenis di atas).
export type WilayahItem = Partial<WilayahHamlet> & Partial<WilayahRw> & Partial<WilayahRt>

export type WilayahPayload = Record<string, unknown>

// Aksi yang sedang berjalan, mis. 'update-rw-3'; null bila tidak ada.
export type WilayahProcessing = string | null

export type WilayahMasterValue = {
  hamlets: WilayahHamlet[]
  rws: WilayahRw[]
  rts: WilayahRt[]
  loading: boolean
  processing: WilayahProcessing
  error: string
  refresh: () => Promise<void>
  createHamlet: (payload: WilayahPayload) => Promise<unknown>
  updateHamlet: (id: number, payload: WilayahPayload) => Promise<unknown>
  deleteHamlet: (id: number) => Promise<boolean>
  createRw: (payload: WilayahPayload) => Promise<unknown>
  updateRw: (id: number, payload: WilayahPayload) => Promise<unknown>
  deleteRw: (id: number) => Promise<boolean>
  createRt: (payload: WilayahPayload) => Promise<unknown>
  updateRt: (id: number, payload: WilayahPayload) => Promise<unknown>
  deleteRt: (id: number) => Promise<boolean>
}
