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
import { Users, Building2, Home } from 'lucide-react'

import api from '../lib/api' // Integrasi API Axios
import { publicVillageParams } from '../shared/lib/api/publicVillageParams'
import { PageLoader } from '@/components/ui/PageLoader'
import { PublicPageHead } from '@/components/layout/PublicPageHead'
import { errorBox } from '@/features/beranda/publicClasses'
import { formatVillageName } from '@/shared/lib/villageName'

// Teks untuk data yang belum dikirim backend
const NA = 'Belum tersedia'

const page = 'bd-container pt-[clamp(32px,20px+3vw,64px)]'
const statValue =
  'mt-0.5 mb-0 font-display text-[clamp(30px,24px+1.2vw,40px)] leading-[1.05] font-bold tracking-tight text-pb-laut-deep tabular-nums'
const subtitle = 'mt-0 mb-4 text-base font-bold text-pb-laut'

// Tampilan seragam untuk data yang belum dikirim backend (miring, abu-abu).
function NotAvailable({ text = NA }) {
  return <p className="mt-1 mb-0 text-base text-pb-muted italic">{text}</p>
}

// Foto berbingkai gapura (atap setengah lingkaran), sama dengan foto hero.
function Avatar({ src, name, head }) {
  return (
    <div
      className={`mb-3.5 flex items-center justify-center overflow-hidden rounded-t-full rounded-b-xl bg-pb-laut-tint bg-(image:--pb-contour-dark) bg-size-[200px_auto] text-pb-laut ${head ? 'h-35 w-32' : 'h-26 w-24 max-sm:h-20 max-sm:w-18'}`}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <Users size={28} strokeWidth={1.6} aria-hidden="true" />
      )}
    </div>
  )
}

// head: kartu Kepala Desa, lebih besar dengan garis padi di atas.
function OfficialCard({ official, head = false, fluid = false }) {
  const width = head ? 'w-70' : fluid ? 'w-auto' : 'w-55'

  return (
    <div
      className={`flex flex-col items-center rounded-2xl bg-white px-4.5 pb-5.5 text-center max-sm:w-auto ${width} ${head ? 'pt-7 shadow-[inset_0_4px_0_var(--color-pb-padi),0_0_0_1px_var(--color-pb-laut)]' : 'pt-6 shadow-[0_0_0_1px_var(--color-pb-line)]'}`}
    >
      <Avatar src={official.foto} name={official.nama} head={head} />

      {official.nama ? (
        <p
          className={`m-0 font-display leading-tight font-bold ${head ? 'text-[22px]' : 'text-lg'}`}
        >
          {official.nama}
        </p>
      ) : (
        <NotAvailable />
      )}

      <p className="mt-1 mb-0 text-[15px] leading-snug text-pb-muted">{official.jabatan}</p>
    </div>
  )
}

// Satu baris statistik; ikon tanpa kotak latar.
function StatItem({ icon: Icon, label, children }) {
  return (
    <div className="flex flex-1 items-center gap-4.5 px-7 py-6 [&+&]:border-t [&+&]:border-pb-line">
      <Icon className="flex-none text-pb-laut" size={26} strokeWidth={1.8} aria-hidden="true" />

      <div>
        <p className="m-0 text-[15px] text-pb-muted">{label}</p>
        {children}
      </div>
    </div>
  )
}

// Satu tingkat bagan perangkat desa. Tingkat kedua dan seterusnya disambung
// garis tegak ke tingkat di atasnya.
const orgRow =
  "relative flex w-full flex-wrap justify-center gap-4 max-sm:flex-col max-sm:items-stretch [&+&]:mt-10 [&+&]:before:absolute [&+&]:before:-top-10 [&+&]:before:left-1/2 [&+&]:before:h-10 [&+&]:before:w-0.5 [&+&]:before:bg-pb-line-strong [&+&]:before:content-['']"

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
    sekretarisDesa: toSlot('sekdes', 'Sekretaris Desa', byPosition('sekdes')),
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
          <p>
            {data.address}
            {data.address && data.phone ? ' · ' : ''}
            {data.phone && `Telp. ${data.phone}`}
          </p>
        )}
      </PublicPageHead>

      <div className={page}>
        {/* ==========================================
            HERO + STATS
            ========================================== */}

        <section className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* HERO */}

          <div className="relative min-h-105 overflow-hidden rounded-3xl bg-pb-laut-deep bg-(image:--pb-contour-light) max-sm:min-h-90">
            {data.heroImage && (
              <img
                src={data.heroImage}
                alt={`Profil ${data.name ?? 'desa'}`}
                className="absolute inset-0 size-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-linear-to-b from-pb-laut-deep/0 from-35% to-pb-laut-deep/85" />

            <div className="absolute inset-x-0 bottom-0 p-8 text-white max-sm:p-5.5">
              <span className="mb-3 inline-flex items-center gap-2.5 text-[15px] font-bold before:h-0.75 before:w-6 before:rounded-full before:bg-pb-padi before:content-['']">
                Sejarah singkat
              </span>

              <h2 className="m-0 font-display text-[clamp(28px,22px+1.4vw,40px)] leading-[1.05] font-bold tracking-tight">
                {data.name ?? 'Desa'}
              </h2>

              <p className="mt-2.5 mb-0 max-w-[56ch] text-[17px] leading-relaxed text-[#e3eaf3]">
                {data.history || `Sejarah desa ${NA.toLowerCase()}.`}
              </p>
            </div>
          </div>

          {/* STATS */}

          <div className="flex flex-col overflow-hidden rounded-3xl border border-pb-line bg-white">
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

          <h3 className="mt-16 mb-5 border-t border-pb-line pt-8 text-center font-display text-2xl font-bold tracking-[-0.01em]">
            Kepala Dusun (Kadus)
          </h3>

          {data.kadusList.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 max-sm:grid-cols-2 max-sm:gap-3">
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
