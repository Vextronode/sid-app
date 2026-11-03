import api from '@/lib/api'
import type { Id, ResourceResponse } from '@/types'
import type {
  AddOrgMemberPayload,
  EndOrgMemberPayload,
  OrgCitizen,
  OrgMember,
  OrgPosition,
  UpdateOrgMemberPayload,
} from '../types'

// Jabatan organisasi berupa slot tetap (ketua, wakil_ketua, anggota) yang
// dibuat otomatis oleh backend, jadi hanya bisa dibaca.
export function getPositions(orgType?: string) {
  return api.get<ResourceResponse<OrgPosition[]>>('/api/village-org-positions', {
    params: orgType ? { org_type: orgType } : {},
  })
}

// Nama warga desa pemilik NIK; 404 bila NIK tidak ada di desa ini.
export async function lookupOrgCitizen(nik: string) {
  const response = await api.get<ResourceResponse<OrgCitizen>>(
    '/api/village-org-positions/citizen-lookup',
    { params: { nik } },
  )

  return response.data.data
}

// Mengisi slot. Untuk Ketua/Wakil, pemegang lama otomatis diakhiri
// (previous_holder: 'end' | 'to_member'); from_member_id = promosi.
export function addMember(positionId: Id, payload: AddOrgMemberPayload) {
  return api.post<ResourceResponse<OrgMember>>(
    `/api/village-org-positions/${positionId}/members`,
    payload,
  )
}

export function updateMember(positionId: Id, memberId: Id, payload: UpdateOrgMemberPayload) {
  return api.patch<ResourceResponse<OrgMember>>(
    `/api/village-org-positions/${positionId}/members/${memberId}`,
    payload,
  )
}

// Mengosongkan slot Ketua/Wakil (opsional menurunkan jadi Anggota lewat
// to_member) atau mengakhiri keanggotaan. Riwayat tidak dapat dihapus.
export function endMember(positionId: Id, memberId: Id, payload: EndOrgMemberPayload) {
  return api.post<ResourceResponse<OrgMember>>(
    `/api/village-org-positions/${positionId}/members/${memberId}/end`,
    payload,
  )
}

// Unggah/ganti foto profil (multipart, field "photo").
export function uploadMemberPhoto(positionId: Id, memberId: Id, file: File) {
  const form = new FormData()
  form.append('photo', file)

  return api.post<ResourceResponse<OrgMember>>(
    `/api/village-org-positions/${positionId}/members/${memberId}/photo`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
}

export function deleteMemberPhoto(positionId: Id, memberId: Id) {
  return api.delete(`/api/village-org-positions/${positionId}/members/${memberId}/photo`)
}
