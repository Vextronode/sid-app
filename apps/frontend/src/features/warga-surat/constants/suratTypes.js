// ==========================================
// suratTypes.js
// Konfigurasi semua jenis surat: label, dan daftar field tambahan yang
// spesifik untuk jenis surat itu (di luar field umum: Nama, NIK, Alamat,
// RT/RW yang otomatis terisi dari akun). Field "Keperluan" dipakai hampir
// semua jenis surat, jadi ditulis eksplisit di tiap konfigurasi biar jelas
// mana yang wajib.
// ==========================================

export const SURAT_TYPES = [
  {
    value: 'SKD',
    label: 'Surat Keterangan Domisili',
    fields: [
      { key: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, placeholder: 'Jelaskan keperluan pengajuan surat.....' },
    ],
  },
  {
    value: 'SKBM',
    label: 'Surat Keterangan Belum Menikah',
    fields: [
      { key: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, placeholder: 'Jelaskan keperluan pengajuan surat.....' },
    ],
  },
  {
    value: 'SKU',
    label: 'Surat Keterangan Usaha',
    fields: [
      { key: 'jenisUsaha', label: 'Jenis Usaha', type: 'text', placeholder: 'Jenis Usaha.....' },
      { key: 'lokasiUsaha', label: 'Lokasi Usaha', type: 'text', placeholder: 'lokasi Usaha.....' },
      { key: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, placeholder: 'Jelaskan keperluan pengajuan surat.....' },
    ],
  },
  {
    value: 'SKTMR',
    label: 'Surat Keterangan Tidak Memiliki Rumah',
    fields: [
      { key: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, placeholder: 'Jelaskan keperluan pengajuan surat.....' },
    ],
  },
  {
    value: 'SKP',
    label: 'Surat Keterangan Penghasilan',
    fields: [
      { key: 'jenisUsaha', label: 'Jenis Usaha', type: 'text' },
      { key: 'penghasilanPerbulan', label: 'Penghasil Perbulan', type: 'text', placeholder: 'Rp. 00000.00' },
      { key: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, placeholder: 'Jelaskan keperluan pengajuan surat.....' },
    ],
  },
  {
    value: 'SKTM',
    label: 'Surat Keterangan Tidak Mampu',
    fields: [
      { key: 'keperluanPersyaratan', label: 'Keperluan persyaratan', type: 'text', placeholder: 'keperluan persyaratan surat.....' },
      { key: 'keperluan', label: 'Keperluan', type: 'textarea', required: true, placeholder: 'Jelaskan keperluan pengajuan surat.....' },
    ],
  },
  {
    value: 'SKBN',
    label: 'Surat Keterangan Beda Nama',
    fields: [
      { key: 'namaVersi1', label: 'Nama versi 1', type: 'text', placeholder: 'nama versi 1' },
      { key: 'namaVersi2', label: 'Nama versi 2', type: 'text', placeholder: 'nama versi 2' },
      { key: 'namaVersi3', label: 'Nama versi 3', type: 'text', required: true, placeholder: 'nama versi 3' },
      { key: 'namaVersi4', label: 'Nama versi 4', type: 'text', required: true, placeholder: 'nama versi 1' },
      { key: 'namaBenar', label: 'Nama yang benar', type: 'text', placeholder: 'nama lengkap' },
      { key: 'sumberDokumen', label: 'Sumber dokumen nama benar (mis. akta/ijazah)', type: 'text' },
    ],
  },
  {
    value: 'SKPG',
    label: 'Surat Keterangan Penguburan',
    fields: [
      { key: 'namaAlm', label: 'Nama alm.', type: 'text', placeholder: 'nama' },
      { key: 'hariMeninggal', label: 'Hari meninggal', type: 'date' },
      { key: 'tempatMeninggal', label: 'Tempat meninggal', type: 'text', placeholder: 'tempat' },
      { key: 'sebab', label: 'Sebab', type: 'text', placeholder: 'sakit' },
      { key: 'hariPemakaman', label: 'Hari pemakaman', type: 'date' },
      { key: 'tempatPemakaman', label: 'Tempat pemakaman', type: 'text', placeholder: 'tempat' },
    ],
  },
  {
    value: 'SKK',
    label: 'Surat Keterangan Kelahiran',
    fields: [
      { key: 'namaAyah', label: 'Nama ayah.', type: 'text', placeholder: 'nama' },
      { key: 'nikAyah', label: 'NIK ayah', type: 'text', placeholder: '****-****-0042' },
      { key: 'namaIbu', label: 'Nama ibu', type: 'text', placeholder: 'nama' },
      { key: 'nikIbu', label: 'NIK ibu', type: 'text', placeholder: '****-****-0042' },
      { key: 'tempatLahirAnak', label: 'Tempat lahir anak', type: 'text', placeholder: 'tempat lahir anak' },
      { key: 'tanggalLahirAnak', label: 'Tanggal lahir anak', type: 'date' },
    ],
  },
];

// Semua jenis surat wajib upload dokumen pendukung (sesuai desain: badge
// hijau "Jenis ini: verifikasi document - wajib upload dokumen pendukung")
export const REQUIRES_DOCUMENT = true;