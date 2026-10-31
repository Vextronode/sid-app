import api from '@/lib/api'
import type { Id, Official, ResourceResponse, Village } from '@/types'
import type {
  AccountPositionData,
  OfficialAssignPayload,
  OfficialCandidate,
  OfficialPayload,
  OfficialPositionType,
  OfficialPositionTypePayload,
  VillageImageKind,
  VillageProfilePayload,
} from './types'

export function getProfilDesa() {
  return api.get<ResourceResponse<Village>>('/api/villages/profile')
}

export function updateProfilDesa(payload: VillageProfilePayload) {
  return api.patch<ResourceResponse<Village>>('/api/villages/profile', payload)
}

// Titik kantor desa dari link Google Maps (termasuk short link maps.app.goo.gl).
// Hanya membaca titiknya; penyimpanan tetap lewat updateProfilDesa.
export function resolveMapLink(url: string) {
  return api.post<ResourceResponse<{ latitude: number; longitude: number }>>(
    '/api/villages/profile/resolve-map-link',
    { url },
  )
}

export function getPerangkatDesa() {
  return api.get<ResourceResponse<Official[]>>('/api/officials')
}

export function updatePerangkatDesa(id: Id, payload: OfficialPayload) {
  return api.patch(`/api/officials/${id}`, payload)
}

export function createPerangkatDesa(payload: OfficialPayload) {
  return api.post('/api/officials', payload)
}

export function deletePerangkatDesa(id: Id) {
  return api.delete(`/api/officials/${id}`)
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

// Penetapan dan rotasi membawa foto pejabat, jadi dikirim multipart.
function toFormData(payload: Record<string, string | number | boolean | Blob | null | undefined>) {
  const formData = new FormData()

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return

    formData.append(key, value instanceof Blob ? value : String(value))
  })

  return formData
}

export function promotePerangkatDesa(payload: OfficialAssignPayload) {
  return api.post('/api/officials/promote', toFormData(payload), multipart)
}

export function demotePerangkatDesa(id: Id, payload: { notes?: string | null } = {}) {
  return api.post(`/api/officials/${id}/demote`, payload)
}

export function rotatePerangkatDesa(id: Id, payload: OfficialAssignPayload) {
  return api.post(`/api/officials/${id}/rotate`, toFormData(payload), multipart)
}

// Cari calon pejabat lewat NIK. Jabatan menentukan apakah calon harus
// sudah punya akun warga.
export function findOfficialCandidate(nik: string, position?: string) {
  return api.post<ResourceResponse<OfficialCandidate>>(
    '/api/officials/candidates/lookup',
    position ? { nik, position } : { nik },
  )
}

// Logo desa dan foto beranda untuk halaman publik.
const VILLAGE_IMAGE_PATHS: Record<VillageImageKind, string> = {
  logo: '/api/villages/profile/logo',
  hero: '/api/villages/profile/hero-image',
}

export function uploadVillageImage(kind: VillageImageKind, file: File) {
  return api.post<ResourceResponse<Village>>(
    VILLAGE_IMAGE_PATHS[kind],
    toFormData({ image: file }),
    multipart,
  )
}

export function uploadOfficialPhoto(officialId: Id, file: File) {
  return api.post(`/api/officials/${officialId}/photo`, toFormData({ photo: file }), multipart)
}

export function deleteOfficialPhoto(officialId: Id) {
  return api.delete(`/api/officials/${officialId}/photo`)
}

// Jenis jabatan desa tanpa akun (Kasi/Kaur/Staf), dikelola Staf SIDUTama.
export function getOfficialPositionTypes() {
  return api.get<
    ResourceResponse<OfficialPositionType[]> & { account_positions?: AccountPositionData[] }
  >('/api/official-position-types')
}

export function createOfficialPositionType(payload: OfficialPositionTypePayload) {
  return api.post('/api/official-position-types', payload)
}

export function updateOfficialPositionType(id: Id, payload: OfficialPositionTypePayload) {
  return api.patch(`/api/official-position-types/${id}`, payload)
}

export function deleteOfficialPositionType(id: Id) {
  return api.delete(`/api/official-position-types/${id}`)
}
