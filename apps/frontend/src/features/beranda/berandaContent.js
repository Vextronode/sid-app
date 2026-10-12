// Satu-satunya tempat konten beranda yang tidak berasal dari API (K1).
//
// - STATIC: copy final dan konten manual. Tampil di development dan production.
//   Baris WhatsApp aduan (K14, D2) masih sementara; pemilik proyek menggantinya
//   langsung di sini.
// - DEV_ONLY: dummy dari mockup agar layout terlihat utuh saat development.
//   Di production nilainya null, dan komponen yang memakainya tidak dirender.
//
// Pakai getBerandaContent(); jangan impor DEV_ONLY langsung dari komponen.

import { HAL_AKSESIBILITAS, HAL_KEBIJAKAN_PRIVASI, HAL_PPID } from '@/lib/constants/routes'
import { HAL_PROFIL } from '@/lib/constants/routes'

const STATIC = {
  header: {
    // Nama dari village.name bila tersedia; ini cadangannya.
    fallbackName: 'Desa Cibenda',
    // Lambang di samping nama desa, pengganti monogram "CB" (permintaan pemilik,
    // 11 Okt 2026). Dekoratif: nama desa sudah menjadi nama link.
    logoSrc: '/assets/image/lambang-kabupaten-pangandaran.webp',
    nav: {
      berita: 'Berita',
      profil: 'Profil Desa',
      kontak: 'Kontak',
      masuk: 'Masuk Warga',
      menu: 'Menu',
    },
    // A4–A6: butir dengan `to` menjadi link; sisanya teks biasa berlabel
    // "Segera hadir".
    profilItems: [
      { label: 'Sejarah & visi misi' },
      { label: 'Perangkat desa', to: `${HAL_PROFIL}#perangkat-desa` },
      { label: 'Peta wilayah' },
    ],
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
      // Awalan nama aksesibel baris email, mis. "Email pengaduan kantor…".
      emailLabel: 'Email pengaduan',
      // Teks pembaca layar untuk baris WhatsApp yang membuka tab baru.
      newTabHint: '(tab baru)',
    },
  },

  // K14: kontak kartu pengaduan, tampil juga di production.
  complaint: {
    // D2 (12 Okt 2026), sementara: menu "bagikan ke WhatsApp" AddToAny untuk
    // halaman kotak saran, bukan chat ke nomor desa. Dibuka di tab baru
    // (permintaan pemilik). Nanti diganti nomor asli: isi whatsappUrl dengan
    // https://wa.me/62… dan sesuaikan whatsappText.
    whatsappUrl:
      'https://www.addtoany.com/add_to/whatsapp?linkurl=https%3A%2F%2Fdesacibenda.id%2Fkotak-saran%2F&linkname=HUBUNGI%20KAMI&linknote=',
    // Teks baris, sekaligus awal nama aksesibelnya.
    whatsappText: 'Bagikan kotak saran via WhatsApp',
    email: 'kantordesacibenda@gmail.com',
  },

  // Label pita angka. Angkanya dari API (lihat StatsBand), bukan dari sini.
  statsBand: {
    label: 'Desa dalam angka',
    population: 'jiwa penduduk',
    area: 'luas wilayah',
    hamlets: 'dusun',
    profileLink: 'Lihat profil desa →',
  },

  news: {
    title: 'Kabar desa',
    subtitle: 'Berita dan kegiatan terbaru dari Desa Cibenda.',
    allLink: 'Semua berita →',
    // Teks keadaan sama dengan beranda lama; pesan error berasal dari usePublicNews.
    loading: 'Memuat berita...',
    empty: 'Belum ada berita yang dipublikasikan.',
  },

  howTo: {
    title: 'Cara mengajukan surat',
    subtitle: 'Empat langkah, tanpa harus antre di kantor desa.',
    cta: 'Mulai ajukan surat',
    // Ditampilkan kapital lewat CSS: "LANGKAH 1".
    stepLabel: 'Langkah',
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

  // Label section Transparansi. Angkanya dummy (DEV_ONLY.apbdes).
  transparency: {
    // Ditampilkan kapital lewat CSS: "TRANSPARANSI".
    label: 'Transparansi',
    titlePrefix: 'APBDes Cibenda',
    documentLink: 'Unduh dokumen APBDes (PDF)',
    archiveLink: 'Arsip tahun sebelumnya',
    // Teks pembaca layar untuk link yang membuka tab baru (03, Persyaratan umum).
    documentHint: '(tab baru)',
    archiveHint: '(PDF, tab baru)',
    income: 'Pendapatan',
    spending: 'Belanja',
    realization: 'Realisasi belanja',
    sourcePrefix: 'Sumber:',
    updatedPrefix: 'Diperbarui',
  },

  // Label blok Sambutan Kepala Desa. Isinya dummy (DEV_ONLY.welcome).
  welcomeBlock: {
    // Ditampilkan kapital lewat CSS: "SAMBUTAN KEPALA DESA".
    label: 'Sambutan Kepala Desa',
  },

  contact: {
    title: 'Butuh bantuan?',
    // Judul kartu, juga awalan nama aksesibel link: "Telepon (0265) 2640613".
    phoneLabel: 'Telepon',
    // Nomor telepon kantor (permintaan pemilik, 11 Okt 2026).
    phone: '(0265) 2640613',
    hoursLabel: 'Jam layanan kantor',
    // Teks yang sama dengan FooterDesa (FooterDesa sendiri tidak diubah).
    hours: 'Senin – Jumat, 08.00 – 16.00 WIB',
    officeLabel: 'Kantor Desa Cibenda',
    // A32: tampil bila mapUrl diisi.
    mapLink: 'Buka di peta',
    mapHint: '(tab baru)',
  },

  footer: {
    title: 'Pemerintah Desa Cibenda',
    staffLogin: 'Masuk petugas',
    siteLabel: 'Situs resmi',
    updatedPrefix: 'Terakhir diperbarui',
    supportedBy: 'Didukung oleh',
    // Teks pembaca layar untuk logo mitra yang membuka tab baru.
    newTabHint: '(tab baru)',
  },

  // Footer: domain resmi dan tanggal pembaruan. Sudah asli dan final, jadi
  // tampil juga di production (keputusan pemilik, 11 Okt 2026).
  site: {
    domain: 'https://desacibenda.id/',
    // D3 (12 Okt 2026): bulan dan tahun saja.
    updatedAt: 'Oktober 2026',
  },

  // "Buka di peta" di kartu kantor desa. Link asli, tampil juga di production
  // (D1, 12 Okt 2026).
  mapUrl: 'https://maps.app.goo.gl/sVU5Xqmasq4UTJ4N6',

  // "Didukung oleh": logo mitra di footer, urut dari kiri ke kanan.
  // Tampil di production karena logonya sudah tersedia (keputusan pemilik, 11 Okt 2026).
  // `id` dipakai sebagai kelas penyesuaian ukuran di beranda.css (bd-partner-logo--<id>).
  // Nama file peka huruf besar/kecil di server production.
  partners: [
    {
      id: 'widyatama',
      name: 'Universitas Widyatama',
      src: '/assets/image/logo-widyatama.webp',
      // Opsional: logo menjadi link ke situs mitra di tab baru.
      url: 'https://www.widyatama.ac.id/',
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

  // A33–A35: link footer ke halaman informasi (D6). Halamannya masih draf dan
  // route-nya hanya terdaftar di dev, jadi link ikut tersembunyi di production.
  infoLinks: [
    { label: 'Kebijakan privasi', to: HAL_KEBIJAKAN_PRIVASI },
    { label: 'Aksesibilitas', to: HAL_AKSESIBILITAS },
    { label: 'PPID', to: HAL_PPID },
  ],
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
