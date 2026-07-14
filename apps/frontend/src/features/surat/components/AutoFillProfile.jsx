export function AutoFillProfile({ user }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1">
          Nama Pemohon (otomatis)
        </label>
        <input
          type="text"
          disabled
          value={user?.name || "Budi Santoso"}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1">
          NIK (otomatis)
        </label>
        <input
          type="text"
          disabled
          value={user?.nik || "****-****-0042"}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1">
          Alamat (otomatis)
        </label>
        <input
          type="text"
          disabled
          value={user?.alamat || "Alamat belum diatur"}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 mb-1">
          RT/RW (otomatis)
        </label>
        <input
          type="text"
          disabled
          value={user?.rtrw || "000/000"}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed outline-none"
        />
      </div>
    </div>
  );
}
