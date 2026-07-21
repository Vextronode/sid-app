// ==========================================
// jenisSuratConfig.js (GLOBAL)
// Menentukan siapa yang bertanggung jawab approve tahap akhir untuk tiap
// jenis surat: 'kasi' (Kasi Pelayanan) atau 'kaur' (Kaur TU Umum).
// Kadus tetap approve semua jenis surat (gate-nya di tahap sebelum ini),
// tapi di tahap FINAL, gate-nya jadi per-jenis surat sesuai daftar ini.
// ==========================================

export const JENIS_SURAT_PENANGGUNG_JAWAB = {
  // Semua 9 jenis surat yang sudah ada di sistem = tanggung jawab KAUR
  SKD: 'kaur',
  SKBM: 'kaur',
  SKU: 'kaur',
  SKTMR: 'kaur',
  SKP: 'kaur',
  SKTM: 'kaur',
  SKBN: 'kaur',
  SKPG: 'kaur',
  SKK: 'kaur',

  // TODO: jenis surat Kasi (SPTJM, Surat Pernyataan, Formulir, dll)
  // belum ada di sistem — nanti ditambahkan di sini begitu jenis surat
  // barunya dibangun di suratTypes.js
};

// Helper: cek surat ini tanggung jawab siapa
export function getPenanggungJawab(jenisKode) {
  return JENIS_SURAT_PENANGGUNG_JAWAB[jenisKode] ?? 'kaur'; // default kaur kalau belum terdaftar
}