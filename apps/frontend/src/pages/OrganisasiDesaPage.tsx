// ==========================================
// OrganisasiDesaPage.tsx
// Halaman publik struktur organisasi desa:
// - /bpd           : Badan Permusyawaratan Desa
// - /lembaga-desa  : LPM, Karang Taruna, dan PKK (dipilih lewat tab,
//                    tersimpan di ?lembaga= agar bisa dibagikan); BUMDesa
//                    tampil "Segera hadir" dan tidak bisa dipilih
// Bagannya sama dengan Perangkat Desa di Profil Desa (OrgChart).
// Data dari /api/public/village-orgs/{orgType}, dikelola Staf SIDUTama.
// ==========================================

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'
import { PageLoader } from '@/components/ui/PageLoader'
import { PublicPageHead } from '@/components/layout/PublicPageHead'
import { errorBox } from '@/features/beranda/publicClasses'
import { usePublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import { formatVillageName } from '@/shared/lib/villageName'
import {
  NotAvailable,
  OfficialCard,
  orgDivider,
  orgGrid,
  orgRow,
} from '@/features/profil-desa/components/OrgChart'

// GET /api/public/village-orgs/{orgType} (PublicPageService::publicOrganization).
type PublicOrgMember = { id: number; name: string; photo_url: string | null }

type PublicOrganization = {
  org_type: string
  ketua: PublicOrgMember | null
  wakil_ketua: PublicOrgMember | null
  anggota: PublicOrgMember[]
}

type OrgOption = { value: string; label: string; name: string }

type Variant = {
  title: string
  intro: (desa: string) => string
  orgs: OrgOption[]
  comingSoon?: { label: string }[]
}

export type OrganisasiVariant = 'bpd' | 'lembaga'

const VARIANTS: Record<OrganisasiVariant, Variant> = {
  bpd: {
    title: 'Badan Permusyawaratan Desa',
    intro: (desa) =>
      `Susunan Badan Permusyawaratan Desa (BPD) ${desa}, lembaga yang menampung aspirasi warga dan bersama pemerintah desa membahas peraturan desa.`,
    orgs: [{ value: 'bpd', label: 'BPD', name: 'Badan Permusyawaratan Desa' }],
  },
  lembaga: {
    title: 'Lembaga Desa',
    intro: (desa) =>
      `Susunan lembaga kemasyarakatan ${desa} yang menjadi mitra pemerintah desa dalam pemberdayaan warga.`,
    orgs: [
      { value: 'lpm', label: 'LPM', name: 'Lembaga Pemberdayaan Masyarakat' },
      { value: 'karang_taruna', label: 'Karang Taruna', name: 'Karang Taruna' },
      { value: 'pkk', label: 'PKK', name: 'Pemberdayaan Kesejahteraan Keluarga' },
    ],
    // Belum ada datanya: tampil sebagai "Segera hadir", tidak bisa dipilih.
    comingSoon: [{ label: 'BUMDesa' }],
  },
}

const page = 'bd-container pt-[clamp(32px,20px+3vw,64px)]'

const tabClass = (active: boolean) =>
  `inline-flex min-h-11 items-center rounded-full border px-5 text-base font-bold transition-colors ${
    active
      ? 'border-pb-laut bg-pb-laut text-white'
      : 'border-pb-line-strong bg-white text-pb-laut hover:border-pb-laut hover:bg-pb-laut-tint'
  }`

// Lembaga yang belum tersedia: bentuk sama dengan tab, tetapi bukan tombol.
const soonClass =
  'inline-flex min-h-11 cursor-default items-center gap-2 rounded-full border border-dashed border-pb-line-strong bg-white px-5 text-base font-bold text-pb-muted'
const soonBadge = 'rounded-full bg-pb-padi-soft px-2 py-0.5 text-xs font-bold text-pb-padi-ink'

const toCard = (member: PublicOrgMember | null | undefined, jabatan: string) => ({
  nama: member?.name ?? null,
  foto: member?.photo_url ?? null,
  jabatan,
})

function OrganizationChart({ org }: { org: OrgOption }) {
  const [state, setState] = useState<{
    type: string | null
    data: PublicOrganization | null
    error: string | null
  }>({ type: null, data: null, error: null })

  useEffect(() => {
    let active = true

    api
      .get<{ data: PublicOrganization | null }>(`/api/public/village-orgs/${org.value}`, {
        params: publicVillageParams(),
      })
      .then((res) => {
        if (active) setState({ type: org.value, data: res.data?.data ?? null, error: null })
      })
      .catch((err) => {
        if (active) {
          setState({
            type: org.value,
            data: null,
            error: err?.response?.data?.message || `Gagal memuat struktur ${org.label}.`,
          })
        }
      })

    return () => {
      active = false
    }
  }, [org.value, org.label])

  // Data tab sebelumnya tidak ditampilkan selagi tab baru dimuat.
  if (state.type !== org.value) return <PageLoader label={`Memuat struktur ${org.label}...`} />
  if (state.error) return <p className={errorBox}>{state.error}</p>

  const { ketua, wakil_ketua: wakil, anggota = [] } = state.data ?? {}

  return (
    <section aria-labelledby={`struktur-${org.value}`}>
      <h2
        id={`struktur-${org.value}`}
        className="mt-0 mb-8 font-display text-[clamp(30px,22px+1.6vw,44px)] leading-[1.08] font-bold tracking-tight"
      >
        {org.name}
      </h2>

      <div className="flex flex-col items-center">
        <div className={orgRow}>
          <OfficialCard official={toCard(ketua, `Ketua ${org.label}`)} head />
        </div>

        <div className={orgRow}>
          <OfficialCard official={toCard(wakil, `Wakil Ketua ${org.label}`)} />
        </div>
      </div>

      <h3 className={orgDivider}>Anggota</h3>

      {anggota.length > 0 ? (
        <div className={orgGrid}>
          {anggota.map((member) => (
            <OfficialCard key={member.id} official={toCard(member, `Anggota ${org.label}`)} fluid />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <NotAvailable text="Belum ada anggota" />
        </div>
      )}
    </section>
  )
}

export function OrganisasiDesaPage({ variant }: { variant: OrganisasiVariant }) {
  const config = VARIANTS[variant]
  const { village } = usePublicVillageInfo()
  const [searchParams, setSearchParams] = useSearchParams()

  const requested = searchParams.get('lembaga')
  const org = config.orgs.find((o) => o.value === requested) ?? config.orgs[0]
  const desa = formatVillageName(village?.name) ?? 'desa'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [variant])

  return (
    <>
      <PublicPageHead title={config.title}>
        <p>{config.intro(desa)}</p>
      </PublicPageHead>

      <div className={page}>
        {config.orgs.length > 1 && (
          <div className="mb-10 flex flex-wrap items-center gap-2.5">
            <div className="flex flex-wrap gap-2.5" role="tablist" aria-label="Pilih lembaga desa">
              {config.orgs.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="tab"
                  aria-selected={o.value === org.value}
                  className={tabClass(o.value === org.value)}
                  onClick={() => setSearchParams({ lembaga: o.value }, { replace: true })}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Di luar tablist: bukan tab yang bisa dipilih. */}
            {config.comingSoon?.map((o) => (
              <span key={o.label} className={soonClass}>
                {o.label}
                <span className={soonBadge}>Segera hadir</span>
              </span>
            ))}
          </div>
        )}

        <OrganizationChart key={org.value} org={org} />
      </div>
    </>
  )
}
