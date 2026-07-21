// Rotasi status supaya tiap tahap ada contoh datanya waktu testing UI
const STATUS_ROTATION = [
  'pending',
  'rt_approved',
  'rt_rejected',
  'rw_approved',
  'rw_rejected',
  'kadus_approved',
  'kadus_rejected',
  'petugas_approved',
];

export const dummySurat = Array.from({ length: 16 }).map((_, i) => ({
  id: i + 1,
  no_surat: null, // baru terisi kalau status === 'petugas_approved'
  pemohon: 'Budi Santoso',
  pemohon_user_id: 1, // dipakai Warga buat filter "surat saya sendiri"
  nik: '****-****-0042',
  alamat: 'Kp. Cibenda RT 001/RW 001',
  jenis: 'SKD',
  jenis_label: 'SKD — Keterangan Domisili',
  keperluan: 'Pembuatan SKCK',
  tanggal: '19 mei 2026',
  diajukan_at: '19 Mei 2026, 09:10',
  terakhir_diproses_at: '19 Mei 2026, 10:23',
  ip_aktor: '192.168.1.12',
  status: STATUS_ROTATION[i % STATUS_ROTATION.length],
  wilayah: 'RT 001, RW001 - Desa Cibenda',
  // Riwayat keputusan tiap tahap, ditambah otomatis waktu ada aksi approve/reject
  riwayat: [],
}));

// Helper: surat terbit otomatis dapat no_surat waktu status jadi petugas_approved
dummySurat.forEach((s) => {
  if (s.status === 'petugas_approved') {
    s.no_surat = `02${s.id}/SKD/V/2026`;
  }
});