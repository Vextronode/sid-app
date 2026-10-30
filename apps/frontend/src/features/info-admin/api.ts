import api from '@/lib/api'
import type { MessageResponse, ResourceResponse } from '@/types'

// Field tunggal (teks/email/tanggal) atau daftar butir teks.
export type InfoPageField = {
  key: string
  type: 'text' | 'email' | 'date' | 'list'
  label: string
  hint?: string
}

// Nilai isian per key: teks, atau daftar teks untuk field `list`.
export type InfoPageValues = Record<string, string | string[]>

export type SavedInfoPage = {
  page: string
  fields: InfoPageValues
  updated_at: string | null
}

// InfoPageService::allForStaff.
export type InfoPageSection = SavedInfoPage & { title: string; schema: InfoPageField[] }

// Isian halaman informasi publik (PPID, Kebijakan Privasi, Aksesibilitas),
// khusus Staf SIDUTama. Respons memuat skema field per halaman.
export function getInfoPages() {
  return api.get<ResourceResponse<InfoPageSection[]>>('/api/info-pages')
}

export function saveInfoPage(page: string, fields: InfoPageValues) {
  return api.put<MessageResponse<SavedInfoPage>>(`/api/info-pages/${page}`, fields)
}
