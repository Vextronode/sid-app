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
  Newspaper,
} from 'lucide-react';

import { usePublicNews } from '@/features/berita/usePublicNews';

export function BerandaPage() {
  const { news, loading, error } = usePublicNews();
  const latestNews = news.slice(0, 3);

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
          to="/loginpage"
          className="sid-beranda-hero-button"
        >
          Masuk &amp; Ajukan Surat
        </Link>

      </section>


      {/* ==========================================
          BERITA TERBARU
          ========================================== */}

      <section className="sid-beranda-news">
        <div className="sid-beranda-news-container">
          <div className="sid-beranda-news-header">
            <div>
              <h2 className="sid-beranda-section-title">
                Berita Terbaru
              </h2>
              <p className="sid-beranda-section-description">
                Informasi dan kabar terbaru dari Desa Cibenda
              </p>
            </div>
            <Link to="/berita" className="sid-beranda-news-all">
              Lihat semua berita
            </Link>
          </div>

          {loading ? (
            <p className="sid-beranda-news-state" role="status">
              Memuat berita...
            </p>
          ) : error ? (
            <p className="sid-beranda-news-state" role="alert">
              {error}
            </p>
          ) : latestNews.length === 0 ? (
            <p className="sid-beranda-news-state" role="status">
              Belum ada berita yang dipublikasikan.
            </p>
          ) : (
            <div className="sid-beranda-news-grid">
              {latestNews.map((item) => (
                <Link
                  key={item.id}
                  to={`/berita/${item.id}`}
                  className="sid-beranda-news-card"
                >
                  <div className="sid-beranda-news-image">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} />
                    ) : (
                      <Newspaper
                        size={32}
                        className="sid-beranda-news-placeholder"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="sid-beranda-news-content">
                    {item.date && (
                      <span className="sid-beranda-news-date">{item.date}</span>
                    )}
                    <h3>{item.title}</h3>
                    {(item.excerpt || item.content?.[0]) && (
                      <p>{item.excerpt || item.content[0]}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
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
                text: 'Tunggu persetujuan dari RT  . Anda bisa memantau statusnya kapan saja.',
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