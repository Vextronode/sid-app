// ==========================================
// HelpCenterModal.tsx
// Popup "Pusat Bantuan" untuk Warga: kontak, alamat, jam operasional
// desa. Dibuka dari ikon Pusat Bantuan di navbar WargaLayout.
// Semua isian dari data desa (Kelola Profil Desa); tanpa data tampil "-".
// ==========================================

import { useEffect } from 'react'
import { X, Phone, Mail, MapPin, Clock, HelpCircle } from 'lucide-react'
import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'

export default function HelpCenterModal({ open, onClose }) {
  const { village } = usePublicVillageInfo()

  // Esc menutup popup.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const phone = village?.phone
  const email = village?.email

  const items = [
    {
      key: 'phone',
      icon: Phone,
      label: 'Telepon / WhatsApp',
      value: phone,
      href: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null,
    },
    {
      key: 'email',
      icon: Mail,
      label: 'Email',
      value: email,
      href: email ? `mailto:${email}` : null,
    },
    { key: 'address', icon: MapPin, label: 'Alamat Kantor Desa', value: village?.address },
    { key: 'hours', icon: Clock, label: 'Jam Operasional', value: village?.office_hours },
  ]

  return (
    <div className="sid-help-modal-overlay" onClick={onClose}>
      <div
        className="sid-help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sid-help-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* =========================
            HEADER
        ========================= */}
        <div className="sid-help-modal-header">
          <div className="sid-help-modal-icon" aria-hidden="true">
            <HelpCircle size={22} />
          </div>

          <div className="sid-help-modal-heading">
            <h2 id="sid-help-modal-title" className="sid-help-modal-title">
              Pusat Bantuan
            </h2>

            <p className="sid-help-modal-subtitle">
              Butuh bantuan? Hubungi kami lewat kanal berikut.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sid-help-modal-close"
            aria-label="Tutup pusat bantuan"
          >
            <X size={20} />
          </button>
        </div>

        {/* =========================
            CONTENT
        ========================= */}
        <div className="sid-help-modal-content">
          <ul className="sid-help-list">
            {items.map(({ key, icon: Icon, label, value, href }) => (
              <li key={key} className="sid-help-item">
                <div className="sid-help-item-icon" aria-hidden="true">
                  <Icon size={18} />
                </div>

                <div className="sid-help-item-content">
                  <p className="sid-help-item-label">{label}</p>

                  {href ? (
                    <a href={href} className="sid-help-item-value sid-help-item-link">
                      {value}
                    </a>
                  ) : (
                    <p className="sid-help-item-value">{value || '-'}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* TUTUP */}
          <button
            type="button"
            onClick={onClose}
            className="sid-btn sid-btn-secondary sid-btn-full sid-help-close-button"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
