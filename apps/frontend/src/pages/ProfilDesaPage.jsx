// ==========================================
// ProfilDesaPage.jsx
// Halaman publik Profil Desa.
// Tampilan dibuat SAMA dengan KelolaProfilDesaPage,
// tetapi tanpa tombol edit.
// Styling menggunakan Global CSS SID.
//
// Data diambil dari API /api/public/village-profile.
// Field yang belum dikirim backend ditampilkan
// sebagai "Belum tersedia" (tanpa data dummy).
// ==========================================

import { useState, useEffect } from 'react'
import { Users, Building2, Home, Eye, ClipboardList } from 'lucide-react'

import api from '../lib/api' // Integrasi API Axios
import { publicVillageParams } from '../shared/lib/api/publicVillageParams'

// Teks untuk data yang belum dikirim backend
const NA = 'Belum tersedia'

// Tampilan seragam untuk data yang belum dikirim backend
// (italic + abu-abu, sama seperti teks Visi)
function NotAvailable({ text = NA }) {
  return <p className="sid-profil-desa-visi-text">{text}</p>
}

function Avatar({ src, name, size = 'medium' }) {
  return (
    <div className={`sid-profil-desa-avatar sid-profil-desa-avatar-${size}`}>
      {src ? (
        <img src={src} alt={name} />
      ) : (
        <Users size={20} className="sid-profil-desa-avatar-placeholder" />
      )}
    </div>
  )
}

// ==========================================
// PEMETAAN RESPONSE BACKEND -> DATA HALAMAN
// Kalau backend menambah field baru (penduduk, luas,
// dusun, perangkat, foto), cukup ubah fungsi ini.
// ==========================================

function mapProfile(raw) {
  const missionList = Array.isArray(raw?.mission)
    ? raw.mission
    : typeof raw?.mission === 'string'
      ? raw.mission
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

  return {
    name: raw?.name || 'Desa Cibenda',
    address: raw?.address || null,
    phone: raw?.phone || null,
    history: raw?.history || null,
    vision: raw?.vision || null,
    misi: missionList,

    // --- Belum dikirim backend ---
    heroImage: null,
    totalPenduduk: null,
    luasWilayah: null,
    jumlahDusun: null,

    kepalaDesa: { nama: raw?.head_name || null, jabatan: 'Kepala Desa', foto: null },
    sekretarisDesa: { nama: null, jabatan: 'Sekretaris Desa', foto: null },
    kaur: { nama: null, jabatan: 'Kaur Umum & TU', foto: null },
    kasi: { nama: null, jabatan: 'Kasi Pelayanan', foto: null },
    kadusList: [],
  }
}

