// Satu-satunya tempat konten beranda yang tidak berasal dari API (K1).
//
// - STATIC: copy final dan konten manual. Tampil di development dan production.
//   Kontak aduan (K14) masih dummy; pemilik proyek menggantinya langsung di sini.
// - DEV_ONLY: dummy dari mockup agar layout terlihat utuh saat development.
//   Di production nilainya null, dan komponen yang memakainya tidak dirender.
//
// Pakai getBerandaContent(); jangan impor DEV_ONLY langsung dari komponen.

const STATIC = {
  header: {
    // Nama dari village.name bila tersedia; ini cadangannya.
    fallbackName: 'Desa Cibenda',
    // Placeholder lambang sampai lambang desa tersedia.
    monogram: 'CB',
    nav: {
      berita: 'Berita',
      profil: 'Profil Desa',
      kontak: 'Kontak',
      masuk: 'Masuk Warga',
      menu: 'Menu',
    },
    // A4–A6: teks biasa, bukan link.
    profilComingSoon: ['Sejarah & visi misi', 'Perangkat desa', 'Peta wilayah'],
    comingSoonBadge: 'Segera hadir',
    // A7: tampil hanya bila section Transparansi tampil.
    transparansi: 'Transparansi APBDes',
  },

  // Label bar pengumuman. Isinya dummy (DEV_ONLY.announcement).
  announcementBar: {
    label: 'Pengumuman',
    badge: 'PENGUMUMAN',
    readMore: 'Selengkapnya',
  },

  hero: {
    // File di public/, jadi build tidak gagal bila file tidak ada (K2).
    imageUrl: '/assets/image/beranda/hero-pemandangan.jpg',
    // Kredit "Foto: [NAMA]" hanya tampil bila nama diisi.
    photoCredit: '',
    creditPrefix: 'Foto:',
    greeting: 'Wilujeng Sumping',
    title: 'Urus surat dari rumah, pantau desa dari mana saja.',
    lead: 'Situs resmi Pemerintah Desa Cibenda: layanan administrasi, kabar desa, dan laporan anggaran dalam satu tempat.',
    primaryCta: 'Ajukan Surat',
    secondaryCta: 'Cek Status Surat',
  },

  services: {
    label: 'Layanan populer',
    ajukan: {
      title: 'Ajukan surat',
      description: 'Domisili, SKTM, keterangan usaha, dan lainnya.',
    },
    status: {
      title: 'Cek status permohonan',
      description: 'Lihat apakah surat Anda sudah disetujui RT, RW, dan desa.',
    },
    syarat: {
      title: 'Syarat dokumen',
      description: 'Siapkan berkas yang benar sebelum datang ke kantor.',
      badge: 'Segera hadir',
    },
    pengaduan: {
      title: 'Sampaikan pengaduan',
      // Awalan nama aksesibel baris kontak, mis. "WhatsApp pengaduan +62 …".
      whatsappLabel: 'WhatsApp pengaduan',
      emailLabel: 'Email pengaduan',
    },
  },

  // K14: dummy dari mockup, tampil juga di production. Ganti dengan kontak asli.
  complaint: {
    whatsappLabel: '+62 812-3456-7890',
    // Format wa.me: kode negara tanpa "+" dan tanpa spasi.
    whatsappNumber: '6281234567890',
    email: 'kantordesacibenda@gmail.com',
  },

  news: {
    title: 'Kabar desa',
    subtitle: 'Berita dan kegiatan terbaru dari Desa Cibenda.',
    allLink: 'Semua berita →',
  },

  howTo: {
    title: 'Cara mengajukan surat',
    subtitle: 'Empat langkah, tanpa harus antre di kantor desa.',
    cta: 'Mulai ajukan surat',
    steps: [
      {
        title: 'Masuk ke akun warga',
        description: 'Belum punya akun? Daftar sekali dengan NIK, lalu bisa dipakai seterusnya.',
      },
      {
        title: 'Pilih jenis surat',
        description: 'Setiap jenis surat menampilkan syarat yang perlu disiapkan.',
      },
      {
        title: 'Isi data dan kirim',
        description: 'Lengkapi data yang diminta, lalu kirim permohonan.',
      },
      {
        title: 'Tunggu persetujuan',
        description: 'RT dan RW menyetujui; pantau statusnya kapan saja.',
      },
    ],
  },

  contact: {
    title: 'Butuh bantuan?',
    phoneLabel: 'Telepon / WhatsApp',
    hoursLabel: 'Jam layanan kantor',
    // Teks yang sama dengan FooterDesa (FooterDesa sendiri tidak diubah).
    hours: 'Senin – Jumat, 08.00 – 16.00 WIB',
    officeLabel: 'Kantor Desa Cibenda',
  },

  footer: {
    title: 'Pemerintah Desa Cibenda',
    staffLogin: 'Masuk petugas',
    siteLabel: 'Situs resmi',
    updatedPrefix: 'Terakhir diperbarui',
    supportedBy: 'Didukung oleh',
  },

  // Footer: domain resmi dan tanggal pembaruan. Sudah asli dan final, jadi
  // tampil juga di production (keputusan pemilik, 11 Okt 2026).
  site: {
    domain: 'https://desacibenda.id/',
    updatedAt: '10 Oktober 2026',
  },

  // "Didukung oleh": logo mitra di footer, urut dari kiri ke kanan.
  // Tampil di production karena logonya sudah tersedia (keputusan pemilik, 11 Okt 2026).
  // `id` dipakai sebagai kelas penyesuaian ukuran di beranda.css (bd-partner-logo--<id>).
  // Nama file peka huruf besar/kecil di server production.
  partners: [
    {
      id: 'widyatama',
      name: 'Universitas Widyatama',
      src: '/assets/image/logo-widyatama.webp',
    },
    {
      id: 'pangandaran',
      name: 'Lambang Kabupaten Pangandaran',
      src: '/assets/image/lambang-kabupaten-pangandaran.webp',
    },
    {
      id: 'diktisaintek',
      name: 'Diktisaintek Berdampak',
      src: '/assets/image/Primary_Horizontal-Logo.png',
    },
  ],
}

