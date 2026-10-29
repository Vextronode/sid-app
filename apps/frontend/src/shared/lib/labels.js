// Label tampilan untuk nilai enum dari backend (lihat apps/backend/app/Enums).
// Nilai mentah (mis. `kepala_keluarga`, `aktif`) tidak boleh tampil ke
// pengguna; semua label diawali huruf kapital. Singkatan (PLN, PDAM, SD,
// TKI) ditulis eksplisit di peta karena humanize() tidak mengenalnya.

// "kepala_keluarga" -> "Kepala Keluarga". Cadangan untuk nilai di luar peta.
export function humanize(value) {
  if (value === null || value === undefined || value === '') return '-'

  return String(value)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase())
}

export function labelOf(map, value) {
  if (value === null || value === undefined || value === '') return '-'

  return map[value] ?? humanize(value)
}

// Pilihan <option> dari peta label, urut sesuai urutan peta.
export const optionsOf = (map) => Object.entries(map).map(([value, label]) => ({ value, label }))

export const FAMILY_STATUS_LABELS = { aktif: 'Aktif', pindah: 'Pindah', bubar: 'Bubar' }

// SHDK resmi Disdukcapil, urut sesuai kodenya.
export const FAMILY_ROLE_LABELS = {
  kepala_keluarga: 'Kepala Keluarga',
  suami: 'Suami',
  istri: 'Istri',
  anak: 'Anak',
  menantu: 'Menantu',
  cucu: 'Cucu',
  orang_tua: 'Orang Tua',
  mertua: 'Mertua',
  famili_lain: 'Famili Lain',
  pembantu: 'Pembantu',
  lainnya: 'Lainnya',
}

export const BLOOD_TYPE_LABELS = { A: 'A', B: 'B', AB: 'AB', O: 'O', tidak_tahu: 'Tidak Tahu' }

export const MARITAL_STATUS_LABELS = {
  belum_kawin: 'Belum Kawin',
  kawin: 'Kawin',
  kawin_belum_tercatat: 'Kawin Belum Tercatat',
  cerai_hidup: 'Cerai Hidup',
  cerai_hidup_belum_tercatat: 'Cerai Hidup Belum Tercatat',
  cerai_mati: 'Cerai Mati',
}

export const RELIGION_LABELS = {
  islam: 'Islam',
  kristen: 'Kristen',
  katolik: 'Katolik',
  hindu: 'Hindu',
  buddha: 'Buddha',
  konghucu: 'Konghucu',
}

export const LAST_EDUCATION_LABELS = {
  tidak_sekolah: 'Tidak Sekolah',
  sd: 'SD',
  smp: 'SMP',
  sma: 'SMA',
  diploma: 'Diploma',
  s1: 'S1',
  s2: 'S2',
  s3: 'S3',
}

export const DOMICILE_STATUS_LABELS = {
  menetap: 'Menetap',
  merantau_dalam_negeri: 'Merantau Dalam Negeri',
  merantau_luar_negeri: 'Merantau Luar Negeri',
  tki: 'TKI',
}

export const RESIDENCY_TYPE_LABELS = { lokal: 'Lokal', pendatang: 'Pendatang' }

export const SYNC_STATUS_LABELS = {
  synced: 'Tersinkron',
  pending: 'Menunggu Sinkron',
  conflict: 'Konflik Data',
}

export const DATA_SOURCE_LABELS = {
  manual_input_desa: 'Input Manual Desa',
  import_excel: 'Impor Excel',
  dukcapil_sync: 'Sinkron Dukcapil',
}

export const HOUSE_OWNERSHIP_LABELS = {
  milik_sendiri: 'Milik Sendiri',
  sewa: 'Sewa',
  menumpang: 'Menumpang',
  dinas: 'Dinas',
}

export const WATER_SOURCE_LABELS = {
  pdam: 'PDAM',
  sumur: 'Sumur',
  sungai: 'Sungai',
  lainnya: 'Lainnya',
}

export const ELECTRICITY_SOURCE_LABELS = { pln: 'PLN', non_pln: 'Non-PLN', tidak_ada: 'Tidak Ada' }

export const GENDER_LABELS = { L: 'Laki-Laki', P: 'Perempuan' }

// Peta per nama field, dipakai riwayat perubahan (activity log) untuk
// menampilkan nilai lama/baru dengan label yang sama.
export const FIELD_VALUE_LABELS = {
  family_status: FAMILY_STATUS_LABELS,
  family_role: FAMILY_ROLE_LABELS,
  blood_type: BLOOD_TYPE_LABELS,
  marital_status: MARITAL_STATUS_LABELS,
  religion: RELIGION_LABELS,
  last_education: LAST_EDUCATION_LABELS,
  domicile_status: DOMICILE_STATUS_LABELS,
  residency_type: RESIDENCY_TYPE_LABELS,
  sync_status: SYNC_STATUS_LABELS,
  data_source: DATA_SOURCE_LABELS,
  house_ownership_status: HOUSE_OWNERSHIP_LABELS,
  water_source: WATER_SOURCE_LABELS,
  electricity_source: ELECTRICITY_SOURCE_LABELS,
  gender: GENDER_LABELS,
}
