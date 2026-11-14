import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Store } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { letterDetailPath } from '@/features/notifikasi/utils/notificationTarget'
import { StatusPill } from '@/components/ui/StatusPill'
import { confirmDialog } from '@/shared/lib/dialog'
import { notifySuccess } from '@/shared/lib/toast'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import { cancelCimartApplication, getMyBusinesses, requestCimartApplication } from '../api'
import type { CitizenBusiness } from '../api'
import { cimartStatusTone, formatDate } from '../constants'

/**
 * Usaha Saya: usaha dari SKU milik akun ini beserta pendaftaran pedagang
 * Cimart. Warga bisa mendaftar (atau daftar ulang) selama SKU berlaku, dan
 * membatalkan pendaftaran yang belum diproses Cimart. Tidak tampil bila
 * akun belum punya usaha.
 */
export function UsahaSayaCard() {
  const { user } = useAuth()
  const [businesses, setBusinesses] = useState<CitizenBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setBusinesses(await getMyBusinesses())
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Gagal memuat data usaha.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const run = async (business: CitizenBusiness, action: typeof requestCimartApplication) => {
    setBusyId(business.id)
    setError('')

    try {
      const result = await action(business.id)
      notifySuccess(result.message)
      setBusinesses((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      )
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Aksi gagal diproses.'))
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const register = async (business: CitizenBusiness) => {
    const confirmed = await confirmDialog({
      title: `Daftarkan ${business.business_name} ke Cimart?`,
      message:
        'Nama dan NIK Anda, serta nama, kegiatan, kategori, alamat, email, dan nomor HP usaha dari Surat Keterangan Usaha ini akan dikirim ke Cimart untuk membuat akun pedagang. Foto usaha tidak dikirim.',
      confirmLabel: 'Daftarkan',
      tone: 'primary',
    })

    if (confirmed) await run(business, requestCimartApplication)
  }

  const cancel = async (business: CitizenBusiness) => {
    const confirmed = await confirmDialog({
      title: 'Batalkan pendaftaran Cimart?',
      message:
        'Cimart tidak akan memproses pendaftaran ini. Anda bisa mendaftar lagi selama Surat Keterangan Usaha masih berlaku.',
      confirmLabel: 'Batalkan pendaftaran',
      cancelLabel: 'Kembali',
    })

    if (confirmed) await run(business, cancelCimartApplication)
  }

  if (loading || (businesses.length === 0 && !error)) return null

  const letterPath = (business: CitizenBusiness) =>
    business.letter && user ? letterDetailPath(user.role, business.letter.id, true) : null

  return (
    <section className="sid-card" aria-labelledby="usaha-saya-heading">
      <h2 id="usaha-saya-heading" className="sid-section-title">
        Usaha Saya
      </h2>
      <p className="sid-upload-description">
        Usaha dari Surat Keterangan Usaha Anda yang sudah terbit. Data usaha hanya bisa diubah
        dengan mengajukan SKU baru.
      </p>

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      <ul className="sid-sign-request-list">
        {businesses.map((business) => {
          const skuPath = letterPath(business)

          return (
            <li key={business.id} className="sid-sign-request">
              <p className="sid-sign-request-title">
                <Store size={16} aria-hidden="true" /> {business.business_name}
              </p>
              <p className="sid-sign-request-meta">
                {business.category_label} · {business.business_activity}
                {business.letter_status === 'kedaluwarsa'
                  ? ` · SKU kedaluwarsa sejak ${formatDate(business.letter?.expires_at)}`
                  : business.letter?.expires_at
                    ? ` · SKU berlaku sampai ${formatDate(business.letter.expires_at)}`
                    : ''}
              </p>

              <p>
                Status Cimart:{' '}
                <StatusPill tone={cimartStatusTone(business.cimart_status)}>
                  {business.cimart_status_label}
                </StatusPill>
              </p>

              {business.cimart_status === 'rejected' && (
                <>
                  {/* Alasan dari Cimart ditampilkan apa adanya, termasuk tanda bacanya. */}
                  <p className="sid-upload-description">
                    Alasan penolakan: {business.cimart_note ?? '-'}
                  </p>
                  <p className="sid-upload-description">
                    Bila penolakan karena kesalahan data usaha, perbaiki dengan mengajukan SKU baru.
                  </p>
                </>
              )}
              {business.cimart_status === 'accepted' && (
                <p className="sid-upload-description">
                  Akun pedagang Anda sudah dibuat. Untuk menghapus akun, hubungi Cimart.
                </p>
              )}
              {business.letter_status === 'kedaluwarsa' &&
                business.cimart_status !== 'accepted' &&
                business.cimart_status !== 'pending' && (
                  <p className="sid-upload-description">
                    SKU sudah tidak berlaku. Ajukan SKU baru untuk mendaftar ke Cimart.
                  </p>
                )}

              <div className="sid-sign-request-actions">
                {skuPath && (
                  <Link className="sid-btn sid-btn-secondary" to={skuPath}>
                    Lihat SKU
                  </Link>
                )}
                {business.can_cancel_cimart && (
                  <button
                    type="button"
                    className="sid-btn sid-btn-secondary"
                    disabled={busyId !== null}
                    onClick={() => cancel(business)}
                  >
                    {busyId === business.id ? 'Memproses...' : 'Batalkan pendaftaran'}
                  </button>
                )}
                {business.can_request_cimart && (
                  <button
                    type="button"
                    className="sid-btn sid-btn-primary"
                    disabled={busyId !== null}
                    onClick={() => register(business)}
                  >
                    {busyId === business.id
                      ? 'Memproses...'
                      : business.cimart_status === null
                        ? 'Daftarkan ke Cimart'
                        : 'Daftar ulang'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