// Dummy dari reference/mockup.html. Jangan mengarang angka: placeholder
// bertanda kurung siku tetap dibiarkan apa adanya.
const DEV_ONLY = {
  // K6: bar pengumuman.
  announcement: {
    date: '[TANGGAL]',
    title: '[Satu pengumuman penting, mis. kantor desa tutup / jadwal posyandu]',
    newsId: 1,
  },

  // K7: chip kategori, dipasang berurutan ke kartu berita.
  newsCategories: ['Lingkungan', 'Pendidikan', 'Kabar Warga', 'Infrastruktur'],

  // Pita angka.
  stats: {
    items: [
      { value: '4.281', label: 'jiwa penduduk' },
      { value: '124,5 ha', label: 'luas wilayah' },
      { value: '6', label: 'dusun' },
    ],
    asOf: '[BULAN TAHUN]',
  },

  // Transparansi APBDes.
  apbdes: {
    year: '2026',
    description: 'Ke mana dana desa digunakan, dalam angka yang bisa dibaca semua warga.',
    income: 'Rp [JUMLAH]',
    spending: 'Rp [JUMLAH]',
    realizationLabel: '[XX]%',
    // Lebar bilah placeholder di mockup.
    realizationPercent: 50,
    source: 'Siskeudes Desa Cibenda',
    updatedAt: '[TANGGAL]',
    documentUrl: 'https://example.com/apbdes-2026.pdf',
    archiveUrl: 'https://example.com/apbdes-arsip.pdf',
  },

  // Sambutan Kepala Desa. Nama asli dari village.head_name; ini hanya cadangan.
  welcome: {
    quote: '[Dua kalimat sambutan dari Kepala Desa tentang arah pembangunan dan layanan Cibenda.]',
    fallbackName: 'Dede Rusliana',
    role: 'Kepala Desa Cibenda',
  },

  // "Buka di peta" di kartu kantor desa.
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Kantor+Desa+Cibenda',
}

export const DEV_ONLY_KEYS = Object.keys(DEV_ONLY)

/**
 * Konten beranda untuk mode yang diberikan.
 * isDev = false (production): semua kunci DEV_ONLY bernilai null.
 */
export function getBerandaContent(isDev = import.meta.env.DEV) {
  const devContent = Object.fromEntries(
    DEV_ONLY_KEYS.map((key) => [key, isDev ? DEV_ONLY[key] : null]),
  )
  return { ...STATIC, ...devContent }
}
