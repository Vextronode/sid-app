import type { Citizen } from '@/types'

// Isian form Tambah/Edit Warga. Pilihan dan tanggal disimpan sebagai teks
// input; kosong ('') dikirim sebagai null.
export const EMPTY_CITIZEN_FORM = {
  nik: '',
  name: '',
  date_of_birth: '',
  place_of_birth: '',
  gender: 'L',
  address: '',
  rt_id: '',
  family_id: '',
  family_role: '',
  residency_type: 'lokal',
  origin_region: '',
  blood_type: '',
  father_name_text: '',
  mother_name_text: '',
  marital_status: '',
  occupation_id: '',
  religion: '',
  last_education: '',
  domicile_status: 'menetap',
  current_domicile: '',
  // Dokumen & keterangan tambahan (Formulir Biodata Keluarga F-1.01).
  title_front: '',
  title_back: '',
  birth_certificate_number: '',
  marriage_certificate_number: '',
  marriage_date: '',
  divorce_certificate_number: '',
  divorce_date: '',
  has_disorder: false,
  disability: '',
}

export type CitizenForm = typeof EMPTY_CITIZEN_FORM

const dateInput = (value: string | null | undefined) => (value ? String(value).slice(0, 10) : '')

/**
 * Isian form Edit Warga dari data warga. Semua isian ikut diisi: isian yang
 * kosong di form terkirim sebagai null dan menghapus data yang sudah ada.
 * NIK tidak dapat diubah, jadi dibiarkan kosong.
 */
export function citizenToForm(warga: Citizen): CitizenForm {
  return {
    ...EMPTY_CITIZEN_FORM,
    name: warga.name || '',
    date_of_birth: dateInput(warga.date_of_birth),
    place_of_birth: warga.place_of_birth || '',
    gender: warga.gender || 'L',
    address: warga.address || '',
    rt_id: warga.rt_id ? String(warga.rt_id) : '',
    family_id: warga.family_id ? String(warga.family_id) : '',
    family_role: warga.family_role || '',
    residency_type: warga.residency_type || 'lokal',
    origin_region: warga.origin_region || '',
    blood_type: warga.blood_type || '',
    father_name_text: warga.father_name_text || '',
    mother_name_text: warga.mother_name_text || '',
    marital_status: warga.marital_status || '',
    occupation_id: warga.occupation_id ? String(warga.occupation_id) : '',
    religion: warga.religion || '',
    last_education: warga.last_education || '',
    domicile_status: warga.domicile_status || 'menetap',
    current_domicile: warga.current_domicile || '',
    title_front: warga.title_front || '',
    title_back: warga.title_back || '',
    birth_certificate_number: warga.birth_certificate_number || '',
    marriage_certificate_number: warga.marriage_certificate_number || '',
    marriage_date: dateInput(warga.marriage_date),
    divorce_certificate_number: warga.divorce_certificate_number || '',
    divorce_date: dateInput(warga.divorce_date),
    has_disorder: Boolean(warga.has_disorder),
    disability: warga.disability || '',
  }
}
