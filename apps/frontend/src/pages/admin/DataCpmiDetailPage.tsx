import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { getMigrantWorker } from '@/features/data-cpmi/api'
import type { MigrantWorkerDetail } from '@/features/data-cpmi/api'
import { DATA_CPMI_ROUTE } from '@/features/data-cpmi/components/MigrantWorkerAccessGate'
import {
  CONTRACT_STATUS_LABELS,
  contractStatusTone,
  DOCUMENT_LABELS,
  formatDate,
} from '@/features/data-cpmi/constants'
import { letterDetailPath } from '@/features/notifikasi/utils/notificationTarget'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { StatusPill } from '@/components/ui/StatusPill'
import { openProtectedFile } from '@/lib/downloadFile'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import {
  GENDER_LABELS,
  LAST_EDUCATION_LABELS,
  labelOf,
  MARITAL_STATUS_LABELS,
  RELIGION_LABELS,
} from '@/shared/lib/labels'

type Row = [string, ReactNode]

const orDash = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '-' : value

function DetailSection({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="sid-detail-box" aria-label={title}>
      <h2 className="sid-form-subsection-title">{title}</h2>
      <dl className="sid-detail-grid">
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt className="sid-detail-label">{label}</dt>
            <dd className="sid-detail-value sid-break">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Detail satu keberangkatan di Data CPMI (baca saja). */
export default function DataCpmiDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [worker, setWorker] = useState<MigrantWorkerDetail | null>(null)
  const [error, setError] = useState('')
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    let active = true

    getMigrantWorker(id)
      .then((data) => {
        if (active) setWorker(data)
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, 'Gagal memuat data CPMI.'))
      })

    return () => {
      active = false
    }
  }, [id])

  const openDocument = async (url: string) => {
    try {
      await openProtectedFile(url)
      setFileError('')
    } catch (requestError) {
      setFileError(getApiErrorMessage(requestError, 'Gagal membuka dokumen.'))
    }
  }

  const letterPath = worker && user ? letterDetailPath(user.role, worker.letter_id, false) : null
  const identity = worker?.identity

  const sections: { title: string; rows: Row[] }[] = worker
    ? [
        {
          title: 'Data Diri & Identitas',
          rows: [
            ['NIK', orDash(identity?.nik)],
            ['Nama Lengkap', orDash(identity?.name)],
            [
              'Tempat, Tanggal Lahir',
              `${identity?.place_of_birth ?? '-'}, ${formatDate(identity?.date_of_birth)}`,
            ],
            ['Jenis Kelamin', identity?.gender ? labelOf(GENDER_LABELS, identity.gender) : '-'],
            ['Agama', identity?.religion ? labelOf(RELIGION_LABELS, identity.religion) : '-'],
            [
              'Status Perkawinan',
              identity?.marital_status
                ? labelOf(MARITAL_STATUS_LABELS, identity.marital_status)
                : '-',
            ],
            [
              'Tinggi / Berat Badan',
              `${orDash(worker.height_cm)} cm / ${orDash(worker.weight_kg)} kg`,
            ],
            ['Nama Ibu Kandung', orDash(identity?.mother_name)],
            [
              'Alamat',
              [
                identity?.address,
                identity?.rt || identity?.rw
                  ? `RT ${identity?.rt ?? '-'}/RW ${identity?.rw ?? '-'}`
                  : null,
                identity?.hamlet ? `Dusun ${identity.hamlet}` : null,
              ]
                .filter(Boolean)
                .join(', ') || '-',
            ],
            ['No. HP / WhatsApp', orDash(worker.phone)],
            ['Email', orDash(worker.email)],
          ],
        },
        {
          title: 'Pendidikan & Kompetensi',
          rows: [
            [
              'Pendidikan Terakhir',
              worker.education_level ? labelOf(LAST_EDUCATION_LABELS, worker.education_level) : '-',
            ],
            ['Sekolah/Universitas', orDash(worker.school_name)],
            ['Jurusan', orDash(worker.major)],
            ['Tahun Lulus', orDash(worker.graduation_year)],
            [
              'Sertifikat Keahlian',
              worker.certificates.length === 0 ? (
                '-'
              ) : (
                <ul>
                  {worker.certificates.map((certificate, index) => (
                    <li key={index}>
                      {[certificate.nama_sertifikat, certificate.penerbit, certificate.tahun]
                        .filter(Boolean)
                        .join(' · ')}
                    </li>
                  ))}
                </ul>
              ),
            ],
            [
              'Pengalaman Kerja',
              worker.work_history.length === 0 ? (
                '-'
              ) : (
                <ul>
                  {worker.work_history.map((job, index) => (
                    <li key={index}>
                      <strong>{job.jabatan ?? '-'}</strong> di {job.perusahaan ?? '-'} (
                      {job.mulai ?? '-'} – {job.selesai ?? '-'})
                      {job.deskripsi ? `: ${job.deskripsi}` : ''}
                    </li>
                  ))}
                </ul>
              ),
            ],
          ],
        },
        {
          title: 'Penanggung Jawab (Kontak Darurat)',
          rows: [
            ['Hubungan', orDash(worker.guardian_relation_label)],
            ['Nama', orDash(worker.guardian_name)],
            ['Alamat', orDash(worker.guardian_address)],
            ['No. HP', orDash(worker.guardian_phone)],
            ['Email', orDash(worker.guardian_email)],
          ],
        },
        {
          title: 'Perusahaan, Sponsor & Negara Tujuan',
          rows: [
            ['Negara Tujuan', worker.destination_country],
            ['Pemberi Kerja (Employer)', orDash(worker.employer_name)],
            ['Alamat Pemberi Kerja', orDash(worker.employer_address)],
            ['Kontak Pemberi Kerja', orDash(worker.employer_contact)],
            ['P3MI / Sponsor', worker.agency_name ?? 'Tanpa agensi'],
            ['Kontak P3MI', orDash(worker.agency_contact)],
            ['Jabatan / Posisi', orDash(worker.position)],
            ['Gaji & Fasilitas', orDash(worker.salary_facilities)],
            [
              'Masa Kontrak',
              `${formatDate(worker.contract_start)} – ${formatDate(worker.contract_end)}`,
            ],
            [
              'Status Kontrak',
              <StatusPill key="contract" tone={contractStatusTone(worker.contract_status)}>
                {CONTRACT_STATUS_LABELS[worker.contract_status]}
              </StatusPill>,
            ],
            [
              'Pengajuan',
              letterPath ? (
                <Link to={letterPath}>Disetujui {formatDate(worker.approved_at)}</Link>
              ) : (
                `Disetujui ${formatDate(worker.approved_at)}`
              ),
            ],
          ],
        },
      ]
    : []

  // Dokumen urut seperti di form; berkas lain (bila ada) menyusul.
  const documents = worker
    ? [...worker.documents].sort((a, b) => {
        const order = Object.keys(DOCUMENT_LABELS)
        const rank = (field: string | null) => {
          const index = order.indexOf(field ?? '')
          return index === -1 ? order.length : index
        }

        return rank(a.field) - rank(b.field)
      })
    : []

  return (
    <div className="sid-operator-page">
      <div className="sid-operator-content">
        <div className="sid-operator-header">
          <div>
            <Link to={DATA_CPMI_ROUTE} className="sid-btn sid-btn-secondary">
              <ArrowLeft size={16} aria-hidden="true" />
              Kembali ke Data CPMI
            </Link>
            <h1>
              {worker
                ? `${worker.citizen?.name ?? identity?.name ?? 'CPMI'} · ${worker.destination_country}`
                : 'Detail CPMI'}
            </h1>
          </div>
        </div>

        {error ? (
          <p role="alert" className="sid-admin-alert sid-admin-alert-error">
            {error}
          </p>
        ) : !worker ? (
          <p>Memuat data...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <DetailSection key={section.title} title={section.title} rows={section.rows} />
            ))}

            <section className="sid-detail-box" aria-label="Dokumen wajib">
              <h2 className="sid-form-subsection-title">Dokumen Wajib</h2>
              {fileError && (
                <p role="alert" className="sid-admin-alert sid-admin-alert-error">
                  {fileError}
                </p>
              )}
              {documents.length === 0 ? (
                <p>Tidak ada dokumen.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {documents.map((document) => (
                    <li key={document.id}>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void openDocument(document.url)}
                      >
                        {(document.field ? DOCUMENT_LABELS[document.field] : null) ??
                          document.original_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
