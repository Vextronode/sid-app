// ==========================================
// ProfilDesaPage.jsx
// Halaman publik Profil Desa.
// Isinya sama dengan KelolaProfilDesaPage (tanpa tombol edit),
// tetapi tampilannya mengikuti halaman publik lain.
// Ditata dengan utility Tailwind, di bawah .pub milik MainLayout.
//
// Data diambil dari API /api/public/village-profile.
// Field yang belum dikirim backend ditampilkan
// sebagai "Belum tersedia" (tanpa data dummy).
// ==========================================

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Users, Building2, Home, MapPin, Phone } from 'lucide-react'

import api from '../lib/api' // Integrasi API Axios
import { publicVillageParams } from '../shared/lib/api/publicVillageParams'
import { PageLoader } from '@/components/ui/PageLoader'
import { PublicPageHead } from '@/components/layout/PublicPageHead'
import { errorBox } from '@/features/beranda/publicClasses'
import { formatVillageName } from '@/shared/lib/villageName'
import {
  NA,
  NotAvailable,
  OfficialCard,
  orgDivider,
  orgGrid,
  orgRow,
} from '@/features/profil-desa/components/OrgChart'
import { PeraturanList } from '@/features/peraturan/components/PeraturanList'

const page = 'bd-container pt-[clamp(32px,20px+3vw,64px)]'
const statValue =
  'mt-0.5 mb-0 font-display text-[clamp(30px,24px+1.2vw,40px)] leading-[1.05] font-bold tracking-tight text-pb-laut-deep tabular-nums'
const subtitle = 'mt-0 mb-4 text-base font-bold text-pb-laut'
// Alamat dan telepon di kepala halaman.
const headChip =
  'inline-flex items-center gap-2 rounded-full border border-pb-line bg-white px-4 py-2 text-base leading-snug text-pb-ink shadow-sm'

// Satu baris statistik; ikon tanpa kotak latar.
function StatItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-4.5 px-7 py-6 [&+&]:border-t [&+&]:border-pb-line md:[&+&]:border-t-0 md:[&+&]:border-l">
      <Icon className="flex-none text-pb-laut" size={26} strokeWidth={1.8} aria-hidden="true" />

      <div>
        <p className="m-0 text-[15px] text-pb-muted">{label}</p>
        {children}
      </div>
    </div>
  )
}

// ==========================================
// PEMETAAN RESPONSE BACKEND -> DATA HALAMAN
// Kalau backend menambah field baru (penduduk, luas,
// dusun, perangkat, foto), cukup ubah fungsi ini.
// ==========================================

function toSlot(id, jabatan, official) {
  return {
    id,
    jabatan,
    nama: official?.name || null,
    foto: official?.photo_url || null,
  }
}

// Kasi, Kaur, dan Staf. Daftar dan urutan jabatannya dikirim backend
// (`positions`), jadi jenis jabatan yang ditambah Petugas Desa langsung
// tampil. Jabatan yang belum terisi tetap punya satu slot "Belum tersedia";
// jabatan yang dijabat beberapa orang tampil satu kartu per orang.
function mapStaff(officials, positions) {
  return positions.flatMap(({ code, label }) => {
    const holders = officials.filter((official) => official.position === code)

    return holders.length > 0
      ? holders.map((official) => toSlot(`${code}-${official.id}`, label, official))
      : [toSlot(code, label, null)]
  })
}

// Satu slot Kepala Dusun per dusun aktif. Bila daftar dusun tidak dikirim,
// yang tampil hanya Kadus yang sedang menjabat.
function mapKadus(officials, hamlets) {
  const kadus = officials.filter((official) => official.position === 'kadus')
  const label = (name) => (/^dusun\b/i.test(name ?? '') ? `Kepala ${name}` : `Kepala Dusun ${name}`)

  if (hamlets.length === 0) {
    return kadus.map((official) =>
      toSlot(
        official.id,
        official.hamlet_name ? label(official.hamlet_name) : 'Kepala Dusun',
        official,
      ),
    )
  }

  return hamlets.map((hamlet) =>
    toSlot(
      hamlet.id,
      label(hamlet.name),
      kadus.find((official) => official.hamlet_id === hamlet.id),
    ),
  )
}

