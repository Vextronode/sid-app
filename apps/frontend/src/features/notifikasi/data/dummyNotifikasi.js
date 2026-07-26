// ==========================================
// dummyNotifikasi.js
// Dataset dummy notifikasi, dipakai NotificationPopover.
// ==========================================

export const dummyNotifikasi = [
  {
    id: 1, kategori: 'pelayanan', dibaca: false,
    warga: 'Ahmad Subarjo', waktu: '2 menit yang lalu',
    judul: 'Ahmad Subarjo telah mengajukan surat Domisili',
    deskripsi: 'Mohon segera tinjau kelengkapan berkas pemohon.',
    icon: 'document', warna: 'green',
  },
  {
    id: 2, kategori: 'pelayanan', dibaca: false,
    warga: 'Siti Aminah', waktu: '1 jam yang lalu',
    judul: 'Siti Aminah telah mengajukan surat Keterangan Usaha',
    deskripsi: 'Dokumen pendukung telah diunggah oleh pemohon.',
    icon: 'document', warna: 'blue',
  },
  {
    id: 3, kategori: 'pelayanan', dibaca: true, hari: 'Kemarin',
    warga: 'Budi Santoso', waktu: 'Kemarin, 14:20',
    judul: 'Budi Santoso telah mengajukan surat Pengantar Nikah',
    deskripsi: 'Status: Menunggu verifikasi berkas fisik.',
    icon: 'signature', warna: 'gray',
  },
  {
    id: 4, kategori: 'informasi', dibaca: true, hari: 'Kemarin',
    warga: 'Diana Putri', waktu: 'Kemarin, 09:00',
    judul: 'Diana Putri telah mengajukan surat Keterangan Tidak Mampu',
    deskripsi: 'Permohonan telah diproses dan siap ditandatangani.',
    icon: 'document', warna: 'green',
  },
];