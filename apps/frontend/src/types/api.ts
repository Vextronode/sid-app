// Bentuk umum respons dan error API Laravel.
import type { AxiosError } from 'axios'

// Tanggal/waktu dari backend dikirim sebagai string ISO 8601.
export type IsoDateString = string

// Id di parameter fungsi API. Warga, KK, akun, surat, dan desa memakai UUID
// (string); wilayah, pejabat, jenis surat, dll. memakai angka.
export type Id = number | string

// Primary key UUID di backend (HasUuids).
export type Uuid = string

// Respons satu resource: { data }.
export type ResourceResponse<T> = {
  data: T
}

// Respons dengan pesan sukses: { message, data } (mis. detail surat).
export type MessageResponse<T> = {
  message: string
  data: T
}

// Koleksi tanpa paginasi: { data: [] }.
export type CollectionResponse<T> = {
  data: T[]
}

// Paginasi manual di controller (mis. daftar surat).
export type PageMeta = {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export type PaginatedResponse<T> = {
  message?: string
  data: T[]
  meta: PageMeta
}

// ResourceCollection Laravel yang membungkus paginator: `links` dan `meta`
// ditambahkan otomatis (mis. GET /api/families, /api/citizens).
export type LaravelPaginatedResponse<T> = {
  data: T[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: PageMeta & {
    from: number | null
    to: number | null
    path: string
  }
}

// Body error Laravel: { message, errors? } plus `code` untuk 403 khusus
// (role_forbidden, password_change_required).
export type ApiErrorBody = {
  message?: string
  errors?: Record<string, string[]>
  code?: string
}

export type ApiError = AxiosError<ApiErrorBody>