export function ProfilDesaPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    const fetchProfilData = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await api.get('/api/public/village-profile', { params: publicVillageParams() })

        if (active) setData(mapProfile(res.data?.data))
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

  // ==========================================
  // STATE LOADING & ERROR
  // ==========================================

  if (loading) {
    return (
      <div className="sid-profil-desa-page">
        <div className="sid-profil-desa-content">
          <p>Memuat profil desa...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="sid-profil-desa-page">
        <div className="sid-profil-desa-content">
          <p style={{ color: '#d32f2f' }}>{error || 'Data profil desa tidak tersedia.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="sid-profil-desa-page">
      <div className="sid-profil-desa-content">
        {/* ==========================================
            HEADER
            ========================================== */}

        <div className="sid-profil-desa-header">
          <div className="sid-profil-desa-header-info">
            <h1>Profil {data.name}</h1>

            <p>
              Halaman resmi informasi tata kelola, sejarah, dan capaian strategis {data.name} untuk
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
        </div>

        {/* ==========================================
            HERO + STATS
            ========================================== */}

        <div className="sid-profil-desa-hero-grid">
          {/* HERO */}

          <div className="sid-profil-desa-hero">
            {data.heroImage ? (
              <img
                src={data.heroImage}
                alt={`Profil ${data.name}`}
                className="sid-profil-desa-hero-image"
              />
            ) : (
              <div className="sid-profil-desa-hero-placeholder" />
            )}

            <div className="sid-profil-desa-hero-overlay" />

            <div className="sid-profil-desa-hero-content">
              <span className="sid-profil-desa-hero-badge">Profil Desa</span>

              <h2>{data.name}</h2>

              <p>{data.history || `Sejarah desa ${NA.toLowerCase()}.`}</p>
            </div>
          </div>

          {/* STATS */}

          <div className="sid-profil-desa-stats">
            {/* TOTAL PENDUDUK */}

            <div className="sid-profil-desa-stat-card">
              <div className="sid-profil-desa-stat-icon population">
                <Users size={18} />
              </div>

              <div className="sid-profil-desa-stat-content">
                <p className="sid-profil-desa-stat-label">Total Penduduk</p>

                {data.totalPenduduk != null ? (
                  <p className="sid-profil-desa-stat-value">
                    {Number(data.totalPenduduk).toLocaleString('id-ID')}
                  </p>
                ) : (
                  <NotAvailable />
                )}
              </div>
            </div>

            {/* LUAS WILAYAH */}

            <div className="sid-profil-desa-stat-card">
              <div className="sid-profil-desa-stat-icon area">
                <Building2 size={18} />
              </div>

              <div className="sid-profil-desa-stat-content">
                <p className="sid-profil-desa-stat-label">Luas Wilayah</p>

                {data.luasWilayah != null ? (
                  <p className="sid-profil-desa-stat-value">{data.luasWilayah} ha</p>
                ) : (
                  <NotAvailable />
                )}
              </div>
            </div>

            {/* JUMLAH DUSUN */}

            <div className="sid-profil-desa-stat-card">
              <div className="sid-profil-desa-stat-icon hamlet">
                <Home size={18} />
              </div>

              <div className="sid-profil-desa-stat-content">
                <p className="sid-profil-desa-stat-label">Jumlah Dusun</p>

                {data.jumlahDusun != null ? (
                  <p className="sid-profil-desa-stat-value">
                    {String(data.jumlahDusun).padStart(2, '0')}
                  </p>
                ) : (
                  <NotAvailable />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            VISI & MISI
            ========================================== */}

        <div className="sid-profil-desa-card sid-profil-desa-visi-misi">
          <div className="sid-profil-desa-visi-misi-grid">
            {/* VISI */}

            <div className="sid-profil-desa-visi">
              <div className="sid-profil-desa-section-heading">
                <div className="sid-profil-desa-section-icon">
                  <Eye size={16} />
                </div>

                <h3>Visi</h3>
              </div>

              {data.vision ? (
                <p className="sid-profil-desa-visi-text">"{data.vision}"</p>
              ) : (
                <NotAvailable />
              )}
            </div>

            {/* MISI */}

            <div className="sid-profil-desa-misi">
              <div className="sid-profil-desa-section-heading">
                <div className="sid-profil-desa-section-icon">
                  <ClipboardList size={16} />
                </div>

                <h3>Misi</h3>
              </div>

              {data.misi.length > 0 ? (
                <ol className="sid-profil-desa-misi-list">
                  {data.misi.map((item, i) => (
                    <li key={i}>
                      <span>{i + 1}</span>

                      <p>{item}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <NotAvailable />
              )}
            </div>
          </div>
        </div>

        {/* ==========================================
            PERANGKAT DESA
            ========================================== */}

        <div className="sid-profil-desa-card sid-profil-desa-perangkat">
          <div className="sid-profil-desa-perangkat-header">
            <div className="sid-profil-desa-section-heading">
              <div className="sid-profil-desa-section-icon">
                <Users size={16} />
              </div>

              <h3>Perangkat Desa</h3>
            </div>
          </div>

          {/* KEPALA DESA */}

          <div className="sid-profil-desa-kepala">
            <Avatar src={data.kepalaDesa.foto} name={data.kepalaDesa.nama} size="large" />

            {data.kepalaDesa.nama ? (
              <p className="sid-profil-desa-kepala-name">{data.kepalaDesa.nama}</p>
            ) : (
              <NotAvailable />
            )}

            <p className="sid-profil-desa-kepala-role">{data.kepalaDesa.jabatan}</p>
          </div>

          {/* SEKRETARIS / KAUR / KASI */}

          <div className="sid-profil-desa-main-officials">
            {[data.sekretarisDesa, data.kaur, data.kasi].map((p, i) => (
              <div key={i} className="sid-profil-desa-official-card">
                <Avatar src={p.foto} name={p.nama} size="small" />

                {p.nama ? (
                  <p className="sid-profil-desa-official-name">{p.nama}</p>
                ) : (
                  <NotAvailable />
                )}

                <p className="sid-profil-desa-official-role">{p.jabatan}</p>
              </div>
            ))}
          </div>

          {/* KADUS */}

          <p className="sid-profil-desa-kadus-title">Kepala Dusun (Kadus)</p>

          <div className="sid-profil-desa-kadus-list">
            {data.kadusList.length > 0 ? (
              data.kadusList.map((k) => (
                <div key={k.id} className="sid-profil-desa-kadus">
                  <Avatar src={k.foto} name={k.nama} size="tiny" />

                  <p>{k.nama}</p>
                </div>
              ))
            ) : (
              <NotAvailable />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
