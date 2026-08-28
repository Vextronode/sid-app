// ==========================================
// KelolaProfilDesaPage.jsx
// Halaman Profil Desa untuk Operator Desa
// Styling menggunakan Global CSS.
// Logic/API tidak diubah.
// ==========================================

import { useState } from 'react';
import {
  Pencil,
  Users,
  Building2,
  Home,
  Eye,
  ClipboardList,
} from 'lucide-react';

import { useProfilDesa } from '@/features/profil-desa-admin/hooks/useProfilDesa';
import EditProfilDesaModal from '@/features/profil-desa-admin/components/EditProfilDesaModal';
import EditVisiMisiModal from '@/features/profil-desa-admin/components/EditVisiMisiModal';
import EditPerangkatDesaModal from '@/features/profil-desa-admin/components/EditPerangkatDesaModal';
import { FooterOperator } from '@/components/layout/FooterOperator';

function Avatar({ src, name, size = 'medium' }) {
  return (
    <div className={`sid-profil-desa-avatar sid-profil-desa-avatar-${size}`}>
      {src ? (
        <img src={src} alt={name} />
      ) : (
        <Users size={20} className="sid-profil-desa-avatar-placeholder" />
      )}
    </div>
  );
}

export default function KelolaProfilDesaPage() {
  const {
    data,
    updateHeroAndStats,
    updateVisiMisi,
    updatePerangkat,
  } = useProfilDesa();

  const [modalProfil, setModalProfil] = useState(false);
  const [modalVisiMisi, setModalVisiMisi] = useState(false);
  const [modalPerangkat, setModalPerangkat] = useState(false);

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

          <button
            onClick={() => setModalProfil(true)}
            className="sid-profil-desa-edit-btn"
          >
            <Pencil size={14} />
            Edit Profil Desa
          </button>
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
                alt="Hero"
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

              <p>{data.hero.description}</p>

            </div>
          </div>


          {/* STATS */}
          <div className="sid-profil-desa-stats">

            {/* Total Penduduk */}
            <div className="sid-profil-desa-stat-card">

              <div className="sid-profil-desa-stat-icon population">
                <Users size={18} />
              </div>

              <div className="sid-profil-desa-stat-content">
                <p className="sid-profil-desa-stat-label">
                  Total Penduduk
                </p>

                <p className="sid-profil-desa-stat-value">
                  {Number(data.stats.totalPenduduk).toLocaleString('id-ID')}
                </p>

                <p className="sid-profil-desa-stat-description success">
                  {data.stats.pendudukKeterangan}
                </p>
              </div>

            </div>


            {/* Luas Wilayah */}
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


            {/* Jumlah Dusun */}
            <div className="sid-profil-desa-stat-card">

              <div className="sid-profil-desa-stat-icon hamlet">
                <Home size={18} />
              </div>

              <div className="sid-profil-desa-stat-content">
                <p className="sid-profil-desa-stat-label">
                  Jumlah Dusun
                </p>

                <p className="sid-profil-desa-stat-value">
                  {String(data.stats.jumlahDusun).padStart(2, '0')}
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

          <div className="sid-profil-desa-card-action">
            <button
              onClick={() => setModalVisiMisi(true)}
              className="sid-profil-desa-inline-edit"
            >
              <Pencil size={12} />
              Edit Visi &amp; Misi
            </button>
          </div>


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

            <button
              onClick={() => setModalPerangkat(true)}
              className="sid-profil-desa-inline-edit"
            >
              <Pencil size={12} />
              Edit Perangkat Desa
            </button>

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


      <FooterOperator />


      {/* ==========================================
          MODALS
          ========================================== */}

      <EditProfilDesaModal
        open={modalProfil}
        onClose={() => setModalProfil(false)}
        onSubmit={(payload) => {
          updateHeroAndStats(payload);
          setModalProfil(false);
        }}
        initialData={data}
      />

      <EditVisiMisiModal
        open={modalVisiMisi}
        onClose={() => setModalVisiMisi(false)}
        onSubmit={(payload) => {
          updateVisiMisi(payload);
          setModalVisiMisi(false);
        }}
        initialData={data.visiMisi}
      />

      <EditPerangkatDesaModal
        open={modalPerangkat}
        onClose={() => setModalPerangkat(false)}
        onSubmit={(perangkat, kadusList) => {
          updatePerangkat(perangkat, kadusList);
          setModalPerangkat(false);
        }}
        initialPerangkat={data.perangkatUtama}
        initialKadus={data.kadusList}
      />

    </div>
  );
}