function mapProfile(raw, officials = [], hamlets = [], positions = [], stats = null) {
  const byPosition = (position) => officials.find((official) => official.position === position)
  const kepalaDesa = byPosition('kepala_desa')
  const missionList = Array.isArray(raw?.mission)
    ? raw.mission
    : typeof raw?.mission === 'string'
      ? raw.mission
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

  return {
    // Nama, alamat, dan telepon dari data desa (diatur Petugas Desa).
    name: formatVillageName(raw?.name),
    address: raw?.address || null,
    phone: raw?.phone || null,
    history: raw?.history || null,
    vision: raw?.vision || null,
    misi: missionList,

    // Foto yang sama dengan hero beranda.
    heroImage: raw?.hero_image_url || null,

    // Penduduk (warga aktif) dan dusun (dusun aktif) dihitung backend dari
    // data; luas wilayah diisi Petugas Desa. Nol atau kosong dianggap
    // belum tersedia.
    totalPenduduk: stats?.total_population || null,
    luasWilayah: raw?.area_ha || null,
    jumlahDusun: stats?.total_hamlets || null,

    // RT, RW, dan Petugas Desa tidak ditampilkan di halaman publik.
    kepalaDesa: {
      nama: kepalaDesa?.name || raw?.head_name || null,
      jabatan: 'Kepala Desa',
      foto: kepalaDesa?.photo_url || null,
    },
    sekretarisDesa: toSlot('sekretaris_desa', 'Sekretaris Desa', byPosition('sekretaris_desa')),
    perangkatList: mapStaff(officials, positions),
    kadusList: mapKadus(officials, hamlets),
  }
}

