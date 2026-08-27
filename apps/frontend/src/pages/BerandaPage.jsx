// ==========================================
// BerandaPage.jsx
// Halaman beranda publik Desa Cibenda.
// Styling menggunakan Global CSS SID.
// Logic tidak diubah.
// ==========================================

import { Link } from 'react-router-dom';
import {
  Phone,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react';

// ==========================================
// GALERI FOTO
// ==========================================

const GALLERY_PHOTOS = [
  {
    src: '',
    caption: 'Pemandangan Sawah Cibenda',
  },
  {
    src: '',
    caption: 'Balai Desa Cibenda',
  },
  {
    src: '',
    caption: 'Kegiatan Warga Desa',
  },
];

export function BerandaPage() {
  return (
    <div className="sid-beranda">

      {/* ==========================================
          HERO
          ========================================== */}

      <section className="sid-beranda-hero">

        <h1 className="sid-beranda-hero-title">
          Selamat Datang di
          <br />
          Desa Cibenda
        </h1>

        <p className="sid-beranda-hero-description">
          Layanan administrasi desa kini lebih mudah.
          Semua urusan surat bisa diajukan dari rumah.
        </p>

        <Link
          to="/login"
          className="sid-beranda-hero-button"
        >
          Masuk &amp; Ajukan Surat
        </Link>

      </section>


      {/* ==========================================
          GALERI
          ========================================== */}

      <section className="sid-beranda-gallery">

        <div className="sid-beranda-gallery-container">

          <h2 className="sid-beranda-section-title">
            Keindahan Desa Cibenda
          </h2>

          <p className="sid-beranda-section-description">
            Sekilas pemandangan dan kegiatan di desa kami
          </p>


          <div className="sid-beranda-gallery-grid">

            {GALLERY_PHOTOS.map((photo, i) => (
              <div
                key={i}
                className="sid-beranda-gallery-card"
              >

                <div className="sid-beranda-gallery-image">

                  {photo.src ? (
                    <img
                      src={photo.src}
                      alt={photo.caption}
                    />
                  ) : (
                    <ImageIcon
                      size={32}
                      className="sid-beranda-gallery-placeholder-icon"
                    />
                  )}

                </div>

                <div className="sid-beranda-gallery-caption">

                  <p>
                    {photo.caption}
                  </p>

                </div>

              </div>
            ))}

          </div>

        </div>

      </section>


      {/* ==========================================
          CARA MENGAJUKAN SURAT
          ========================================== */}

      <section className="sid-beranda-how">

        <div className="sid-beranda-how-container">

          <h2 className="sid-beranda-section-title">
            Cara Mengajukan Surat
          </h2>

          <div className="sid-beranda-steps">

            {[
              {
                num: '1',
                text: 'Masuk menggunakan NIK dan kata sandi Anda. Belum punya akun? Daftar dulu.',
              },
              {
                num: '2',
                text: 'Pilih jenis surat yang Anda butuhkan.',
              },
              {
                num: '3',
                text: 'Isi data yang diminta, lalu kirim permohonan.',
              },
              {
                num: '4',
                text: 'Tunggu persetujuan dari RT dan RW. Anda bisa memantau statusnya kapan saja.',
              },
            ].map((step) => (

              <div
                key={step.num}
                className="sid-beranda-step"
              >

                <div className="sid-beranda-step-number">
                  {step.num}
                </div>

                <p>
                  {step.text}
                </p>

              </div>

            ))}

          </div>

        </div>

      </section>


      {/* ==========================================
          KONTAK
          ========================================== */}

      <section className="sid-beranda-contact">

        <div className="sid-beranda-contact-container">

          <h2 className="sid-beranda-section-title">
            Butuh Bantuan?
          </h2>

          <p className="sid-beranda-contact-description">
            Hubungi kantor desa kami, kami siap membantu.
          </p>


          <div className="sid-beranda-contact-list">

            <div className="sid-beranda-contact-item">

              <Phone
                size={22}
                className="sid-beranda-contact-icon"
              />

              <span>
                +62 812-3456-7890
              </span>

            </div>


            <div className="sid-beranda-contact-item">

              <MapPin
                size={22}
                className="sid-beranda-contact-icon"
              />

              <span>
                Kantor Desa Cibenda
              </span>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}