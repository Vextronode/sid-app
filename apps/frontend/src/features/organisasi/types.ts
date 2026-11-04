// Organisasi desa (BPD, LPM, PKK, Karang Taruna): jabatan berupa slot tetap
// yang dibuat backend (VillageOrgPositionResource).
import type { IsoDateString } from '@/types'

export type OrgSlot = 'ketua' | 'wakil_ketua' | 'anggota'

// Pemegang jabatan: warga desa (dipilih lewat NIK). Baris yang berakhir
// (is_active=false) adalah riwayat dan tidak dapat diubah/dihapus.
export type OrgMember = {
  id: number
  position_id: number
  citizen_id: string | null
  nik_masked: string | null
  member_name: string
  photo_img: string | null
  phone_wa: string | null
  started_at: IsoDateString | null
  ended_at: IsoDateString | null
  is_active: boolean
  notes: string | null
}

export type OrgPosition = {
  id: number
  village_id: string
  org_type: string
  slot: OrgSlot
  position_label: string
  is_single_occupant: boolean
  sort_order: number
  is_active: boolean
  members?: OrgMember[]
}

export type OrgSlots = Record<OrgSlot, OrgPosition | null>

// Mengisi slot: warga desa lewat NIK, atau promosi anggota (from_member_id).
// previous_holder: nasib pemegang Ketua/Wakil lama.
export type AddOrgMemberPayload = {
  nik?: string | null
  from_member_id?: number | null
  previous_holder?: 'end' | 'to_member'
  phone_wa?: string | null
  started_at: string
  notes?: string | null
}

// Nama mengikuti data warga; yang bisa diubah hanya kontak dan catatan.
export type UpdateOrgMemberPayload = {
  phone_wa?: string | null
  notes?: string | null
}

// Warga desa pemilik NIK (pengisian nama otomatis di form).
export type OrgCitizen = { citizen_id: string; name: string; nik_masked: string }

export type EndOrgMemberPayload = { ended_at?: string | null; to_member?: boolean }
