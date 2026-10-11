// ==========================================
// BerandaPage.jsx
// Halaman beranda publik Desa Cibenda.
// Section baru dari features/beranda (beranda.css); section lama
// (berita, cara mengajukan, kontak) masih memakai Global CSS SID dan
// diganti bertahap sesuai docs/refactor-beranda/PLAN.md.
// ==========================================

import { Link } from 'react-router-dom'
import { Phone, MapPin, Newspaper } from 'lucide-react'

import { getBerandaContent } from '@/features/beranda/berandaContent'
import { AnnouncementBar } from '@/features/beranda/components/AnnouncementBar'
import { BerandaHero } from '@/features/beranda/components/BerandaHero'
import { ServiceCards } from '@/features/beranda/components/ServiceCards'
import { usePublicNews } from '@/features/berita/usePublicNews'
import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'

// isDev: apakah dummy development dirender (K1). Diisi manual hanya di test.
export function BerandaPage({ isDev = import.meta.env.DEV }) {
  const content = getBerandaContent(isDev)
  const { news, loading, error } = usePublicNews()
  const latestNews = news.slice(0, 3)
  const { village, contacts } = usePublicVillageInfo()
  const villageName = village?.name ? `Desa ${village.name}` : 'Desa Cibenda'

  return (
    <>
      <AnnouncementBar content={content} />
      <BerandaHero content={content} />
      <ServiceCards content={content} />

      <div className="sid-beranda">
        {/* ==========================================
            BERITA TERBARU
            ========================================== */}

        <section className="sid-beranda-news">
          <div className="sid-beranda-news-container">
            <div className="sid-beranda-news-header">
              <div>
                <h2 className="sid-beranda-section-title">Berita Terbaru</h2>
                <p className="sid-beranda-section-description">
                  Informasi dan kabar terbaru dari {villageName}
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
                  <Link key={item.id} to={`/berita/${item.id}`} className="sid-beranda-news-card">
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
                      {item.date && <span className="sid-beranda-news-date">{item.date}</span>}
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
            <h2 className="sid-beranda-section-title">Cara Mengajukan Surat</h2>

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
                <div key={step.num} className="sid-beranda-step">
                  <div className="sid-beranda-step-number">{step.num}</div>

                  <p>{step.text}</p>
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
            <h2 className="sid-beranda-section-title">Butuh Bantuan?</h2>

            <p className="sid-beranda-contact-description">
              Hubungi kantor desa kami, kami siap membantu.
            </p>

            <div className="sid-beranda-contact-list">
              <div className="sid-beranda-contact-item">
                <Phone size={22} className="sid-beranda-contact-icon" />

                <span>{village?.phone || '+62 812-3456-7890'}</span>
              </div>

              <div className="sid-beranda-contact-item">
                <MapPin size={22} className="sid-beranda-contact-icon" />

                <span>{village?.address || `Kantor ${villageName}`}</span>
              </div>
            </div>

            {contacts.length > 0 && (
              <ul className="sid-beranda-official-contacts">
                {contacts.map((contact) => (
                  <li key={`${contact.position}-${contact.name}`}>
                    <span>
                      <strong>{contact.name ?? '-'}</strong>
                      {' — '}
                      {contact.position?.replaceAll('_', ' ')}
                    </span>
                    {contact.wa_link && (
                      <a href={contact.wa_link} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
