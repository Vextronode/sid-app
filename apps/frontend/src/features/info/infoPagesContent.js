// Isi halaman informasi (D6), disalin apa adanya dari
// docs/refactor-beranda/08-draf-halaman-informasi.md. Satu-satunya tempat teks
// halaman ini, jadi revisi cukup di sini tanpa menyentuh komponen.
//
// Status: draf untuk ditinjau Pemerintah Desa Cibenda. Halaman hanya tampil di
// mode dev sampai isinya disetujui.
//
// Blok: { type: 'p' | 'h2' | 'h3', text } atau { type: 'ul' | 'ol', items }.
// Teks [DALAM KURUNG SIKU] adalah slot yang belum diisi; komponen menampilkannya
// sebagai penanda yang terlihat jelas. Jangan diisi dengan tebakan.

export const INFO_PAGES = {
  'kebijakan-privasi': {
    title: 'Kebijakan Privasi',
    status: 'Status: draf, berlaku sejak [TANGGAL BERLAKU].',
    blocks: [
      {
        type: 'p',
        text: 'Pemerintah Desa Cibenda, Kecamatan Parigi, Kabupaten Pangandaran, mengelola situs ini untuk pelayanan administrasi dan informasi desa. Halaman ini menjelaskan data pribadi apa yang kami kumpulkan, untuk apa, dan apa hak Anda atas data tersebut, sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
      },
      { type: 'h2', text: 'Data yang kami kumpulkan' },
      { type: 'h3', text: 'Saat Anda membuat akun warga' },
      {
        type: 'ul',
        items: [
          'Nomor Induk Kependudukan (NIK)',
          'Nama lengkap',
          '[DATA LAIN DI FORMULIR PENDAFTARAN, MIS. NOMOR TELEPON ATAU EMAIL]',
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
          'Memverifikasi bahwa Anda warga Desa Cibenda',
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
        text: 'Data disimpan di server yang dikelola [PENGELOLA SERVER] dan hanya dapat diakses oleh petugas berwenang. Data permohonan disimpan selama [JANGKA WAKTU PENYIMPANAN] sesuai ketentuan arsip desa.',
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
        text: 'Untuk pertanyaan atau permintaan terkait data pribadi, datang ke Kantor Desa Cibenda (Senin – Jumat, 08.00 – 16.00 WIB), telepon (0265) 2640613, atau kirim email ke [EMAIL PENGELOLA DATA].',
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
    status: 'Status: draf, diperbarui Oktober 2026.',
    blocks: [
      {
        type: 'p',
        text: 'Pemerintah Desa Cibenda ingin situs ini dapat digunakan oleh semua warga, termasuk lansia dan penyandang disabilitas.',
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
          '[KETERBATASAN LAIN]',
        ],
      },
      { type: 'h2', text: 'Laporkan kendala' },
      {
        type: 'p',
        text: 'Jika Anda mengalami kesulitan menggunakan situs ini, beri tahu kami melalui telepon (0265) 2640613 atau email [EMAIL KONTAK], dan sebutkan halaman serta kendalanya. Kami akan menanggapi dalam [JANGKA WAKTU TANGGAPAN].',
      },
    ],
  },

  ppid: {
    title: 'Pejabat Pengelola Informasi dan Dokumentasi (PPID)',
    status: 'Status: draf, perlu diverifikasi dan ditetapkan oleh Pemerintah Desa Cibenda.',
    blocks: [
      {
        type: 'p',
        text: 'Setiap orang berhak memperoleh informasi publik dari Pemerintah Desa Cibenda, sesuai Undang-Undang Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik dan Peraturan Komisi Informasi Nomor 1 Tahun 2018 tentang Standar Layanan Informasi Publik Desa.',
      },
      { type: 'h2', text: 'Pengelola informasi' },
      {
        type: 'ul',
        items: [
          'PPID Desa: [NAMA, JABATAN]',
          'Atasan PPID: [NAMA, JABATAN]',
          'Dasar penetapan: [NOMOR KEPUTUSAN KEPALA DESA]',
        ],
      },
      { type: 'h2', text: 'Jenis informasi publik' },
      { type: 'h3', text: 'Informasi yang diumumkan secara berkala' },
      {
        type: 'p',
        text: '[DAFTAR, MIS. PROFIL DESA, APBDES DAN REALISASINYA, RENCANA KERJA PEMERINTAH DESA, PERATURAN DESA]',
      },
      { type: 'h3', text: 'Informasi yang diumumkan serta-merta' },
      {
        type: 'p',
        text: 'Informasi yang menyangkut keselamatan dan hajat hidup orang banyak, misalnya peringatan bencana. [RINCIAN]',
      },
      { type: 'h3', text: 'Informasi yang tersedia setiap saat' },
      { type: 'p', text: '[DAFTAR]' },
      { type: 'h3', text: 'Informasi yang dikecualikan' },
      { type: 'p', text: '[DAFTAR, SESUAI PENETAPAN DESA]' },
      { type: 'h2', text: 'Cara mengajukan permohonan informasi' },
      {
        type: 'ol',
        items: [
          'Ajukan permohonan secara langsung di Kantor Desa Cibenda, atau melalui [EMAIL/SALURAN TERTULIS LAIN].',
          'Sertakan identitas Anda, rincian informasi yang diminta, dan tujuan penggunaannya.',
          'Petugas mencatat permohonan dan memberikan nomor pendaftaran.',
          'Pemerintah desa memberikan jawaban paling lambat 10 hari kerja, dan dapat diperpanjang paling lama 7 hari kerja dengan pemberitahuan tertulis. [VERIFIKASI SESUAI SOP DESA]',
        ],
      },
      { type: 'h2', text: 'Keberatan' },
      {
        type: 'p',
        text: 'Jika permohonan ditolak, tidak ditanggapi, atau jawabannya tidak sesuai, Anda dapat mengajukan keberatan tertulis kepada Atasan PPID paling lambat 30 hari kerja. Bila tidak puas dengan tanggapan atas keberatan, Anda dapat mengajukan penyelesaian sengketa ke Komisi Informasi Provinsi Jawa Barat. [VERIFIKASI SESUAI SOP DESA]',
      },
      { type: 'h2', text: 'Biaya' },
      {
        type: 'p',
        text: 'Layanan informasi tidak dipungut biaya. Biaya penggandaan atau pengiriman salinan dokumen, bila ada: [KETENTUAN].',
      },
      { type: 'h2', text: 'Kontak' },
      {
        type: 'p',
        text: 'Kantor Desa Cibenda · Senin – Jumat, 08.00 – 16.00 WIB · Telepon (0265) 2640613 · [EMAIL PPID]',
      },
    ],
  },
}
