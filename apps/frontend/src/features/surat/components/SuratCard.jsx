export function SuratCard({ code, name, description, type }) {
  return (
    <div className="sid-surat-card">

      {/* =========================
          KODE SURAT & BADGE
      ========================= */}
      <div className="sid-surat-card-header">
        <span className="sid-surat-card-code">
          {code}
        </span>

        <span
          className={`sid-surat-card-badge sid-surat-card-badge-${type?.toLowerCase()}`}
        >
          {type}
        </span>
      </div>


      {/* =========================
          DETAIL SURAT
      ========================= */}
      <div className="sid-surat-card-content">
        <h4 className="sid-surat-card-title">
          {name}
        </h4>

        <p className="sid-surat-card-description">
          {description}
        </p>
      </div>

    </div>
  );
}