// Satu-satunya tempat konten beranda yang tidak berasal dari API (K1): copy
// final dan label. Tampil sama di development dan production; isi yang khas
// desa (pengumuman, sambutan, kontak) datang dari data desa.
// Baris WhatsApp aduan (K14, D2) masih sementara; pemilik proyek menggantinya
// langsung di sini.

import { HAL_AKSESIBILITAS, HAL_KEBIJAKAN_PRIVASI, HAL_PPID } from '@/lib/constants/routes'
import { HAL_BPD, HAL_LEMBAGA, HAL_PROFIL } from '@/lib/constants/routes'

const STATIC = {
  header: {
    // Nama dan lambang dari data desa (village.name, village.logo_url), diatur
    // Petugas Desa. Cadangan netral selagi data belum termuat, agar tidak ada
    // nama desa yang ditulis di kode.
    fallbackName: 'Desa',
    nav: {
      beranda: 'Beranda',
      berita: 'Berita',
      // Judul dropdown; "Profil desa" sendiri menjadi salah satu isinya.
      profil: 'Tentang Desa',
      kontak: 'Kontak',
      masuk: 'Masuk',
      // Pengganti "Masuk" bagi pengguna yang sudah login.
      dashboard: 'Dashboard Saya',
      menu: 'Menu',
    },
    // A4–A7: butir dengan `to` menjadi link; sisanya teks biasa berlabel
    // "Segera hadir".
    profilItems: [
      // Ke bagian paling atas halaman profil (tanpa #); sejarah dan visi misi
      // ada di halaman yang sama.
      { label: 'Profil desa', to: HAL_PROFIL },
      { label: 'Perangkat desa', to: `${HAL_PROFIL}#perangkat-desa` },
      { label: 'Peraturan desa', to: `${HAL_PROFIL}#peraturan-desa` },
      { label: 'BPD', to: HAL_BPD },
      { label: 'Lembaga Desa', to: HAL_LEMBAGA },
      // Data APBDes belum tersedia.
      { label: 'Transparansi APBDes' },
    ],
    comingSoonBadge: 'Segera hadir',
  },

  // Label bar pengumuman. Isinya dari Petugas Desa (menu Pengumuman).
  announcementBar: {
    label: 'Pengumuman desa',
    until: 'berlaku sampai',
    readMore: 'Baca selengkapnya',
    close: 'Tutup',
    openLink: 'Lihat selengkapnya',
    newTabHint: '(tab baru)',
  },

  hero: {
    // Foto dan kreditnya dari data desa (village.hero_image_url,
    // village.hero_photo_credit). Kredit "Foto: [NAMA]" hanya tampil bila diisi.
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
    // Alamat email dari data desa (village.email).
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

  // Label blok Sambutan Kepala Desa. Isinya dari village.welcome_message;
  // blok tidak tampil bila kosong.
  welcomeBlock: {
    label: 'Sambutan Kepala Desa',
    rolePrefix: 'Kepala',
  },

  contact: {
    title: 'Butuh bantuan?',
    // Telepon, email, jam layanan, nama kantor, dan link peta dari data desa
    // (village.phone, email, office_hours, name, latitude/longitude), diatur
    // Petugas Desa.
    phoneLabel: 'Telepon',
    emailLabel: 'Email',
    // Tombol salin; nama aksesibel: "Salin nomor telepon (0265) 2640613".
    copyPhone: 'Salin nomor telepon',
    phoneCopied: 'Nomor disalin',
    phoneCopyFailed: 'Gagal menyalin. Salin nomornya secara manual.',
    copyEmail: 'Salin email',
    emailCopied: 'Email disalin',
    emailCopyFailed: 'Gagal menyalin. Salin emailnya secara manual.',
    hoursLabel: 'Jam layanan kantor',
    officePrefix: 'Kantor',
    notAvailable: 'Belum tersedia',
    // A32: tampil bila titik kantor (village.latitude/longitude) diatur.
    mapLink: 'Buka di peta',
    mapHint: '(tab baru)',
  },

  footer: {
    title: 'Pemerintah Desa Cibenda',
    supportedBy: 'Didukung oleh',
    // Teks pembaca layar untuk logo mitra yang membuka tab baru.
    newTabHint: '(tab baru)',
  },

  // A33–A35: link footer ke halaman informasi (D6). Isian khas desa diatur
  // Petugas Desa di menu Halaman Informasi.
  infoLinks: [
    { label: 'Kebijakan privasi', to: HAL_KEBIJAKAN_PRIVASI },
    { label: 'Aksesibilitas', to: HAL_AKSESIBILITAS },
    { label: 'PPID', to: HAL_PPID },
  ],

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

export function getBerandaContent() {
  return STATIC
}
