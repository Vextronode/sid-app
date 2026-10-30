// Teks baku halaman informasi (D6), berasal dari
// docs/refactor-beranda/08-draf-halaman-informasi.md. Satu-satunya tempat teks
// halaman ini, jadi revisi cukup di sini tanpa menyentuh komponen.
//
// Bagian khas desa tidak ditulis di sini:
// - isian halaman ({ppid_officer}, {periodic_info}, ...) diatur Staf SIDUTama
//   di menu Halaman Informasi (skema: backend App\Support\InfoPageFields);
// - identitas desa ({village.name}, {village.phone}, ...) dari data desa.
// Isian yang masih kosong tampil sebagai penanda kuning dengan label dari
// `placeholders` (teks slot draf asli). Aturan token: lihat infoTemplate.ts.
//
// Blok: { type: 'p' | 'h2' | 'h3', text } atau
// { type: 'ul' | 'ol', items: [teks | { list: 'kunci isian daftar' }] }.
// status: baris di bawah judul. statusOptional: baris status tidak tampil
// selama tokennya kosong (mis. halaman belum pernah disimpan).

// Label slot identitas desa, dipakai ketiga halaman.
const VILLAGE_PLACEHOLDERS = {
  'village.name': 'NAMA DESA',
  'village.fullName': 'NAMA DESA',
  'village.phone': 'TELEPON DESA',
  'village.office_hours': 'JAM LAYANAN KANTOR',
  'village.province': 'PROVINSI',
}

