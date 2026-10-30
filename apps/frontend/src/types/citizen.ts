// Penduduk, KK, dan pejabat desa.
// Sumber: CitizenResource, CitizenCollection, FamilyResource, OfficialResource.
import type { IsoDateString, LaravelPaginatedResponse } from './api'
import type { Hamlet, Rt, Rw, Village } from './wilayah'

// NIK dan No. KK tidak pernah dikirim utuh (UU PDP), hanya versi tersamar.
export type Citizen = {
  id: number
  village_id: number
  nik_masked: string
  name: string
  date_of_birth: IsoDateString | null
  place_of_birth: string | null
  gender: string | null
  blood_type: string | null
  address: string | null
  rt_id: number | null
  rw_id: number | null
  hamlet_id: number | null
  family_id: number | null
  family?: { id: number; no_kk_masked: string }
  family_role: string | null
  father_id: number | null
  mother_id: number | null
  father_name_text: string | null
  mother_name_text: string | null
  marital_status: string | null
  occupation_id: number | null
  occupation: string | null
  religion: string | null
  last_education: string | null
  domicile_status: string | null
  current_domicile: string | null
  residency_type: string | null
  origin_region: string | null
  title_front: string | null
  title_back: string | null
  birth_certificate_number: string | null
  marriage_certificate_number: string | null
  marriage_date: string | null
  divorce_certificate_number: string | null
  divorce_date: string | null
  has_disorder: boolean
  disability: string | null
  data_source: string | null
  last_verified_at: IsoDateString | null
  sync_status: string | null
  is_active: boolean
  village?: Village
  rt?: Rt
  rw?: Rw
  hamlet?: Hamlet
}

// GET /api/citizens: `total` = jumlah seluruh hasil, bukan jumlah baris halaman.
export type CitizenListResponse = LaravelPaginatedResponse<Citizen> & {
  total: number
}

// GET /api/families/options: semua KK desa untuk pilihan di form warga.
export type FamilyOption = Pick<Family, 'id' | 'no_kk_masked' | 'family_address' | 'head_of_family'>

export type Family = {
  id: number
  village_id: number
  no_kk_masked: string
  family_address: string | null
  family_status: string | null
  rt_id: number | null
  rw_id: number | null
  hamlet_id: number | null
  head_of_family?: { id: number; name: string }
  members_count: number | null
  village?: Village
  rt?: Rt
  rw?: Rw
  hamlet?: Hamlet
  created_at: IsoDateString | null
  updated_at: IsoDateString | null
}

export type Official = {
  id: number
  citizen_id: number | null
  user_id: number | null
  position: string
  position_label: string
  village_id: number
  rt_id: number | null
  rw_id: number | null
  hamlet_id: number | null
  has_signature_img: boolean
  stamp_img: string | null
  photo_img: string | null
  phone_wa: string | null
  started_at: IsoDateString | null
  ended_at: IsoDateString | null
  term_ends_at: IsoDateString | null
  is_active: boolean
  notes: string | null
  created_at: IsoDateString | null
  updated_at: IsoDateString | null
  citizen?: Citizen
  village?: Village
  hamlet?: Hamlet
  rt?: Rt
  rw?: Rw
}
