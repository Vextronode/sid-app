import type { User } from '@/types'
import { GENDER_LABELS, labelOf, MARITAL_STATUS_LABELS, RELIGION_LABELS } from '@/shared/lib/labels'

function formatBirthDate(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const orDash = (value: string | null | undefined) => (value && value.trim() ? value : '-')

/**
 * Data diri lengkap pemohon dari data penduduk (sesuai KTP/KK), baca saja.
 * Dipakai di section pertama form ber-section (mis. CPMI F11) sebagai
 * pengganti ringkasan AutoFillProfile. Wilayah desa dari profil desa.
 */
export function ApplicantIdentityCard({ user }: { user: User | null }) {
  const citizen = user?.citizen
  const village = citizen?.village
  const birthDate = formatBirthDate(citizen?.date_of_birth)
  const birth =
    citizen?.place_of_birth || birthDate
      ? [citizen?.place_of_birth, birthDate].filter(Boolean).join(', ')
      : null

  const rows: [string, string][] = [
    ['NIK', orDash(user?.nik ?? citizen?.nik_masked)],
    ['Nama Lengkap', orDash(citizen?.name ?? user?.name)],
    ['Tempat, Tanggal Lahir', orDash(birth)],
    ['Jenis Kelamin', citizen?.gender ? labelOf(GENDER_LABELS, citizen.gender) : '-'],
    ['Agama', citizen?.religion ? labelOf(RELIGION_LABELS, citizen.religion) : '-'],
    [
      'Status Perkawinan',
      citizen?.marital_status ? labelOf(MARITAL_STATUS_LABELS, citizen.marital_status) : '-',
    ],
    ['Nama Ibu Kandung', orDash(citizen?.mother_name ?? citizen?.mother_name_text)],
    ['Alamat', orDash(citizen?.address)],
    [
      'RT/RW',
      citizen?.rt?.number != null || citizen?.rw?.number != null
        ? `${citizen?.rt?.number ?? '-'}/${citizen?.rw?.number ?? '-'}`
        : '-',
    ],
    ['Dusun', orDash(citizen?.hamlet?.name)],
    ['Desa/Kelurahan', orDash(village?.name)],
    ['Kecamatan', orDash(village?.district)],
    ['Kabupaten/Kota', orDash(village?.regency)],
    ['Provinsi', orDash(village?.province)],
    ['Kode Pos', orDash(village?.postal_code)],
  ]

  return (
    <>
      <dl className="sid-identity-grid" aria-label="Data diri dari data penduduk">
        {rows.map(([label, value]) => (
          <div key={label} className="sid-identity-item">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="sid-identity-note">
        Data di atas diambil dari data penduduk desa dan harus sama dengan KTP, KK, dan paspor. Bila
        ada yang tidak sesuai, ajukan Perubahan Elemen Data Kependudukan terlebih dahulu.
      </p>
    </>
  )
}