export function ProfilDesaPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { hash, key } = useLocation()

  useEffect(() => {
    let active = true

    const fetchProfilData = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await api.get('/api/public/village-profile', { params: publicVillageParams() })

        if (active) {
          setData(
            mapProfile(
              res.data?.data,
              res.data?.officials ?? [],
              res.data?.hamlets ?? [],
              res.data?.positions ?? [],
              res.data?.stats ?? null,
            ),
          )
        }
      } catch (err) {
        console.error('Gagal memuat profil desa dari API:', err)
        if (active) setError(err?.response?.data?.message || 'Gagal memuat profil desa.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchProfilData()

    return () => {
      active = false
    }
  }, [])

  // Tautan seperti /profil-desa#perangkat-desa baru bisa digulir setelah
  // datanya tampil. Tanpa hash, mulai dari paling atas: router tidak
  // mengembalikan posisi gulir, jadi posisi halaman sebelumnya ikut terbawa.
  // `key` membuat klik ulang tautan yang sama tetap menggulir.
  useEffect(() => {
    if (!data) return

    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView?.()
    } else {
      window.scrollTo(0, 0)
    }
  }, [data, hash, key])

  // ==========================================
  // STATE LOADING & ERROR
  // ==========================================

  if (loading) {
    return (
      <div className={page}>
        <PageLoader label="Memuat profil desa..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={page}>
        <p className={errorBox}>{error || 'Data profil desa tidak tersedia.'}</p>
      </div>
    )
  }

  return (
    <>
      {/* ==========================================
          HEADER
          ========================================== */}

      <PublicPageHead title={`Profil ${data.name ?? 'Desa'}`}>
        <p>
          Halaman resmi informasi tata kelola dan capaian strategis {data.name ?? 'desa'} untuk
          transparansi publik.
        </p>

        {(data.address || data.phone) && (
          <div className="mt-6 flex flex-wrap gap-2.5">
            {data.address && (
              <span className={headChip}>
                <MapPin className="flex-none text-pb-laut" size={18} aria-hidden="true" />
                {data.address}
              </span>
            )}

            {data.phone && (
              <a
                href={`tel:${data.phone.replace(/[^\d+]/g, '')}`}
                className={`${headChip} font-semibold text-pb-laut no-underline hover:border-pb-laut hover:bg-pb-laut-tint`}
              >
                <Phone className="flex-none" size={18} aria-hidden="true" />
                Telp. {data.phone}
              </a>
            )}
          </div>
        )}
      </PublicPageHead>

      <div className={page}>
        {/* ==========================================
            SEJARAH: gambar di kiri, teks di kanan
            (bertumpuk di layar kecil)
            ========================================== */}

        <section className="grid items-center gap-[clamp(28px,16px+3vw,64px)] lg:grid-cols-2">
          <div className="aspect-4/3 overflow-hidden rounded-3xl bg-pb-laut-deep bg-(image:--pb-contour-light)">
            {data.heroImage && (
              <img
                src={data.heroImage}
                alt={`Profil ${data.name ?? 'desa'}`}
                className="size-full object-cover"
              />
            )}
          </div>

          <div>
            <span className="mb-3 inline-flex items-center gap-2.5 text-[15px] font-bold text-pb-laut before:h-0.75 before:w-6 before:rounded-full before:bg-pb-padi before:content-['']">
              Sejarah singkat
            </span>

            <h2 className="m-0 font-display text-[clamp(28px,22px+1.4vw,40px)] leading-[1.05] font-bold tracking-tight text-pb-laut-deep">
              {data.name ?? 'Desa'}
            </h2>

            <p className="mt-4 mb-0 max-w-[62ch] text-[17px] leading-relaxed whitespace-pre-line text-pb-ink">
              {data.history || `Sejarah desa ${NA.toLowerCase()}.`}
            </p>
          </div>
        </section>

        {/* ==========================================
            STATISTIK
            ========================================== */}

        <section className="mt-[clamp(32px,20px+3vw,56px)]">
          <div className="grid overflow-hidden rounded-3xl border border-pb-line bg-white md:grid-cols-3">
            <StatItem icon={Users} label="Total Penduduk">
              {data.totalPenduduk != null ? (
                <p className={statValue}>{Number(data.totalPenduduk).toLocaleString('id-ID')}</p>
              ) : (
                <NotAvailable />
              )}
            </StatItem>

            <StatItem icon={Building2} label="Luas Wilayah">
              {data.luasWilayah != null ? (
                <p className={statValue}>
                  {Number(data.luasWilayah).toLocaleString('id-ID', { maximumFractionDigits: 3 })}{' '}
                  ha
                </p>
              ) : (
                <NotAvailable />
              )}
            </StatItem>

            <StatItem icon={Home} label="Jumlah Dusun">
              {data.jumlahDusun != null ? (
                <p className={statValue}>{String(data.jumlahDusun).padStart(2, '0')}</p>
              ) : (
                <NotAvailable />
              )}
            </StatItem>
          </div>
        </section>

        {/* ==========================================
            VISI & MISI
            ========================================== */}

        <section className="mt-(--pb-section) grid gap-14 lg:grid-cols-2">
          {/* VISI */}

          <div>
            <h2 className={subtitle}>Visi</h2>

            {data.vision ? (
              <p className="m-0 border-l-[3px] border-pb-padi pl-6 font-display text-[clamp(24px,18px+1.4vw,36px)] leading-[1.22] font-semibold tracking-[-0.02em] text-pretty text-pb-laut-deep">
                &ldquo;{data.vision}&rdquo;
              </p>
            ) : (
              <NotAvailable />
            )}
          </div>

          {/* MISI */}

          <div>
            <h2 className={subtitle}>Misi</h2>

            {data.misi.length > 0 ? (
              <ol className="m-0 list-none border-t border-pb-line p-0">
                {data.misi.map((item, i) => (
                  <li key={i} className="flex gap-4.5 border-b border-pb-line py-4">
                    <span
                      className="w-8 flex-none font-display text-[22px] leading-[1.3] font-bold text-pb-laut"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>

                    <p className="m-0 text-lg leading-normal">{item}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <NotAvailable />
            )}
          </div>
        </section>

        {/* ==========================================
            PERATURAN DESA
            ========================================== */}

        <section id="peraturan-desa" className="mt-(--pb-section) scroll-mt-24">
          <h2 className="mt-0 mb-8 font-display text-[clamp(30px,22px+1.6vw,44px)] leading-[1.08] font-bold tracking-tight">
            Peraturan Desa
          </h2>

          <PeraturanList />
        </section>

        {/* ==========================================
            PERANGKAT DESA
            ========================================== */}

        <section id="perangkat-desa" className="mt-(--pb-section) scroll-mt-24">
          <h2 className="mt-0 mb-8 font-display text-[clamp(30px,22px+1.6vw,44px)] leading-[1.08] font-bold tracking-tight">
            Perangkat Desa
          </h2>

          <div className="flex flex-col items-center">
            {/* KEPALA DESA */}

            <div className={orgRow}>
              <OfficialCard official={data.kepalaDesa} head />
            </div>

            {/* SEKRETARIS DESA */}

            <div className={orgRow}>
              <OfficialCard official={data.sekretarisDesa} />
            </div>

            {/* KASI / KAUR / STAF */}

            <div className={orgRow}>
              {data.perangkatList.map((p) => (
                <OfficialCard key={p.id} official={p} />
              ))}
            </div>
          </div>

          {/* KADUS */}

          <h3 className={orgDivider}>Kepala Dusun (Kadus)</h3>

          {data.kadusList.length > 0 ? (
            <div className={orgGrid}>
              {data.kadusList.map((k) => (
                <OfficialCard key={k.id} official={k} fluid />
              ))}
            </div>
          ) : (
            <NotAvailable />
          )}
        </section>
      </div>
    </>
  )
}
