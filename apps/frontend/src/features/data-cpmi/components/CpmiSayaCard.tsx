import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plane } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { letterDetailPath, SELF_LETTER_ROUTE } from '@/features/notifikasi/utils/notificationTarget'
import { StatusPill } from '@/components/ui/StatusPill'
import { HAL_PENGAJUAN_SURAT } from '@/lib/constants/routes'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import { getMigrantWorker, getMyMigrantWorkers, MIGRANT_WORKER_LETTER_CODE } from '../api'
import type { MigrantWorkerDetail, MigrantWorkerSummary } from '../api'
import { CONTRACT_STATUS_LABELS, contractStatusTone, formatDate } from '../constants'

/** Rincian satu keberangkatan, dimuat saat dibuka. */
function CpmiDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<MigrantWorkerDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getMigrantWorker(id)
      .then((data) => {
        if (active) setDetail(data)
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Gagal memuat rincian.'))
      })

    return () => {
      active = false
    }
  }, [id])

  if (error) {
    return (
      <p role="alert" className="sid-admin-alert sid-admin-alert-error">
        {error}
      </p>
    )
  }

  if (!detail) return <p className="sid-upload-description">Memuat rincian...</p>

  const rows: [string, string][] = [
    ['Pemberi kerja', detail.employer_name ?? '-'],
    ['Kontak pemberi kerja', detail.employer_contact ?? '-'],
    ['P3MI / sponsor', detail.agency_name ?? 'Tanpa agensi'],
    ['Gaji & fasilitas', detail.salary_facilities ?? '-'],
    [
      'Penanggung jawab',
      detail.guardian_name
        ? `${detail.guardian_name}${
            detail.guardian_relation_label ? ` (${detail.guardian_relation_label})` : ''
          }${detail.guardian_phone ? ` · ${detail.guardian_phone}` : ''}`
        : '-',
    ],
    ['No. HP / email', [detail.phone, detail.email].filter(Boolean).join(' · ') || '-'],
    ['Dokumen terunggah', `${detail.documents.length} berkas`],
  ]

  return (
    <dl className="sid-identity-grid">
      {rows.map(([label, value]) => (
        <div key={label} className="sid-identity-item">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Data CPMI Saya: riwayat pendataan Calon Pekerja Migran Indonesia milik akun
 * ini, satu baris per keberangkatan. Data hanya bertambah lewat pengajuan
 * Pendataan CPMI (F11) baru. Tidak tampil bila akun belum pernah didata.
 */
export function CpmiSayaCard() {
  const { user } = useAuth()
  const [workers, setWorkers] = useState<MigrantWorkerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    getMyMigrantWorkers()
      .then((data) => {
        if (active) setWorkers(data ?? [])
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Gagal memuat data CPMI.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (loading || (workers.length === 0 && !error)) return null

  // Warga langsung ke form F11; pejabat memilih F11 di Surat Saya.
  const applyPath =
    user?.role === 'warga'
      ? `${HAL_PENGAJUAN_SURAT}/${MIGRANT_WORKER_LETTER_CODE}`
      : SELF_LETTER_ROUTE

  return (
    <section className="sid-card" aria-labelledby="cpmi-saya-heading">
      <h2 id="cpmi-saya-heading" className="sid-section-title">
        Data CPMI Saya
      </h2>
      <p className="sid-upload-description">
        Riwayat pendataan Anda sebagai Calon Pekerja Migran Indonesia yang sudah disetujui Kepala
        Desa. Untuk keberangkatan baru atau perubahan data, ajukan Pendataan CPMI lagi; isian
        sebelumnya akan terisi otomatis.
      </p>

      {error && (
        <p role="alert" className="sid-admin-alert sid-admin-alert-error">
          {error}
        </p>
      )}

      <ul className="sid-sign-request-list">
        {workers.map((worker) => {
          const open = openId === worker.id
          const letterPath = user ? letterDetailPath(user.role, worker.letter_id, true) : null

          return (
            <li key={worker.id} className="sid-sign-request">
              <p className="sid-sign-request-title">
                <Plane size={16} aria-hidden="true" /> {worker.destination_country}
                {worker.position ? ` · ${worker.position}` : ''}
              </p>
              <p className="sid-sign-request-meta">
                Kontrak {formatDate(worker.contract_start)} – {formatDate(worker.contract_end)} ·
                Disetujui {formatDate(worker.approved_at)}
              </p>
              <p>
                <StatusPill tone={contractStatusTone(worker.contract_status)}>
                  {CONTRACT_STATUS_LABELS[worker.contract_status]}
                </StatusPill>
              </p>

              {open && <CpmiDetail id={worker.id} />}

              <div className="sid-sign-request-actions">
                <button
                  type="button"
                  className="sid-btn sid-btn-secondary"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : worker.id)}
                >
                  {open ? 'Tutup rincian' : 'Lihat rincian'}
                </button>
                {letterPath && (
                  <Link className="sid-btn sid-btn-secondary" to={letterPath}>
                    Lihat pengajuan
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="sid-sign-request-actions">
        <Link className="sid-btn sid-btn-primary" to={applyPath}>
          Daftar CPMI lagi
        </Link>
      </div>
    </section>
  )
}
