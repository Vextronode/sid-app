// Label tampilan halaman Log Aktivitas. Nilai yang disamarkan backend
// ("(disamarkan)") ditampilkan apa adanya.

import { FIELD_VALUE_LABELS, humanize } from '@/shared/lib/labels'

export const POPULATION_TYPE_OPTIONS = [
  { value: 'citizen', label: 'Data Warga' },
  { value: 'family', label: 'Kartu Keluarga' },
]

export const POPULATION_EVENT_LABELS = {
  created: 'Ditambahkan',
  updated: 'Diubah',
  deleted: 'Dihapus',
  imported: 'Impor Excel',
  socioeconomic_updated: 'Sosio-ekonomi diperbarui',
  letter_fulfilled: 'Diubah lewat surat',
}

export const POPULATION_EVENT_OPTIONS = Object.entries(POPULATION_EVENT_LABELS).map(
  ([value, label]) => ({ value, label }),
)

const FIELD_LABELS = {
  // Warga
  nik: 'NIK',
  name: 'Nama',
  date_of_birth: 'Tanggal lahir',
  place_of_birth: 'Tempat lahir',
  gender: 'Jenis kelamin',
  blood_type: 'Golongan darah',
  address: 'Alamat',
  rt_id: 'RT (ID)',
  rw_id: 'RW (ID)',
  hamlet_id: 'Dusun (ID)',
  family_id: 'Kartu Keluarga (ID)',
  family_role: 'Hubungan dalam keluarga',
  father_id: 'Ayah (ID)',
  mother_id: 'Ibu (ID)',
  father_name_text: 'Nama ayah',
  mother_name_text: 'Nama ibu',
  marital_status: 'Status perkawinan',
  occupation_id: 'Pekerjaan (ID)',
  religion: 'Agama',
  last_education: 'Pendidikan terakhir',
  domicile_status: 'Status domisili',
  current_domicile: 'Domisili sekarang',
  residency_type: 'Jenis kependudukan',
  origin_region: 'Daerah asal',
  title_front: 'Gelar depan',
  title_back: 'Gelar belakang',
  birth_certificate_number: 'No. akta lahir',
  marriage_certificate_number: 'No. akta/buku nikah',
  marriage_date: 'Tanggal perkawinan',
  divorce_certificate_number: 'No. akta cerai',
  divorce_date: 'Tanggal perceraian',
  has_disorder: 'Kelainan fisik & mental',
  disability: 'Penyandang cacat',
  is_active: 'Status aktif',
  data_source: 'Sumber data',
  sync_status: 'Status sinkronisasi',
  last_verified_at: 'Terakhir diverifikasi',
  // Kartu Keluarga
  no_kk: 'No. KK',
  family_address: 'Alamat KK',
  family_status: 'Status KK',
  // Sosio-ekonomi
  household_income_range: 'Penghasilan rumah tangga',
  house_ownership_status: 'Status kepemilikan rumah',
  water_source: 'Sumber air',
  electricity_source: 'Sumber listrik',
  dependents_count: 'Jumlah tanggungan',
  productive_assets: 'Aset produktif',
}

export function fieldLabel(field) {
  return FIELD_LABELS[field] ?? humanize(field)
}

// `field` (opsional) memetakan nilai enum ke labelnya, mis. family_role
// `kepala_keluarga` -> "Kepala Keluarga".
export function formatChangeValue(value, field) {
  if (value === null || value === undefined || value === '') return '-'
  if (value === true) return 'Ya'
  if (value === false) return 'Tidak'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-'
  if (typeof value === 'object') {
    const entries = Object.entries(value)

    return entries.length ? entries.map(([key, item]) => `${key}: ${item}`).join(', ') : '-'
  }

  const labels = field ? FIELD_VALUE_LABELS[field] : null

  return labels?.[value] ?? String(value)
}

export function formatDateTime(value) {
  if (!value) return '-'

  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
