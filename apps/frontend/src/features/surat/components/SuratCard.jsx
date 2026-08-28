export function SuratCard({ code, name, description, type }) {
  const badgeStyles = {
    Auto: {
      background: "var(--sid-status-done-bg)",
      color: "var(--sid-status-done-text)",
      borderColor: "var(--sid-status-done-text)",
    },

    Manual: {
      background: "var(--sid-status-pending-bg)",
      color: "var(--sid-status-pending-text)",
      borderColor: "var(--sid-status-pending-text)",
    },

    Document: {
      background: "var(--sid-status-progress-bg)",
      color: "var(--sid-status-progress-text)",
      borderColor: "var(--sid-status-progress-text)",
    },
  };

  const badgeStyle = badgeStyles[type] || {
    background: "var(--sid-surface-page)",
    color: "var(--sid-text-secondary)",
    borderColor: "var(--sid-border)",
  };

  return (
    <div
      className="
        rounded-2xl
        p-5
        relative
        flex
        flex-col
        justify-between
        transition-shadow
        min-h-[140px]
      "
      style={{
        background: "var(--sid-surface-card)",
        border: "1px solid var(--sid-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Kode Surat & Badge Status */}
      <div className="flex justify-between items-start">
        <span
          className="font-bold text-sm tracking-wide"
          style={{
            color: "var(--sid-text-primary)",
          }}
        >
          {code}
        </span>

        <span
          className="text-[9px] font-semibold px-2 py-0.5 rounded-md border"
          style={badgeStyle}
        >
          {type}
        </span>
      </div>

      {/* Detail Nama & Syarat Dokumen */}
      <div className="mt-3 space-y-1">
        <h4
          className="font-bold text-xs md:text-sm"
          style={{
            color: "var(--sid-text-primary)",
          }}
        >
          {name}
        </h4>

        <p
          className="text-[10px] md:text-xs leading-relaxed"
          style={{
            color: "var(--sid-text-secondary)",
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}