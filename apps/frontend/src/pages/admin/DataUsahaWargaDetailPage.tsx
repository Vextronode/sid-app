import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { getCitizenBusiness } from '@/features/data-usaha/api'
import type { CitizenBusiness } from '@/features/data-usaha/api'
import { DATA_USAHA_ROUTE } from '@/features/data-usaha/components/CitizenBusinessAccessGate'
import { cimartStatusTone, formatDate } from '@/features/data-usaha/constants'
import { letterDetailPath } from '@/features/notifikasi/utils/notificationTarget'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { StatusPill } from '@/components/ui/StatusPill'
import { getApiErrorMessage } from '@/shared/lib/apiError'

/** Detail satu usaha di Data Usaha Warga (baca saja). */
export default function DataUsahaWargaDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [business, setBusiness] = useState<CitizenBusiness | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getCitizenBusiness(id)
      .then((data) => {
        if (active) setBusiness(data)
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Gagal memuat data usaha.'))
      })

    return () => {
      active = false
    }
  }, [id])

  const letterPath =
    business?.letter && user ? letterDetailPath(user.role, business.letter.id, false) : null

  const rows: [string, ReactNode][] = business
    ? [
        ['Nama Usaha', business.business_name],
        ['Kegiatan Usaha', business.business_activity],
        ['Kategori', business.category_label],
        ['Alamat Usaha', business.address],
        ['Email Usaha', business.email],
        ['Nomor HP Usaha', business.phone],
        ['Pemilik', business.citizen?.name ?? '-'],
        [
          'Surat Keterangan Usaha',
          letterPath ? (
            <Link to={letterPath}>{business.letter?.letter_number ?? 'Lihat surat'}</Link>
          ) : (
            (business.letter?.letter_number ?? '-')
          ),
        ],
        [
          'Status SKU',
          <StatusPill
            key="letter"
            tone={business.letter_status === 'berlaku' ? 'active' : 'danger'}
          >
            {business.letter_status === 'berlaku'
              ? `Berlaku${business.letter?.expires_at ? ` sampai ${formatDate(business.letter.expires_at)}` : ''}`
              : `Kedaluwarsa sejak ${formatDate(business.letter?.expires_at)}`}
          </StatusPill>,
        ],
        [
          'Status Cimart',
          <StatusPill key="cimart" tone={cimartStatusTone(business.cimart_status)}>
            {business.cimart_status_label}
          </StatusPill>,
        ],
        ['Didaftarkan ke Cimart', formatDate(business.cimart_requested_at)],
        ['Diputuskan Cimart', formatDate(business.cimart_decided_at)],
        ['Dibatalkan warga', formatDate(business.cimart_cancelled_at)],
        ['Catatan Cimart', business.cimart_note ?? '-'],
      ]
    : []

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <div className="sid-operator-header">
          <div>
            <Link to={DATA_USAHA_ROUTE} className="sid-btn sid-btn-secondary">
              <ArrowLeft size={16} aria-hidden="true" />
              Kembali ke Data Usaha Warga
            </Link>
            <h1>{business?.business_name ?? 'Detail Usaha'}</h1>
          </div>
        </div>

        {error ? (
          <p role="alert" className="sid-admin-alert sid-admin-alert-error">
            {error}
          </p>
        ) : !business ? (
          <p>Memuat data...</p>
        ) : (
          <div className="sid-detail-box">
            <dl className="sid-detail-grid">
              {rows.map(([label, value]) => (
                <div key={label} style={{ display: 'contents' }}>
                  <dt className="sid-detail-label">{label}</dt>
                  <dd className="sid-detail-value sid-break">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