export const INFO_PAGES = {
  'kebijakan-privasi': {
    title: 'Kebijakan Privasi',
    status: 'Berlaku sejak {effective_date:date}.',
    placeholders: {
      ...VILLAGE_PLACEHOLDERS,
      effective_date: 'TANGGAL BERLAKU',
      registration_data: 'DATA LAIN DI FORMULIR PENDAFTARAN, MIS. NOMOR TELEPON ATAU EMAIL',
      server_manager: 'PENGELOLA SERVER',
      retention_period: 'JANGKA WAKTU PENYIMPANAN',
      contact_email: 'EMAIL PENGELOLA DATA',
    },
    blocks: [
      {
        type: 'p',
        text: 'Pemerintah {village.fullName}, mengelola situs ini untuk pelayanan administrasi dan informasi desa. Halaman ini menjelaskan data pribadi apa yang kami kumpulkan, untuk apa, dan apa hak Anda atas data tersebut, sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
      },
      { type: 'h2', text: 'Data yang kami kumpulkan' },
      { type: 'h3', text: 'Saat Anda membuat akun warga' },
      {
        type: 'ul',
        items: [
          'Nomor Induk Kependudukan (NIK)',
          'Nama lengkap',
          { list: 'registration_data' },
          'Nama pengguna dan kata sandi (kata sandi disimpan dalam bentuk terenkripsi)',
        ],
      },
      { type: 'h3', text: 'Saat Anda mengajukan surat' },
      {
        type: 'ul',
        items: [
          'Data yang diminta oleh jenis surat yang Anda pilih, misalnya alamat, pekerjaan, atau keterangan usaha',
          'Dokumen pendukung yang Anda unggah, bila diminta',
          'Riwayat dan status permohonan',
        ],
      },
      { type: 'h3', text: 'Saat Anda menggunakan situs' },
      {
        type: 'ul',
        items: [
          'Cookie sesi agar Anda tetap masuk selama menggunakan layanan. Kami tidak memakai cookie iklan.',
        ],
      },
      { type: 'h2', text: 'Untuk apa data digunakan' },
      {
        type: 'ul',
        items: [
          'Memverifikasi bahwa Anda warga {village.name}',
          'Memproses dan menerbitkan surat yang Anda ajukan',
          'Memberi tahu status permohonan Anda',
          'Menyusun arsip administrasi desa sesuai ketentuan yang berlaku',
        ],
      },
      {
        type: 'p',
        text: 'Kami tidak menjual data Anda dan tidak membagikannya kepada pihak lain, kecuali diwajibkan oleh peraturan perundang-undangan.',
      },
      { type: 'h2', text: 'Siapa yang dapat melihat data Anda' },
      {
        type: 'p',
        text: 'Hanya perangkat desa yang terlibat dalam proses surat Anda, sesuai perannya: Ketua RT, Ketua RW, Kepala Dusun, operator desa, dan Kepala Desa.',
      },
      { type: 'h2', text: 'Penyimpanan dan keamanan' },
      {
        type: 'p',
        text: 'Data disimpan di server yang dikelola {server_manager} dan hanya dapat diakses oleh petugas berwenang. Data permohonan disimpan selama {retention_period} sesuai ketentuan arsip desa.',
      },
      { type: 'h2', text: 'Hak Anda' },
      { type: 'p', text: 'Anda berhak untuk:' },
      {
        type: 'ul',
        items: [
          'Mengetahui data pribadi apa yang kami simpan tentang Anda',
          'Meminta perbaikan data yang keliru',
          'Meminta penghapusan data yang tidak lagi diperlukan, sepanjang tidak bertentangan dengan kewajiban arsip',
          'Mengajukan keberatan atas pemrosesan data Anda',
        ],
      },
      { type: 'h2', text: 'Menghubungi kami' },
      {
        type: 'p',
        text: 'Untuk pertanyaan atau permintaan terkait data pribadi, hubungi kami melalui salah satu cara berikut:',
      },
      {
        type: 'ul',
        items: [
          'Datang ke Kantor {village.name}, {village.office_hours}',
          'Telepon {village.phone}',
          'Email {contact_email|village.email}',
        ],
      },
      { type: 'h2', text: 'Perubahan kebijakan' },
      {
        type: 'p',
        text: 'Kebijakan ini dapat diperbarui. Tanggal berlaku di bagian atas halaman menunjukkan versi terbaru.',
      },
    ],
  },

  aksesibilitas: {
    title: 'Pernyataan Aksesibilitas',
    status: 'Diperbarui {updated_at:date}.',
    statusOptional: true,
    placeholders: {
      ...VILLAGE_PLACEHOLDERS,
      known_limitations: 'KETERBATASAN LAIN',
      contact_email: 'EMAIL KONTAK',
      response_time: 'JANGKA WAKTU TANGGAPAN',
    },
    blocks: [
      {
        type: 'p',
        text: 'Pemerintah {village.name} ingin situs ini dapat digunakan oleh semua warga, termasuk lansia dan penyandang disabilitas.',
      },
      { type: 'h2', text: 'Standar yang kami ikuti' },
      {
        type: 'p',
        text: 'Kami menargetkan kesesuaian dengan Web Content Accessibility Guidelines (WCAG) 2.2 tingkat AA.',
      },
      { type: 'h2', text: 'Yang sudah kami terapkan di beranda' },
      {
        type: 'ul',
        items: [
          'Ukuran teks isi minimal 18 piksel',
          'Kontras warna teks minimal 4,5:1',
          'Seluruh tombol dan tautan dapat digunakan dengan keyboard, dengan penanda fokus yang terlihat',
          'Area sentuh tombol minimal 44 × 44 piksel',
          'Tidak ada konten yang bergerak sendiri; animasi dimatikan bila perangkat Anda meminta gerakan dikurangi',
          'Bahasa halaman ditandai sebagai Bahasa Indonesia untuk pembaca layar',
        ],
      },
      { type: 'h2', text: 'Keterbatasan yang kami ketahui' },
      {
        type: 'ul',
        items: [
          'Halaman selain beranda belum seluruhnya diperiksa dengan standar yang sama',
          'Dokumen PDF yang diunggah mungkin belum dapat dibaca oleh pembaca layar',
          { list: 'known_limitations' },
        ],
      },
      { type: 'h2', text: 'Laporkan kendala' },
      {
        type: 'p',
        text: 'Jika Anda mengalami kesulitan menggunakan situs ini, beri tahu kami dan sebutkan halaman serta kendalanya:',
      },
      {
        type: 'ul',
        items: ['Telepon {village.phone}', 'Email {contact_email|village.email}'],
      },
      { type: 'p', text: 'Kami akan menanggapi dalam {response_time}.' },
    ],
  },

  ppid: {
    title: 'Pejabat Pengelola Informasi dan Dokumentasi (PPID)',
    status: 'Diperbarui {updated_at:date}.',
    statusOptional: true,
    placeholders: {
      ...VILLAGE_PLACEHOLDERS,
      ppid_officer: 'NAMA, JABATAN',
      ppid_supervisor: 'NAMA, JABATAN',
      decree_number: 'NOMOR KEPUTUSAN KEPALA DESA',
      periodic_info:
        'DAFTAR, MIS. PROFIL DESA, APBDES DAN REALISASINYA, RENCANA KERJA PEMERINTAH DESA, PERATURAN DESA',
      immediate_info: 'RINCIAN',
      available_info: 'DAFTAR',
      excluded_info: 'DAFTAR, SESUAI PENETAPAN DESA',
      request_channel: 'EMAIL/SALURAN TERTULIS LAIN',
      copy_fee: 'KETENTUAN',
      ppid_email: 'EMAIL PPID',
    },
    blocks: [
      {
        type: 'p',
        text: 'Setiap orang berhak memperoleh informasi publik dari Pemerintah {village.name}, sesuai Undang-Undang Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik dan Peraturan Komisi Informasi Nomor 1 Tahun 2018 tentang Standar Layanan Informasi Publik Desa.',
      },
      { type: 'h2', text: 'Pengelola informasi' },
      {
        type: 'ul',
        items: [
          'PPID Desa: {ppid_officer}',
          'Atasan PPID: {ppid_supervisor}',
          'Dasar penetapan: {decree_number}',
        ],
      },
      { type: 'h2', text: 'Jenis informasi publik' },
      { type: 'h3', text: 'Informasi yang diumumkan secara berkala' },
      { type: 'ul', items: [{ list: 'periodic_info' }] },
      { type: 'h3', text: 'Informasi yang diumumkan serta-merta' },
      {
        type: 'p',
        text: 'Informasi yang menyangkut keselamatan dan hajat hidup orang banyak, misalnya peringatan bencana.',
      },
      { type: 'ul', items: [{ list: 'immediate_info' }] },
      { type: 'h3', text: 'Informasi yang tersedia setiap saat' },
      { type: 'ul', items: [{ list: 'available_info' }] },
      { type: 'h3', text: 'Informasi yang dikecualikan' },
      { type: 'ul', items: [{ list: 'excluded_info' }] },
      { type: 'h2', text: 'Cara mengajukan permohonan informasi' },
      {
        type: 'ol',
        items: [
          'Ajukan permohonan secara langsung di Kantor {village.name}, atau melalui {request_channel}.',
          'Sertakan identitas Anda, rincian informasi yang diminta, dan tujuan penggunaannya.',
          'Petugas mencatat permohonan dan memberikan nomor pendaftaran.',
          'Pemerintah desa memberikan jawaban paling lambat 10 hari kerja, dan dapat diperpanjang paling lama 7 hari kerja dengan pemberitahuan tertulis.',
        ],
      },
      { type: 'h2', text: 'Keberatan' },
      {
        type: 'p',
        text: 'Jika permohonan ditolak, tidak ditanggapi, atau jawabannya tidak sesuai, Anda dapat mengajukan keberatan tertulis kepada Atasan PPID paling lambat 30 hari kerja. Bila tidak puas dengan tanggapan atas keberatan, Anda dapat mengajukan penyelesaian sengketa ke Komisi Informasi Provinsi {village.province}.',
      },
      { type: 'h2', text: 'Biaya' },
      {
        type: 'p',
        text: 'Layanan informasi tidak dipungut biaya. Biaya penggandaan atau pengiriman salinan dokumen, bila ada: {copy_fee}.',
      },
      { type: 'h2', text: 'Kontak' },
      {
        type: 'ul',
        items: [
          'Kantor {village.name}, {village.office_hours}',
          'Telepon {village.phone}',
          'Email {ppid_email|village.email}',
        ],
      },
    ],
  },
}
