// ==========================================
// dummyProfilDesa.js
// Dataset dummy profil desa (informasi umum, perangkat desa, visi misi,
// struktur wilayah), dipakai KelolaProfilDesaPage sampai backend siap.
// Data ini juga yang seharusnya ditampilkan di halaman publik ProfilDesaPage.
// ==========================================

export const profilDesa = {
  informasiUmum: {
    namaDesa: 'Cibenda',
    kecamatan: 'Parigi',
    kabupaten: 'Pangandaran',
    kodeDesa: '3201080012',
    kepalaDesa: 'H. Ade Supriatna',
    alamat: 'Jl. Raya Cibenda No. 1',
    telepon: '(0265) 123456',
  },
  perangkatDesa: {
    kepalaDesa: 'H. Ade Supriatna',
    sekretarisDesa: 'Drs. Rudi Hermawan',
    kaurUmum: 'Siti Rahayu, S.Sos',
    kaurKeuangan: 'Agus Purnomo, S.E.',
    kaurPerencanaan: 'Dian Fitriani',
    kasiPemerintahan: 'Bambang Sutrisno',
    kasiPelayanan: 'Neng Yanti, A.Md',
    kasiKesejahteraan: 'H. Maman Suherman',
  },
  visiMisi: {
    visi: 'Terwujudnya Desa Cibenda yang mandiri, sejahtera, dan berdaya saing melalui pemberdayaan masyarakat berbasis potensi lokal.',
    misi: [
      'Meningkatkan kualitas pelayanan publik',
      'Memberdayakan masyarakat desa berbasis potensi lokal',
      'Memperkuat tata kelola desa yang partisipatif',
      'Mengembangkan infrastruktur dan fasilitas desa secara merata',
    ],
  },
  strukturWilayah: [
    { id: 1, nama: 'Dusun Cibenda', jumlahRW: 5, jumlahRT: 1 },
    { id: 2, nama: 'Dusun Cibenda', jumlahRW: 5, jumlahRT: 1 },
  ],
};