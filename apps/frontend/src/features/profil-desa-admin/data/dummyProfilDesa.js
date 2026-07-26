// ==========================================
// dummyProfilDesa.js
// Dataset dummy profil desa lengkap: hero, statistik, visi-misi,
// perangkat desa utama, dan daftar Kadus. Dipakai KelolaProfilDesaPage
// sampai backend siap.
// ==========================================

export const profilDesa = {
  hero: {
    image: null, // base64 atau URL, null = pakai gambar placeholder
    badge: 'Sugeng Rawuh',
    title: 'Selamat Datang di Cibenda',
    description:
      'Desa Cibenda adalah perwujudan harmoni antara tradisi leluhur dan inovasi digital. Sebagai jantung pertanian dan wilayah, kami berkomitmen pada pembangunan berkelanjutan yang memberdayakan masyarakat melalui transparansi administrasi dan pelestarian lingkungan yang asri.',
  },
  stats: {
    totalPenduduk: 4281,
    pendudukKeterangan: '+2.4% Tahun ini',
    luasWilayah: 124.5,
    luasKeterangan: '65% Lahan Produktif',
    jumlahDusun: 6,
    dusunKeterangan: 'Tersebar di 24 RT / 08 RW',
  },
  visiMisi: {
    visi: 'Mewujudkan Desa Cibenda yang Mandiri, Sejahtera, dan Berbudaya Berbasis Potensi Lokal dan Teknologi.',
    misi: [
      'Meningkatkan kualitas pelayanan publik melalui sistem digitalisasi terpadu.',
      'Mendorong optimalisasi BUMDes untuk kemandirian ekonomi masyarakat desa.',
      'Melestarikan nilai-nilai kearifan lokal dan menjaga kelestarian lingkungan hidup.',
    ],
  },
  perangkatUtama: {
    kepalaDesa: { nama: 'Bapak Rahmad', jabatan: 'Kepala Desa', foto: null },
    sekretarisDesa: { nama: 'Sekretaris Desa', jabatan: 'Administrasi Umum', foto: null },
    kaur: { nama: 'KAUR', jabatan: 'Kepala Urusan', foto: null },
    kasi: { nama: 'KASI', jabatan: 'Kepala Seksi', foto: null },
  },
  kadusList: [
    { id: 1, nama: 'Kadus 01', foto: null },
    { id: 2, nama: 'Kadus 02', foto: null },
    { id: 3, nama: 'Kadus 03', foto: null },
    { id: 4, nama: 'Kadus 04', foto: null },
    { id: 5, nama: 'Kadus 05', foto: null },
    { id: 6, nama: 'Kadus 06', foto: null },
  ],
};