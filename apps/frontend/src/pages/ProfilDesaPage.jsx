// ==========================================
// ProfilDesaPage.jsx
// Halaman publik Profil Desa.
// Isinya sama dengan KelolaProfilDesaPage (tanpa tombol edit),
// tetapi tampilannya mengikuti halaman publik lain.
// Gaya dari public.css (kelas pb-*, di bawah .pub milik MainLayout).
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
import { formatVillageName } from '@/shared/lib/villageName'

// Teks untuk data yang belum dikirim backend
const NA = 'Belum tersedia'

// Tampilan seragam untuk data yang belum dikirim backend (miring, abu-abu).
function NotAvailable({ text = NA }) {
  return <p className="pb-na">{text}</p>
}

function Avatar({ src, name, size = 'medium' }) {
  return (
    <div className={`pb-avatar pb-avatar--${size}`}>
      {src ? <img src={src} alt={name} /> : <Users size={28} aria-hidden="true" />}
    </div>
  )
}

function OfficialCard({ official, className = '' }) {
  return (
    <div className={`pb-official ${className}`.trim()}>
      <Avatar src={official.foto} name={official.nama} size="large" />

      {official.nama ? <p className="pb-official-name">{official.nama}</p> : <NotAvailable />}

      <p className="pb-official-role">{official.jabatan}</p>
    </div>
  )
}

function StatItem({ icon: Icon, label, children }) {
  return (
    <div className="pb-profile-stat">
      <div className="pb-profile-stat-icon">
        <Icon size={22} aria-hidden="true" />
      </div>

      <div>
        <p className="pb-profile-stat-label">{label}</p>
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
      <div className="pb-container pb-page">
        <PageLoader label="Memuat profil desa..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="pb-container pb-page">
        <p className="pb-state pb-state--error">{error || 'Data profil desa tidak tersedia.'}</p>
      </div>
    )
  }

  return (
    <>
      {/* ==========================================
          HEADER
          ========================================== */}

      <header className="pb-pagehead">
        <div className="pb-container pb-pagehead-inner">
          <h1>Profil {data.name ?? 'Desa'}</h1>

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
        </div>
      </header>

      <div className="pb-container pb-page">
        {/* ==========================================
            HERO + STATS
            ========================================== */}

        <section className="pb-profile-hero">
          {/* HERO */}

          <div className="pb-profile-photo">
            {data.heroImage && <img src={data.heroImage} alt={`Profil ${data.name ?? 'desa'}`} />}

            <div className="pb-profile-photo-overlay" />

            <div className="pb-profile-story">
              <span className="pb-profile-story-label">Sejarah singkat</span>

              <h2>{data.name ?? 'Desa'}</h2>

              <p>{data.history || `Sejarah desa ${NA.toLowerCase()}.`}</p>
            </div>
          </div>

          {/* STATS */}

          <div className="pb-profile-stats">
            <StatItem icon={Users} label="Total Penduduk">
              {data.totalPenduduk != null ? (
                <p className="pb-profile-stat-value">
                  {Number(data.totalPenduduk).toLocaleString('id-ID')}
                </p>
              ) : (
                <NotAvailable />
              )}
            </StatItem>

            <StatItem icon={Building2} label="Luas Wilayah">
              {data.luasWilayah != null ? (
                <p className="pb-profile-stat-value">
                  {Number(data.luasWilayah).toLocaleString('id-ID', { maximumFractionDigits: 3 })}{' '}
                  ha
                </p>
              ) : (
                <NotAvailable />
              )}
            </StatItem>

            <StatItem icon={Home} label="Jumlah Dusun">
              {data.jumlahDusun != null ? (
                <p className="pb-profile-stat-value">{String(data.jumlahDusun).padStart(2, '0')}</p>
              ) : (
                <NotAvailable />
              )}
            </StatItem>
          </div>
        </section>

        {/* ==========================================
            VISI & MISI
            ========================================== */}

        <section className="pb-section pb-visi-misi">
          {/* VISI */}

          <div>
            <h2 className="pb-subtitle">Visi</h2>

            {data.vision ? (
              <p className="pb-visi-text">&ldquo;{data.vision}&rdquo;</p>
            ) : (
              <NotAvailable />
            )}
          </div>

          {/* MISI */}

          <div>
            <h2 className="pb-subtitle">Misi</h2>

            {data.misi.length > 0 ? (
              <ol className="pb-misi-list">
                {data.misi.map((item, i) => (
                  <li key={i}>
                    <span aria-hidden="true">{i + 1}</span>

                    <p>{item}</p>
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

        <section id="perangkat-desa" className="pb-section">
          <h2 className="pb-section-title">Perangkat Desa</h2>

          <div className="pb-org">
            {/* KEPALA DESA */}

            <div className="pb-org-row">
              <OfficialCard official={data.kepalaDesa} className="pb-official--head" />
            </div>

            {/* SEKRETARIS DESA */}

            <div className="pb-org-row">
              <OfficialCard official={data.sekretarisDesa} />
            </div>

            {/* KASI / KAUR / STAF */}

            <div className="pb-org-row">
              {data.perangkatList.map((p) => (
                <OfficialCard key={p.id} official={p} />
              ))}
            </div>
          </div>

          {/* KADUS */}

          <h3 className="pb-kadus-title">Kepala Dusun (Kadus)</h3>

          {data.kadusList.length > 0 ? (
            <div className="pb-org-grid">
              {data.kadusList.map((k) => (
                <OfficialCard key={k.id} official={k} />
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
