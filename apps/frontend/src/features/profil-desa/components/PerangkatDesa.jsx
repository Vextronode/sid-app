export function PerangkatDesa({ listPerangkat }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
      <h3 className="font-bold text-gray-800 text-xs tracking-wide uppercase mb-4">
        Perangkat Desa
      </h3>
      <div className="space-y-4">
        {listPerangkat.map((item, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center text-xs md:text-sm border-b border-gray-100 pb-2 last:border-0"
          >
            <span className="text-gray-400">{item.jabatan}</span>
            <span className="text-gray-800 font-semibold text-right">
              : {item.nama}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
