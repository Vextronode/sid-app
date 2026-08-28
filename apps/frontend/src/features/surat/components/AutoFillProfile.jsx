export function AutoFillProfile({ user }) {
  return (
    <div className="grid grid-cols-1 gap-4">

      {/* =========================
          NAMA PEMOHON
      ========================= */}
      <div className="sid-form-group">
        <label className="sid-label">
          Nama Pemohon (otomatis)
        </label>

        <input
          type="text"
          disabled
          value={user?.name || "Budi Santoso"}
          className="sid-input sid-input-readonly"
        />
      </div>


      {/* =========================
          NIK
      ========================= */}
      <div className="sid-form-group">
        <label className="sid-label">
          NIK (otomatis)
        </label>

        <input
          type="text"
          disabled
          value={user?.citizen?.nik || "****-****-0042"}
          className="sid-input sid-input-readonly"
        />
      </div>


      {/* =========================
          ALAMAT
      ========================= */}
      <div className="sid-form-group">
        <label className="sid-label">
          Alamat (otomatis)
        </label>

        <input
          type="text"
          disabled
          value={user?.citizen?.address || "Alamat belum diatur"}
          className="sid-input sid-input-readonly"
        />
      </div>


      {/* =========================
          RT / RW
      ========================= */}
      <div className="sid-form-group">
        <label className="sid-label">
          RT/RW (otomatis)
        </label>

        <input
          type="text"
          disabled
          value={
            user?.citizen?.rt?.number != null ||
            user?.citizen?.rw?.number != null
              ? `${user?.citizen?.rt?.number ?? "-"}/${user?.citizen?.rw?.number ?? "-"}`
              : "000/000"
          }
          className="sid-input sid-input-readonly"
        />
      </div>

    </div>
  );
}