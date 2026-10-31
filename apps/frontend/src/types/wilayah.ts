// Desa dan wilayah administratif (Dusun > RW > RT).
// Sumber: VillageResource, HamletResource, RwResource, RtResource.
import type { IsoDateString, Uuid } from './api'

export type Village = {
  id: Uuid
  name: string
  code: string | null
  head_name: string | null
  address: string | null
  phone: string | null
  district: string | null
  regency: string | null
  province: string | null
  postal_code: string | null
  area_code?: string | null
  email: string | null
  area_ha: number | string | null
  logo_url: string | null
  hero_image_url: string | null
  hero_photo_credit: string | null
  office_hours: string | null
  welcome_message: string | null
  latitude: number | string | null
  longitude: number | string | null
  history: string | null
  vision: string | null
  mission: string | null
}

export type Hamlet = {
  id: number
  name: string
  code: string | null
  is_active: boolean
  village_id: Uuid
  created_at: IsoDateString | null
  updated_at: IsoDateString | null
}

export type Rw = {
  id: number
  hamlet_id: number
  number: string
  full_label: string
  is_active: boolean
  created_at: IsoDateString | null
  updated_at: IsoDateString | null
}

export type Rt = {
  id: number
  rw_id: number
  number: string
  full_label: string
  is_active: boolean
  created_at: IsoDateString | null
  updated_at: IsoDateString | null
}
