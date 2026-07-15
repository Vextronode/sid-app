export function InformasiUmum({ data }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      <h3 className="font-bold text-gray-500 text-xs tracking-wide uppercase mb-4">
        Informasi Umum
      </h3>
      <div className="space-y-3 text-xs md:text-sm">
        {Object.entries(data).map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-3 py-1 border-b border-gray-50 last:border-0"
          >
            <span className="text-gray-400 capitalize">
              {key.replace(/([A-Z])/g, " $1")}
            </span>
            <span className="text-gray-800 font-medium col-span-2">
              : {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
