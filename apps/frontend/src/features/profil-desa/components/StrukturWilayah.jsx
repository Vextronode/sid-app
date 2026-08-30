import { MapPin, Users, Home } from "lucide-react";

export function StrukturWilayah({ stats, dusunList }) {
  return (
    <div className="sid-card sid-wilayah-card">
      <div>
        <h4 className="sid-section-title sid-wilayah-title">
          Struktur Wilayah — Dusun, RW & RT
        </h4>

        {/* Statistik */}
        <div className="sid-wilayah-stats">
          <div className="sid-wilayah-stat">
            <MapPin className="sid-wilayah-stat-icon" />
            <span>{stats.dusun} Dusun</span>
          </div>

          <div className="sid-wilayah-stat">
            <Users className="sid-wilayah-stat-icon" />
            <span>{stats.rw} RW</span>
          </div>

          <div className="sid-wilayah-stat">
            <Home className="sid-wilayah-stat-icon" />
            <span>{stats.rt} RT</span>
          </div>
        </div>
      </div>

      <p className="sid-wilayah-description">
        Klik dusun untuk melihat RW, klik RW untuk melihat daftar RT.
      </p>

      {/* Accordion */}
      <div className="sid-wilayah-list">
        {dusunList.map((dusun, idx) => (
          <button
            key={idx}
            className="sid-wilayah-item"
          >
            <MapPin className="sid-wilayah-item-icon" />
            <span>Dusun {dusun}</span>
          </button>
        ))}
      </div>
    </div>
  );
}