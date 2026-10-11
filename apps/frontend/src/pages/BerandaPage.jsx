// ==========================================
// BerandaPage.jsx
// Halaman beranda publik Desa Cibenda.
// Section baru dari features/beranda (beranda.css); section lama
// (kontak) masih memakai Global CSS SID dan
// diganti bertahap sesuai docs/refactor-beranda/PLAN.md.
// ==========================================

import { Phone, MapPin } from 'lucide-react'

import { getBerandaContent } from '@/features/beranda/berandaContent'
import { AnnouncementBar } from '@/features/beranda/components/AnnouncementBar'
import { BerandaHero } from '@/features/beranda/components/BerandaHero'
import { HowToSteps } from '@/features/beranda/components/HowToSteps'
import { NewsSection } from '@/features/beranda/components/NewsSection'
import { ServiceCards } from '@/features/beranda/components/ServiceCards'
import { StatsBand } from '@/features/beranda/components/StatsBand'
import { TransparencySection } from '@/features/beranda/components/TransparencySection'
import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'

// isDev: apakah dummy development dirender (K1). Diisi manual hanya di test.
export function BerandaPage({ isDev = import.meta.env.DEV }) {
  const content = getBerandaContent(isDev)
  const { village, contacts } = usePublicVillageInfo()
  const villageName = village?.name ? `Desa ${village.name}` : 'Desa Cibenda'

  return (
    <>
      <AnnouncementBar content={content} />
      <BerandaHero content={content} />
      <ServiceCards content={content} />
      <StatsBand content={content} />
      <NewsSection content={content} />
      <HowToSteps content={content} />
      <TransparencySection content={content} />

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
    </>
  )
}
