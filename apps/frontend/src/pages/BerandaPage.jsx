// ==========================================
// BerandaPage.jsx
// Section "Apa yang Bisa Anda Lakukan" (3 kartu ikon) DIHAPUS, diganti
// galeri foto pemandangan Desa Cibenda (beberapa slot foto).
// ⚠️ PLACEHOLDER: ganti semua src di GALLERY_PHOTOS dengan foto asli,
// taruh file-nya di public/assets/, contoh: public/assets/sawah-1.jpg
// lalu ganti src jadi "/assets/sawah-1.jpg"
// ==========================================

import { Link } from 'react-router-dom';
import { Phone, MapPin, Image as ImageIcon } from 'lucide-react';

// Daftar foto galeri. src kosong = tampilkan placeholder abu-abu.
// Ganti src dengan path foto asli begitu sudah tersedia.
const GALLERY_PHOTOS = [
  { src: '', caption: 'Pemandangan Sawah Cibenda' },
  { src: '', caption: 'Balai Desa Cibenda' },
  { src: '', caption: 'Kegiatan Warga Desa' },
];

export function BerandaPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-green-700 text-white text-center px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-snug">
          Selamat Datang di<br />Desa Cibenda
        </h1>
        <p className="text-lg md:text-xl text-green-50 max-w-xl mx-auto mb-8">
          Layanan administrasi desa kini lebih mudah. Semua urusan surat bisa diajukan dari rumah.
        </p>
        <Link
          to="/login"
          className="inline-block bg-white text-green-700 text-lg font-bold px-8 py-4 rounded-xl shadow-md hover:bg-green-50"
        >
          Masuk & Ajukan Surat
        </Link>
      </section>

      {/* Galeri foto pemandangan desa — ganti src di GALLERY_PHOTOS */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-2">
          Keindahan Desa Cibenda
        </h2>
        <p className="text-base text-gray-500 text-center mb-10">
          Sekilas pemandangan dan kegiatan di desa kami
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {GALLERY_PHOTOS.map((photo, i) => (
            <div key={i} className="rounded-2xl overflow-hidden shadow-sm">
              <div className="h-56 bg-gradient-to-br from-green-200 to-green-500 flex items-center justify-center relative">
                {photo.src ? (
                  <img src={photo.src} alt={photo.caption} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={32} className="text-white/60" />
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3">
                <p className="text-sm font-medium text-gray-700">{photo.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cara pakai */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-10">
            Cara Mengajukan Surat
          </h2>
          <div className="flex flex-col gap-6">
            {[
              { num: '1', text: 'Masuk menggunakan NIK dan kata sandi Anda. Belum punya akun? Daftar dulu.' },
              { num: '2', text: 'Pilih jenis surat yang Anda butuhkan.' },
              { num: '3', text: 'Isi data yang diminta, lalu kirim permohonan.' },
              { num: '4', text: 'Tunggu persetujuan dari RT dan RW. Anda bisa memantau statusnya kapan saja.' },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-green-600 text-white text-lg font-bold flex items-center justify-center shrink-0">
                  {step.num}
                </div>
                <p className="text-base md:text-lg text-gray-700 pt-1">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kontak */}
      <section className="max-w-3xl mx-auto px-6 py-14 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Butuh Bantuan?</h2>
        <p className="text-lg text-gray-500 mb-8">Hubungi kantor desa kami, kami siap membantu.</p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <div className="flex items-center justify-center gap-3 bg-green-50 rounded-xl px-6 py-4">
            <Phone size={22} className="text-green-600" />
            <span className="text-lg font-semibold text-gray-700">+62 812-3456-7890</span>
          </div>
          <div className="flex items-center justify-center gap-3 bg-green-50 rounded-xl px-6 py-4">
            <MapPin size={22} className="text-green-600" />
            <span className="text-lg font-semibold text-gray-700">Kantor Desa Cibenda</span>
          </div>
        </div>
      </section>
    </div>
  );
}