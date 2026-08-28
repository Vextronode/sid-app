// ==========================================
// ProfilDesaPage.jsx
// Halaman publik Profil Desa.
// Tampilan dibuat SAMA dengan KelolaProfilDesaPage,
// tetapi tanpa tombol edit.
// Styling menggunakan Global CSS SID.
// ==========================================

import {
  Users,
  Building2,
  Home,
  Eye,
  ClipboardList,
} from 'lucide-react';

import { profilDesa } from '@/features/profil-desa-admin/data/dummyProfilDesa';

function Avatar({ src, name, size = 'medium' }) {
  return (
    <div
      className={`sid-profil-desa-avatar sid-profil-desa-avatar-${size}`}
    >
      {src ? (
        <img src={src} alt={name} />
      ) : (
        <Users
          size={20}
          className="sid-profil-desa-avatar-placeholder"
        />
      )}
    </div>
  );
}

export function ProfilDesaPage() {
  const data = profilDesa;

  return (
    <div className="sid-profil-desa-page">

      <div className="sid-profil-desa-content">

        {/* ==========================================
            HEADER
            ========================================== */}

        <div className="sid-profil-desa-header">

          <div className="sid-profil-desa-header-info">

            <h1>Profil Desa Cibenda</h1>

            <p>
              Halaman resmi informasi tata kelola, sejarah, dan capaian
              strategis Desa Cibenda untuk transparansi publik.
            </p>

          </div>

        </div>


        {/* ==========================================
            HERO + STATS
            ========================================== */}

        <div className="sid-profil-desa-hero-grid">

          {/* HERO */}

          <div className="sid-profil-desa-hero">

            {data.hero.image ? (
              <img
                src={data.hero.image}
                alt="Profil Desa Cibenda"
                className="sid-profil-desa-hero-image"
              />
            ) : (
              <div className="sid-profil-desa-hero-placeholder" />
            )}

            <div className="sid-profil-desa-hero-overlay" />

            <div className="sid-profil-desa-hero-content">

              <span className="sid-profil-desa-hero-badge">
                {data.hero.badge}
              </span>

              <h2>{data.hero.title}</h2>

              <p>
                {data.hero.description}
              </p>

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

                <p className="sid-profil-desa-stat-label">
                  Total Penduduk
                </p>

                <p className="sid-profil-desa-stat-value">
                  {Number(
                    data.stats.totalPenduduk
                  ).toLocaleString('id-ID')}
                </p>

                <p className="sid-profil-desa-stat-description success">
                  {data.stats.pendudukKeterangan}
                </p>

              </div>

            </div>


            {/* LUAS WILAYAH */}

            <div className="sid-profil-desa-stat-card">

              <div className="sid-profil-desa-stat-icon area">
                <Building2 size={18} />
              </div>

              <div className="sid-profil-desa-stat-content">

                <p className="sid-profil-desa-stat-label">
                  Luas Wilayah
                </p>

                <p className="sid-profil-desa-stat-value">
                  {data.stats.luasWilayah} ha
                </p>

                <p className="sid-profil-desa-stat-description">
                  {data.stats.luasKeterangan}
                </p>

              </div>

            </div>


            {/* JUMLAH DUSUN */}

            <div className="sid-profil-desa-stat-card">

              <div className="sid-profil-desa-stat-icon hamlet">
                <Home size={18} />
              </div>

              <div className="sid-profil-desa-stat-content">

                <p className="sid-profil-desa-stat-label">
                  Jumlah Dusun
                </p>

                <p className="sid-profil-desa-stat-value">
                  {String(
                    data.stats.jumlahDusun
                  ).padStart(2, '0')}
                </p>

                <p className="sid-profil-desa-stat-description">
                  {data.stats.dusunKeterangan}
                </p>

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

              <p className="sid-profil-desa-visi-text">
                "{data.visiMisi.visi}"
              </p>

            </div>


            {/* MISI */}

            <div className="sid-profil-desa-misi">

              <div className="sid-profil-desa-section-heading">

                <div className="sid-profil-desa-section-icon">
                  <ClipboardList size={16} />
                </div>

                <h3>Misi</h3>

              </div>

              <ol className="sid-profil-desa-misi-list">

                {data.visiMisi.misi.map((item, i) => (
                  <li key={i}>

                    <span>
                      {i + 1}
                    </span>

                    <p>{item}</p>

                  </li>
                ))}

              </ol>

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

            <Avatar
              src={data.perangkatUtama.kepalaDesa.foto}
              name={data.perangkatUtama.kepalaDesa.nama}
              size="large"
            />

            <p className="sid-profil-desa-kepala-name">
              {data.perangkatUtama.kepalaDesa.nama}
            </p>

            <p className="sid-profil-desa-kepala-role">
              {data.perangkatUtama.kepalaDesa.jabatan}
            </p>

          </div>


          {/* SEKRETARIS / KAUR / KASI */}

          <div className="sid-profil-desa-main-officials">

            {[
              data.perangkatUtama.sekretarisDesa,
              data.perangkatUtama.kaur,
              data.perangkatUtama.kasi,
            ].map((p, i) => (
              <div
                key={i}
                className="sid-profil-desa-official-card"
              >

                <Avatar
                  src={p.foto}
                  name={p.nama}
                  size="small"
                />

                <p className="sid-profil-desa-official-name">
                  {p.nama}
                </p>

                <p className="sid-profil-desa-official-role">
                  {p.jabatan}
                </p>

              </div>
            ))}

          </div>


          {/* KADUS */}

          <p className="sid-profil-desa-kadus-title">
            Kepala Dusun (Kadus)
          </p>

          <div className="sid-profil-desa-kadus-list">

            {data.kadusList.map((k) => (
              <div
                key={k.id}
                className="sid-profil-desa-kadus"
              >

                <Avatar
                  src={k.foto}
                  name={k.nama}
                  size="tiny"
                />

                <p>{k.nama}</p>

              </div>
            ))}

          </div>

        </div>

      </div>

    </div>
  );
}