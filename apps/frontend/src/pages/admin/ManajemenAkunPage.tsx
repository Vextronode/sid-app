import { useSearchParams } from 'react-router-dom'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { AktivasiAkunSection } from '@/features/aktivasi-akun/components/AktivasiAkunSection'
import { FotoProfilRequestSection } from '@/features/aktivasi-akun/components/FotoProfilRequestSection'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { UserAccountsSection } from '@/features/manajemen-user/components/UserAccountsSection'
import { ACCOUNT_SECTION_PARAM } from '@/lib/constants/routes'
import type { AccountSection } from '@/lib/constants/routes'

const SECTIONS: { value: AccountSection; label: string; stafOnly?: boolean }[] = [
  { value: 'akun', label: 'Manajemen Akun', stafOnly: true },
  { value: 'aktivasi', label: 'Aktivasi Akun' },
  { value: 'foto', label: 'Request Ganti Foto Profil' },
]

/**
 * Manajemen Akun: kelola akun (khusus Staf SIDUTama), aktivasi akun hasil
 * pendaftaran, dan permintaan ganti foto profil warga. RT, RW, dan Kepala
 * Dusun hanya mendapat dua section terakhir. Section yang terbuka disimpan
 * di ?bagian= supaya notifikasi bisa langsung membukanya.
 */
export default function ManajemenAkunPage() {
  const { user } = useAuth()
  const isStaf = user?.role === 'staf_sid'
  const sections = SECTIONS.filter((section) => isStaf || !section.stafOnly)
  const [params, setParams] = useSearchParams()
  const requested = params.get(ACCOUNT_SECTION_PARAM)
  const active = sections.find((section) => section.value === requested) ?? sections[0]

  const open = (value: AccountSection) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set(ACCOUNT_SECTION_PARAM, value)

        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="sid-operator-page sid-admin-users-page">
      <div className="sid-operator-content">
        <div className="sid-operator-header">
          <div>
            <h1>Manajemen Akun</h1>
            <p className="sid-org-subtitle">
              {isStaf
                ? 'Kelola akun pengguna, aktivasi akun warga, dan permintaan ganti foto profil.'
                : 'Aktivasi akun dan permintaan ganti foto profil warga di wilayah Anda.'}
            </p>
          </div>
        </div>

        <div className="sid-wilayah-tabs" role="tablist" aria-label="Pilih bagian">
          {sections.map((section) => (
            <button
              key={section.value}
              type="button"
              role="tab"
              aria-selected={section.value === active.value}
              className={`sid-wilayah-tab${section.value === active.value ? ' sid-wilayah-tab-active' : ''}`}
              onClick={() => open(section.value)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {active.value === 'akun' && <UserAccountsSection />}
        {active.value === 'aktivasi' && <AktivasiAkunSection />}
        {active.value === 'foto' && <FotoProfilRequestSection />}
      </div>

      <SiteFooter />
    </div>
  )
}
