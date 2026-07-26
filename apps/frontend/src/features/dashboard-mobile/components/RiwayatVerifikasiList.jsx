// ==========================================
// RiwayatVerifikasiList.jsx
// Tabel ringkas riwayat verifikasi terbaru di dashboard mobile.
// ==========================================

export default function RiwayatVerifikasiList({ data }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Riwayat Verifikasi</h3>
        <button className="text-xs text-green-600">Lihat Semua</button>
      </div>
      <div className="grid grid-cols-2 text-xs text-gray-400 font-medium border-b pb-2 mb-2">
        <span>WARGA</span>
        <span>JENIS SURAT</span>
      </div>
      <div className="flex flex-col gap-3">
        {data.map((item) => (
          <div key={item.id} className="grid grid-cols-2 items-start text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {item.nama.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-gray-800 font-medium leading-tight">{item.nama}</p>
                <p className="text-[10px] text-gray-400">NIK: {item.nik}</p>
              </div>
            </div>
            <div className="flex justify-between items-start">
              <p className="text-gray-600">{item.jenisSurat}</p>
              <span className="text-[10px] text-gray-400 shrink-0">{item.tanggal}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}